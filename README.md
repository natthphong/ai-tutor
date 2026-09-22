# Toko Loop

เว็บฝึกพูดภาษาอังกฤษสำหรับผู้เรียนไทย จากเริ่มต้นไปสู่ชีวิตประจำวันและการประชุม Tech / Banking / Business / Interview / Meeting

**Production:** https://ai-tutor-sooty-two.vercel.app  

## ใช้งาน

สมัครด้วย username, password และ invitation ใช้ครั้งเดียวจาก admin (หมดอายุ 7 วัน) → เลือกเริ่มจากศูนย์หรือ placement → เปิดบทเรียน → ฟัง pattern → ฝึกเสียง 4 แบบ → รับ feedback / retry → สนทนาในบริบทใหม่ → ทบทวนและดู progress

มี 525 บท (Pre-A1/A1 ระดับละ 45 บท และ A2/B1/B2 ระดับละ 145 บท) และ 70 ฉาก (50 ฉากงาน + 20 Everyday) พร้อมคลังศัพท์ตามบท คำใบ้ idea → keyword → pattern → sentence, custom scenario ที่แก้ก่อนเล่นได้, review scheduler, Live audio, ประวัติเสียง, เป้าหมาย/งบและ admin invitations การพิมพ์ไม่เพิ่ม speaking mastery

ระดับใช้จัดความยากภายในแอป ไม่ใช่การรับรอง CEFR หรือรับประกันความคล่องจากจำนวนบทเรียน

## พัฒนาและ deploy

ดูคำสั่งตรวจสอบซ้ำได้และบัญชี QA เฉพาะ local/test ที่ [docs/TESTING.md](docs/TESTING.md) ก่อนเริ่ม browser/API QA ห้ามนำ credential production มาใส่ fixture หรือ commit

```sh
npm ci
cp .env.example .env.local
npm run dev
npm run validate
```

ตั้ง `NEXT_PUBLIC_BACKEND_BASE_URL` เป็น deployed API base ที่กำหนดไว้ใน environment หรือ hosting configuration ของ Vercel Production (และ Preview ถ้าต้องการ) ค่า URL เป็นข้อมูลสาธารณะ ห้ามใส่ Gemini key ใน frontend ตัว browser เรียก `/api` ผ่าน Next.js BFF ซึ่งเก็บ session cookie แบบ HttpOnly เพื่อรองรับ Safari และ backend คนละ domain

Browser GETs for `/auth/me`, `/curriculum`, `/daily-plan`, `/library`, `/ebook`, and `/ebook/units/:id` use a small in-memory cache only in the browser. The TTLs are 10s, 30s, 10s, 15s, 60s, and 60s respectively; concurrent requests for the same path share one in-flight request, and the cache keeps the most recent 64 entries. Mutations invalidate data reads when they settle, account mutations also clear `/auth/me`, and `401` responses clear private data. Server-side requests, dynamic session/job/audio routes, and `cache: "no-store"` requests bypass this cache.

The contract test in `tests/ebook-redesign-contract.test.mjs` reads `../backend/contracts/openapi.json` when the sibling backend checkout is present, then falls back to `src/generated/openapi.json` for standalone frontend validation. Set `EBOOK_OPENAPI_PATH` when CI stores the contract elsewhere. `npm run validate` remains the complete frontend check: typecheck, unit tests, production build, and deterministic Playwright browser tests.

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

## ฟีเจอร์ใหม่: guided lesson, listening และ Daily Meet

รายละเอียด API ฉบับเต็มอยู่ที่ backend `contracts/openapi.json`; วิธีใช้และ compatibility อยู่ใน `../backend/docs/new-features.md`

- บทเรียนใหม่ใช้ pattern → เล่าเรื่องของตัวเอง → roleplay อีกบริบทหนึ่ง; สำเร็จสองรอบจบอัตโนมัติ ส่วน session เก่าที่ยังไม่มี `lesson_flow` ยังคง 4 drills เดิม
- Hint ภาษาไทยรับได้สูงสุด 500 ตัวอักษร Unicode และใช้ `request_id` เดิมเพื่อรับผลเดิมโดยไม่ข้ามระดับเมื่อ helper ล้มเหลว
- Listening เริ่มจากคำถามเสียงอังกฤษ ฟังครั้งที่ 1 ไม่มีข้อความ ครั้งที่ 2 มี caption บางส่วน และครั้งที่ 3 มี caption เต็มกับคำแปลไทย ผู้เรียนตอบได้ทุกครั้ง; การเข้าใจบริบทแยกจาก grammar และการพิมพ์ไม่นับ speaking mastery
- Daily Meet เปลี่ยนบันทึกวันทำงานเป็น English/Thai, 3–6 phrases และคำถามต่อยอด แล้วเลือกฝึก free, Live หรือ listening ในบริบทบันทึกนั้น
- Frontend ยังคงเรียก backend ผ่าน `/api` BFF และเก็บ session ใน HttpOnly cookie; อย่าส่ง token หรือ credential ไปที่ browser

Release `20260906-progress-voice-cache` ถูก deploy แล้วที่ backend `265e762` และ frontend `bda27a2`; ฟีเจอร์ Listening/Daily Meet รวมอยู่ใน release `20260908-ebook` การทดสอบอัตโนมัติไม่ครอบคลุม mic permission, Bluetooth, backgrounding และ interruption บนอุปกรณ์จริง

## Learn Ebook — release 20260908-ebook

Learn Ebook ใช้หนังสือ private จำนวน 392 หน้า 145 units โดยภาพหน้าและเนื้อหาเรียกผ่าน `/api` BFF หลังยืนยันตัวตนเท่านั้น ต้นฉบับและ answer key ไม่อยู่ใน frontend หรือ Git

เมื่อเปิด unit ระบบขอเตรียม worksheet ตามต้องการและใช้ผลร่วมกันตาม book version ผู้เรียนบันทึกหน้าที่อ่าน ตรวจ grammar แบบ retry-safe เปิดเฉลยหลังลองตอบ และเริ่มฝึกพูดหรือฟังจาก unit ได้ การฝึกพูดต้องผ่าน oral รอบอิสระ 2 รอบก่อนจบ โดย review เดิมยังใช้งานต่อได้ Backend release `20260908-ebook` ผ่าน migration/readiness และ HTTPS แล้ว; frontend ส่งผ่าน main

## Learn Ebook — current guided flow

The current Learn Ebook screen keeps one short lesson in view: a cream and yellow Toko Loop shell with unit navigation on the left, the active lesson concept in the center, and Loop Coach with vocabulary on the right. Each unit is designed for 8–12 minutes and has five steps: Understand, Examples, Quick practice, Listen & shadow, and Use it. The center action bar keeps Explain, Practice, and Next available as the learner moves through the flow.

Progress is shown as `unlearned`, `learning`, `learned`, or `review`. Draft answers, the current step, and self-paced step completion resume after reload. Quiz submissions contain only answered items; public choice IDs are converted to their option text before the request, and correctness feedback is rendered only from the check response. Vocabulary is capped at exactly ten lesson entries and reveals the additional entries with the vocabulary control. Original Book is an optional dialog, and shadowing lines come verbatim from the lesson examples, including their lesson meaning when the private book page is unavailable.

The responsive browser fixture covers desktop, iPad portrait, iPad landscape, and iPhone 390px layouts. It intercepts `/api` with deterministic local data, so the reference images can be regenerated without backend or AI calls:

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e -- e2e/ebook-redesign.spec.ts
```

The full frontend validation command is `npm run validate`. The deterministic local screenshots are [desktop](docs/screenshots/ebook-desktop-local.png) and [iPhone 390](docs/screenshots/ebook-phone-local.png); the fixture and screenshot steps live in [e2e/ebook-redesign.spec.ts](e2e/ebook-redesign.spec.ts).
