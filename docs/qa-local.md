# Toko Loop local production UI QA

วันที่ทดสอบ: 5 กันยายน 2026 (Asia/Bangkok)  
สภาพแวดล้อม: Frontend `http://localhost:3000` และ backend `http://localhost:8080/ai-tutor/api/v2`  
เบราว์เซอร์: Codex in-app browser  
Viewport: Desktop 1280×720, iPhone 390×844, iPad 820×1180

## ผลรวม

Happy flow หลักผ่านตั้งแต่เข้าสู่ระบบ เปิดบทเรียน เรียน pattern ทำ drill ส่งไฟล์เสียง รับ feedback ลองใหม่ ทำบทสนทนา จบ session เปิด review ตรวจ progress และ reload ข้อมูล ข้อมูลหลังจบ session คงอยู่หลัง reload และ typed fallback ไม่ถูกนับเป็น speaking mastery ตามที่ UI ระบุ

## สิ่งที่ผ่าน

- ออกจากระบบแล้วเข้าสู่ระบบด้วยบัญชี QA ได้สำเร็จ และกลับเข้าสู่พื้นที่ผู้เรียนเดิม
- หน้า Settings/Profile แสดงระดับผู้เรียน ค่าเป้าหมายรายวัน เสียง ความเร็ว งบและเวลาสำหรับ Live รวมถึงยอดใช้เดือนปัจจุบัน
- Curriculum มี 5 ระดับ ระดับละ 20 บท รวม 100 บท แต่ละระดับแสดง 4 units
- เริ่มบท Pre-A1 “ทักทาย” ได้จากศูนย์ และเดิน flow ครบ pattern → shadowing → substitution → transformation → rapid response → conversation → summary
- อัปโหลด `/tmp/toko-qa-sample.wav` ผ่านตัวเลือก “เลือกไฟล์เสียงที่อัดไว้” ได้ ระบบถอดเสียงเป็น `Hello, I'm Pim.` และคืน feedback ภาษาไทย
- feedback แสดงสิ่งที่ทำได้ดี จุดที่ควรแก้ ตัวอย่างประโยค และปุ่ม “ลองพูดใหม่ตอนนี้”; retry เปิดสถานะให้ตอบใหม่และยกเลิก retry ได้
- เสียงที่อัปโหลดเล่นจากตัวควบคุมใน feedback ได้จริง: ตัวควบคุมเปลี่ยนเป็น pause และ DOM audio รายงาน `readyState=4`, duration 1.851 วินาที, `error=null`
- Cached TTS ของตัวอย่าง `Hello, I’m Pim.` เล่นได้จริงผ่าน frontend BFF: ระหว่างเล่น DOM audio รายงาน `readyState=4`, `paused=false`, duration 1.851 วินาที, `error=null`
- หลังจบ session สรุปแสดง 7 คำตอบและ 0 ครั้งที่พูดเองได้ การตอบบางช่วงใช้ typed fallback จึงไม่ถูกนับเป็น speaking mastery
- Dashboard อัปเดต streak, เวลาฝึก และ review queue; หลัง reload ยังคงค่าเดิม
- Review เปิดรายการที่ครบกำหนด ส่งคำตอบแบบพิมพ์ รับ feedback และเลื่อนวันทบทวนครั้งถัดไปได้
- Progress แสดงเวลาฝึก streak, speaking mastery และ next focus ตามข้อมูลล่าสุด
- บันทึก `Hello, I’m Pim.` เข้าคลังได้ และพบวลีใน My collection หลังเปลี่ยนหน้า
- หน้าสถานการณ์มี 70 รายการจริง: Everyday 20, Tech 10, Banking 10, Business 10, Interview 10, Meeting 10; ฟิลเตอร์ Everyday, Tech และ Banking แสดงจำนวนถูกต้อง
- สร้างสถานการณ์จากข้อความภาษาไทยได้ แก้ชื่อเป็น “QA แนะนำตัวกับทีมใหม่” บันทึก แล้วเริ่มโหมด “พูดทีละเทิร์น” ได้
- Responsive layout ใช้งานได้ที่ iPhone 390×844 และ iPad 820×1180; iPhone เปลี่ยนเป็น header + bottom navigation และ iPad ใช้ sidebar แบบไอคอน

## ปัญหาที่พบ

### 1. Uncached TTS ค้างที่ “กำลังเตรียมเสียง…” โดยไม่มี error หรือทาง retry

ความรุนแรง: สูงสำหรับข้อความใหม่

วิธีทำซ้ำ:

1. เปิดสถานการณ์ที่ผู้ใช้สร้างเองและเริ่ม “พูดทีละเทิร์น”
2. กด “ฟัง” ที่ข้อความเปิดบทสนทนาซึ่งยังไม่มี TTS cache
3. ปุ่มเปลี่ยนเป็น “กำลังเตรียมเสียง…” และค้างอยู่

หลักฐานฝั่ง API ของการขอ TTS ใหม่ในรอบเดียวกัน: job ค้างเป็น `queued` พร้อม error ระหว่างที่ UI รอ และต่อมาเปลี่ยนเป็น `failed` ด้วย `Gemini connection interrupted; please retry` แต่ UI ที่สังเกตไม่แสดงข้อผิดพลาดหรือเปิดให้ลองใหม่ Cached TTS เดิมเล่นผ่าน BFF ได้ปกติ จึงแยกได้ว่าปัญหาอยู่ที่การจัดการงานสร้างเสียงใหม่/สถานะล้มเหลว ไม่ใช่การเล่นไฟล์ที่มีอยู่แล้ว

### 2. คำสั่ง transformation ขัดกับเกณฑ์ feedback

ความรุนแรง: กลาง

วิธีทำซ้ำ:

1. ในบท “ทักทาย” ไปที่ drill “เปลี่ยนรูปแบบประโยค”
2. หน้าจอสั่งให้เปลี่ยนข้อมูลเป็นเรื่องของ “อีกคนหรืออีกสถานที่” และปรับสรรพนามตามบริบท
3. ตอบ `Hello, she is Pim.`
4. ระบบปฏิเสธเพราะไม่ได้แนะนำตัวเอง และบังคับกลับเป็น `Hello, I'm Arin.`

ข้อความกำกับ drill กับเป้าหมายที่ tutor ใช้ประเมินไม่ตรงกัน ผู้เรียนทำตามโจทย์บนหน้าแล้วถูกบอกว่าผิด

### 3. ปุ่ม “ตั้งค่า” ใน sidebar เดสก์ท็อปไม่ทำงาน

ความรุนแรง: กลาง

วิธีทำซ้ำ:

1. อยู่หน้า Today ที่ viewport 1280×720
2. กด “ตั้งค่า” ใน sidebar ด้านซ้าย
3. หน้าและ URL ไม่เปลี่ยน
4. กด avatar `Q` มุมขวาบนแทน แล้วหน้า Settings เปิดได้ทันที

### 4. Navigation ของ iPad ไม่มี accessible name

ความรุนแรง: กลางด้าน accessibility

ที่ viewport 820×1180 sidebar ยุบเหลือไอคอน และ accessibility tree แสดง navigation buttons ทั้งห้าปุ่มโดยไม่มีชื่อ ทำให้ผู้ใช้ screen reader แยก Today, Learn, Speak, Collection และ Progress ไม่ได้

### 5. จำนวนสถานการณ์ในหัวข้อไม่ตรงกับรายการจริง

ความรุนแรง: ต่ำ

หน้า Speak แสดง `EXPLORE 50 SCENARIOS` แต่รายการ built-in มี 70 รายการจริง (20 Everyday + 50 กลุ่มงาน) และฟิลเตอร์ยืนยันจำนวนดังกล่าว

## หลักฐานภาพ

- [Desktop home](screenshots/qa-desktop-home.jpg)
- [Desktop practice pattern](screenshots/qa-desktop-practice-pattern.jpg)
- [Desktop feedback](screenshots/qa-desktop-feedback.jpg)
- [iPhone 390×844 home](screenshots/qa-iphone-390x844-home.jpg)
- [iPad 820×1180 curriculum](screenshots/qa-ipad-820x1180-learn.jpg)

## ยังไม่ได้ทดสอบ

- การอัดเสียงจากไมโครโฟนจริงและ browser permission เพราะรอบนี้ใช้ไฟล์เสียงสังเคราะห์เท่านั้น
- Live conversation แบบ WebSocket และการพูดแทรก
- การนับ speaking mastery จากคำตอบเสียงที่เป็นอิสระครบทุก stage; การตอบหลังรอบเสียงแรกใช้ typed fallback เพื่อเดิน flow และถูกนับเป็น 0 ตามที่ควร
- การสร้าง uncached TTS ให้สำเร็จ เพราะงานสร้างเสียงใหม่ล้มเหลวตามปัญหาข้อ 1; การเล่น cached TTS ผ่าน BFF ผ่านแล้ว
- การเปลี่ยนรหัสผ่านและการบันทึกค่าตั้งค่าใหม่
- การเล่นครบทุกบทเรียน 100 บทและทุกสถานการณ์ 70 รายการ ตรวจเฉพาะจำนวน ระดับ ฟิลเตอร์ และ representative happy flow
