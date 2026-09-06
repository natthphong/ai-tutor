# Toko Loop

เว็บฝึกพูดภาษาอังกฤษสำหรับผู้เรียนไทย จากเริ่มต้นไปสู่ชีวิตประจำวันและการประชุม Tech / Banking / Business / Interview / Meeting

**Production:** https://ai-tutor-sooty-two.vercel.app  
**Backend API:** https://api.example.com/ai-tutor/api/v2

## ใช้งาน

สมัครด้วย username, password และ invitation ใช้ครั้งเดียวจาก admin (หมดอายุ 7 วัน) → เลือกเริ่มจากศูนย์หรือ placement → เปิดบทเรียน → ฟัง pattern → ฝึกเสียง 4 แบบ → รับ feedback / retry → สนทนาในบริบทใหม่ → ทบทวนและดู progress

มี 525 บท (Pre-A1/A1 ระดับละ 45 บท และ A2/B1/B2 ระดับละ 145 บท) และ 70 ฉาก (50 ฉากงาน + 20 Everyday) พร้อมคลังศัพท์ตามบท คำใบ้ idea → keyword → pattern → sentence, custom scenario ที่แก้ก่อนเล่นได้, review scheduler, Live audio, ประวัติเสียง, เป้าหมาย/งบและ admin invitations การพิมพ์ไม่เพิ่ม speaking mastery

ระดับใช้จัดความยากภายในแอป ไม่ใช่การรับรอง CEFR หรือรับประกันความคล่องจากจำนวนบทเรียน

## พัฒนาและ deploy

```sh
npm ci
cp .env.example .env.local
npm run dev
npm run verify
```

ตั้ง `NEXT_PUBLIC_BACKEND_BASE_URL` เป็น URL รวม namespace เช่น `https://api.example.com/ai-tutor/api/v2` ใน Vercel Production (และ Preview ถ้าต้องการ) ค่า URL เป็นข้อมูลสาธารณะ ห้ามใส่ Gemini key ใน frontend ตัว browser เรียก `/api` ผ่าน Next.js BFF ซึ่งเก็บ session cookie แบบ HttpOnly เพื่อรองรับ Safari และ backend คนละ domain

push branch `main` ใช้ Git integration ของ Vercel; ทางเลือก `scripts/deploy.sh` ใช้ project IDs/token จาก environment ไม่มี auto commit/push ใน script Backend repo แยกเป็น `../backend` และใช้ `deploy_local.sh` พร้อม readiness/rollback

`npm run generate:api` สร้าง TypeScript types และ snapshot จาก `../backend/contracts/openapi.json` การ build ปกติไม่ต้องมี backend repo อยู่ใน Vercel

## ผลทดสอบ 5 กันยายน 2026

- Frontend: typecheck, 6 tests และ production build ผ่าน
- Backend: Go tests/vet และ integration tests ผ่าน; API/Gemini happy flow 18/18
- AI rubric evaluation: 9/9 (valid alternative, grammar/style separation, off-topic, injection, unclear audio); ชุดนี้ยังไม่ใช่ benchmark สำเนียงไทยจริง
- Live: PCM input → input/output transcript + audio, origin validation, one-use ticket, reconnect และ stop แล้ว usage หยุดเพิ่ม ผ่าน
- Happy flow ผ่าน login, curriculum, audio upload → feedback → retry, review/progress/reload, library และสร้าง/แก้/เล่น custom scenario
- Responsive browser viewport ผ่าน 390×844 และ 820×1180; cached audio เล่นผ่าน BFF จริง
- รอบ QA พบ TTS timeout, sidebar บนจอเตี้ย, accessible names และจำนวน scenarios; แก้ timeout/retry/cost estimate, เพิ่ม bounded worker 2 งาน, เลื่อน sidebar ได้, เพิ่ม aria-label และแสดงจำนวนจริงแล้ว

ขั้นตอนและผลดิบ: [UI QA](docs/qa-local.md), backend `reports/qa-api.json`, `reports/live-smoke.json`, `reports/gemini-evaluation.json`

## ภาพจาก happy flow

### Desktop: วันนี้
![Desktop home](docs/screenshots/qa-desktop-home.jpg)

### บทเรียนและ feedback
![Pattern](docs/screenshots/qa-desktop-practice-pattern.jpg)
![Feedback](docs/screenshots/qa-desktop-feedback.jpg)

### iPhone / iPad viewport
![iPhone 390×844](docs/screenshots/qa-iphone-390x844-home.jpg)
![iPad 820×1180](docs/screenshots/qa-ipad-820x1180-learn.jpg)

## ขอบเขตที่ต้องตรวจบนอุปกรณ์จริง

ยังไม่ได้รับรอง mic permission, Bluetooth, Safari autoplay, lock screen และ interruption บน iPhone/iPad จริง ภาพข้างต้นเป็น responsive viewport บน browser ทดสอบ เสียง QA เป็น synthetic fixture ไม่ใช่หลักฐานความแม่นยำ pronunciation สำหรับผู้เรียนไทย หลักสูตรยังควรปรับจากผลการฝึกจริง โดยเฉพาะพื้นฐานตัวเลข/ราคาและ cumulative assessment

PWA เก็บเฉพาะ assets ที่จำเป็น ไม่รองรับบทเรียน AI offline; ไม่มี YouTube import, ข่าวสด หรือ push notifications ตามขอบเขตที่ตกลง


## อัปเดต 6 กันยายน 2026: เรียนต่อและทบทวน

แยก **เรียนจบแล้ว** ออกจาก **พูดได้เอง**: เมื่อกดจบหลังมีคำตอบ บทนั้นจะแสดงว่าเรียนแล้วและแผนวันนี้เลือกบทถัดไป แม้ยังใช้คำใบ้/พิมพ์อยู่ การพิมพ์และคำใบ้ยังไม่นับเป็น speaking mastery

เปิดบทที่ค้างจากหลักสูตรหรือวันนี้จะใช้ session เดิมพร้อมประวัติ ไม่สร้างใหม่ ส่วนบทที่จบแล้วกลับมาเรียนซ้ำได้ การเดินหลักสูตรเป็นบทที่ 1 → 2 → 3 ภายใน Unit และข้าม Unit เมื่อครบ 5 บท หน้าหลักสูตรแสดงจำนวนบทที่เรียนแล้วต่อ Unit

การ์ดทบทวนมีหัวข้อภาษาไทยและโจทย์สถานการณ์ ระบุสิ่งที่ต้องสื่อและอนุญาตรายละเอียด/ถ้อยคำอื่นที่ถูกต้อง เปลี่ยนการ์ดเดิมโดยเก็บ ID, วันทบทวน, stage และประวัติไว้ คำตอบตัวอย่างเปิดเมื่อขอตัวช่วย

ทดสอบเฉพาะ feature เรียนต่อ/จบบทโดย Terra high: `TestLessonResume` ผ่าน ใช้ fake Gemini ไม่มีค่า AI ครอบคลุม completion, idempotency, resume/session/turn preservation, login persistence, replay, legacy history และ owner isolation ดู backend `docs/qa-resume.md` รอบนี้ไม่ได้ทดสอบเสียง/Live/ทุกบทซ้ำ


### หลักสูตรที่เพิ่ม

คง 100 บทเดิมและเพิ่ม 425 บท: A2/B1/B2 เพิ่มบทใช้จริงระดับละ 20 Unit × 5 บท พร้อม grammar อีกระดับละ 5 Unit × 5 บททุกระดับ รวมเป็น Pre-A1/A1 ระดับละ 9 Unit และ A2/B1/B2 ระดับละ 29 Unit เน้นทั้งชีวิตประจำวันและงานโดยแต่ละบทมีเป้าหมายต่างกัน

Grammar ครอบคลุม 12 tense forms และหัวข้อ common จาก *English Grammar in Use* ใน PDF ที่ผู้ใช้ให้ อ้างอิงหมายเลข Unit ตามหัวข้อ โดยเขียนตัวอย่าง/คำอธิบาย/แบบฝึกใหม่ทั้งหมด Future perfect continuous เป็นบทเสริมสำหรับบริบทจำกัด ไม่ใช่รูปแบบที่ต้องใช้บ่อย

Content generator และแผนที่หัวข้อ: backend `scripts/expand_curriculum.py`, `docs/curriculum-expansion.md` บทเดิมและประวัติผู้ใช้ไม่ถูกล้าง รูปภาพ happy flow ด้านบนเป็นหลักฐานจาก release วันที่ 5 กันยายน ก่อนการเพิ่มหลักสูตรครั้งนี้

## ฟีเจอร์ใหม่: cache, session และเสียง

รายละเอียด API ฉบับเต็มอยู่ที่ backend `contracts/openapi.json`; คำอธิบายการใช้งานและ compatibility อยู่ใน `../backend/docs/new-features.md`

- ข้อมูลส่วนตัวจาก curriculum, daily plan, library และ progress มี cache รายผู้ใช้และถูกล้างหลังข้อมูลที่เกี่ยวข้องเปลี่ยนแปลง โดย auth จะไม่ถูก cache
- Session บทเรียนมี progress สำหรับ 4 drills และ 2 independent conversations; เมื่อทำครบจะจบอัตโนมัติ แต่ปุ่มจบเองและการกลับมาเรียนต่อใน session ที่ค้างยังคงใช้ได้
- `auto_audio` เป็นตัวเลือกตอนสร้าง session (ค่าเริ่มต้น `false`) และเปลี่ยนได้ที่ `PATCH /sessions/{id}/settings`; ถ้ากลับเข้า session เดิมโดยไม่ส่งค่า จะเก็บค่าที่บันทึกไว้
- AI ตอบภาษาอังกฤษและ `reply_th` จากการประเมินครั้งเดียว แล้วส่ง `reply_audio_id` เมื่อเลือก auto-audio; client เล่นด้วยความเร็วที่ผู้เรียนเลือก และยังมีปุ่มเล่นเองเมื่อ Safari ปิด autoplay หรือสร้างเสียงไม่สำเร็จ
- Frontend ยังคงเรียก backend ผ่าน `/api` BFF และเก็บ session ใน HttpOnly cookie; อย่าส่ง token หรือ credential ไปที่ browser

Backend tests ผ่านแล้ว และ frontend typecheck, 6 tests, และ production build ผ่าน การ deploy ยังรอผลยืนยัน
