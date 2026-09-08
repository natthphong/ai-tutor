# Local testing

Run the complete frontend validation suite:

```sh
npm run validate
```

It runs TypeScript checking, Node fixture tests, a production build, and mocked Playwright learner flows. The browser tests cover guided-lesson resume and progress, staged listening captions, Daily Meet generation through listening-practice launch, and Learn Ebook original-question display, draft persistence after reload, checking, explicit reveal and oral-practice launch. They intercept `/api` locally, make no HTTP request to a backend, and never call an AI provider.

Install the test browser once on a new machine:

```sh
npx playwright install chromium
```

## บัญชี QA สำหรับ local test

```text
username: qa_learner
password: qa-password-only
```

บัญชีนี้ใช้กับฐานข้อมูล local/test ที่ทิ้งได้เท่านั้น ห้ามใช้หรือ commit credential production

For local browser/API QA, use the backend's local-only fixture account after running `python3 ../backend/scripts/qa_local.py` against a disposable local server:

This account and password are for a disposable local database only. Production release QA credentials are kept in ignored environment files and must never be committed or copied into browser fixtures.

## เมื่อเพิ่มหรือเปลี่ยน feature

เพิ่ม regression ใน `tests/*.test.mjs` สำหรับ logic และ `e2e/learner-flows.spec.ts` สำหรับเส้นทางที่ผู้ใช้ทำจริง ใช้ข้อมูลสมมติและ mock `/api` ให้ครอบคลุม success, error และ reload/retry ที่เกี่ยวข้อง แล้วรัน `npm run validate` ก่อน deploy ทุกครั้ง ฝั่ง backend รัน `bash scripts/validate.sh` ใน repository backend ด้วย

Ebook fixtures ต้องเป็นโจทย์สมมติ ห้ามคัดลอก PDF, answer key หรือ credentials จริงลง Git การตรวจแบบ mock ไม่ยืนยันคุณภาพ Gemini หรือไมโครโฟนบน iPhone/iPad จริง; ให้แยก smoke test ที่ต้องใช้ AI/อุปกรณ์จริงและระบุผลตามที่ทดสอบ
