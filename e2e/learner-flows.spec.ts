import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "learner-1",
  username: "playwright",
  role: "learner",
  must_change_password: false,
  profile: { level: "A1", speed: 1, voice: "Kore", onboarded: true },
};

const lesson = {
  id: "lesson-001",
  title: "Introduce yourself",
  objective: "Introduce yourself with one useful detail.",
  pattern: "I work as a [job].",
  explanation: "Use the pattern with your own detail.",
  example: "I work as a designer.",
  meaning: "ฉันทำงานเป็นนักออกแบบ",
  drills: [],
};

const feedback = {
  transcript: "I work as a designer.", reply: "What do you design?", reply_th: "คุณออกแบบอะไร",
  meaning: "ตอบตรงคำถาม", correct: true, goal_met: true, audio_clear: true,
  pronunciation: "", corrections: [], retry_sentence: "", weaknesses: [], vocabulary: [], level: "A1",
};

async function installApi(page: Page, handler: (path: string, method: string) => unknown) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const value = handler(path, route.request().method());
    if (path.startsWith("/audio/")) {
      await route.fulfill({ status: 200, contentType: "audio/wav", body: "" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(value) });
  });
}

function session(id: string, mode: string, state: Record<string, unknown>, progress?: Record<string, unknown>) {
  return {
    session: { id, mode, status: "active", state, summary: {}, progress },
    lesson: mode === "listening" ? {} : lesson,
    turns: [{ id: `${id}-turn-1`, role: "model", text: mode === "listening" ? "What did you do today?" : "Tell me about your work.", text_th: "วันนี้คุณทำอะไร" }],
    attempts: [],
  };
}

test("guided lesson advances, records progress, and resumes", async ({ page }) => {
  let advanced = false;
  let firstRound = false;
  await installApi(page, (path, method) => {
    if (path === "/auth/me") return user;
    if (path === "/progress") return { streak: 0, attempts: 0, speaking_minutes: 0 };
    if (path === "/sessions/guided" && method === "GET") {
      const state = { lesson_flow: "guided-v2", stage: advanced ? "conversation" : "pattern", step: 0, hint_level: 0, last_pass: false, independent: firstRound ? 1 : 0, auto_audio: false };
      const progress = { percent: firstRound ? 50 : 0, completed_drills: 0, total_drills: 0, independent_conversations: firstRound ? 1 : 0, required_conversations: 2, ready_to_complete: false };
      return session("guided", "lesson", state, progress);
    }
    if (path === "/sessions/guided/advance" && method === "POST") { advanced = true; return { stage: "conversation" }; }
    if (path === "/sessions/guided/turns" && method === "POST") { firstRound = true; return { id: "attempt-1", feedback, state: {}, progress: { percent: 50 }, session_completed: false }; }
    return {};
  });

  await page.goto("/?view=practice&session=guided");
  await expect(page.locator("h2").filter({ hasText: "I work as a [job]." })).toBeVisible();
  await expect(page.getByText("0%")).toBeVisible();
  await page.getByRole("button", { name: /พร้อมแล้ว เริ่มฝึกพูด/ }).click();
  await expect(page.getByText("รอบแรก: ใช้ pattern นี้เล่าเรื่องของคุณ")).toBeVisible();
  await page.getByRole("button", { name: "พิมพ์คำตอบ" }).click();
  await page.getByPlaceholder("พิมพ์คำตอบ (ไม่นับเป็น speaking mastery)").fill("I work as a designer.");
  await page.getByRole("button", { name: "ส่งข้อความ" }).click();
  await expect(page.getByText("50%")).toBeVisible();
  await page.reload();
  await expect(page.getByText("50%")).toBeVisible();
  await expect(page.getByText("รอบสอง: ลองคุยในสถานการณ์ใหม่ เพิ่มอีกหนึ่งรายละเอียด")).toBeVisible();
});

test("listening reveals captions progressively and accepts an answer after the first listen", async ({ page }) => {
  let listens = 0;
  let answerRequests = 0;
  await installApi(page, (path, method) => {
    if (path === "/auth/me") return user;
    if (path === "/progress") return { streak: 0, attempts: 0, speaking_minutes: 0 };
    if (path === "/sessions/listen" && method === "GET") return session("listen", "listening", { stage: "conversation", step: 0, hint_level: 0, listen_count: 0, auto_audio: true });
    if (path === "/sessions/listen/listen" && method === "POST") {
      listens += 1;
      return { turn_id: "listen-turn", audio_id: "audio-1", listen_count: listens, caption: listens === 1 ? "" : listens === 2 ? "What did you…" : "What did you do today?", translation: listens === 3 ? "วันนี้คุณทำอะไร" : "" };
    }
    if (path === "/sessions/listen/turns" && method === "POST") { answerRequests += 1; return { id: "answer-1", feedback, state: {}, session_completed: false }; }
    return {};
  });

  await page.goto("/?view=practice&session=listen");
  await expect(page.getByText("ลองจับใจความจากเสียงก่อน ยังไม่แสดงคำพูดภาษาอังกฤษ")).toBeVisible();
  await page.getByLabel("พิมพ์คำตอบเพื่อฝึกความเข้าใจ").fill("I worked on the release.");
  await page.getByRole("button", { name: "ส่งคำตอบ" }).click();
  await expect.poll(() => answerRequests).toBe(1);
  await page.getByRole("button", { name: /ฟังรอบ 2 พร้อมบางคำ/ }).click();
  await expect(page.getByText("What did you…")).toBeVisible();
  await page.getByRole("button", { name: "ฟังรอบ 3 พร้อมเฉลย" }).click();
  await expect(page.getByText("What did you do today?")).toBeVisible();
  await expect(page.getByText("วันนี้คุณทำอะไร")).toBeVisible();
});

test("Daily Meet generates a saved entry and launches listening practice", async ({ page }) => {
  const entry = {
    id: "meet-1", day: "2026-09-06", title: "Stand-up", source: "แก้ payment API แล้ว",
    english: "I fixed the payment API.", thai: "ฉันแก้ payment API แล้ว",
    question: "What did you fix?", question_th: "คุณแก้อะไร", phrases: [{ en: "fix the API", th: "แก้ API", note: "งาน" }],
  };
  await installApi(page, (path, method) => {
    if (path === "/auth/me") return user;
    if (path === "/progress") return { streak: 0, attempts: 0, speaking_minutes: 0 };
    if (path === "/daily-meets" && method === "GET") return [];
    if (path === "/daily-meets" && method === "POST") return { job_id: "daily-job" };
    if (path === "/jobs/daily-job") return { status: "complete", result: entry };
    if (path === "/daily-meets/meet-1" && method === "PATCH") return entry;
    if (path === "/daily-meets/meet-1/sessions" && method === "POST") return { id: "daily-listen" };
    if (path === "/sessions/daily-listen" && method === "GET") return session("daily-listen", "listening", { stage: "conversation", step: 0, hint_level: 0, daily_title: "Stand-up", auto_audio: true });
    if (path === "/sessions/daily-listen/listen" && method === "POST") return { turn_id: "daily-turn", audio_id: "audio-2", listen_count: 1, caption: "", translation: "" };
    return {};
  });

  await page.goto("/?view=daily-meet");
  await page.getByRole("button", { name: /เขียนบันทึกใหม่/ }).click();
  await page.getByLabel("เรื่องที่อยากเล่า").fill("แก้ payment API แล้ว และรอ QA ยืนยัน");
  await page.getByRole("button", { name: "เรียบเรียงและบันทึกเป็นอังกฤษ" }).click();
  await expect(page.getByText("I fixed the payment API.")).toBeVisible();
  await page.getByRole("button", { name: "ฝึกฟังเรื่องวันนี้" }).click();
  await expect(page.getByRole("heading", { name: "Stand-up" })).toBeVisible();
  await expect(page.getByText("ฟังรอบที่ 1")).toBeVisible();
});

test("Learn Ebook saves drafts, checks original questions, reveals deliberately, and launches oral practice", async ({ page }) => {
  let savedAnswers: Record<string, string> = {};
  let oralStarts = 0;
  const unit = { id: "unit-001", number: 1, title: "Fixture grammar", lesson_page: 1, exercise_page: 2, sections: [{ id: "1.1", item_ids: ["1.1:1"] }] };
  const pack = {
    explanation_th: "คำอธิบาย fixture", pattern: "I use [grammar].", vocabulary: [{ term: "fixture", meaning: "ตัวอย่าง", example: "A fixture example." }],
    questions: [{ id: "1.1:1", kind: "write", prompt: "Write the original fixture answer.", instruction_th: "พิมพ์คำตอบ", options: [], example: false }],
  };
  await installApi(page, (path, method) => {
    if (path === "/auth/me") return user;
    if (path === "/progress") return { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] };
    if (path === "/ebook") return { title: "Private fixture", version: "fixture-v1", page_count: 392, units: [unit], progress: { "unit-001": { page: 2, answers: savedAnswers } }, cursor: { unit_id: "unit-001", page: 2 } };
    if (path === "/ebook/units/unit-001" && method === "GET") return { unit, version: "fixture-v1", status: "ready", pack, progress: { page: 2, answers: savedAnswers } };
    if (path === "/ebook/units/unit-001/progress" && method === "PATCH") return { saved: true };
    if (path === "/ebook/units/unit-001/check" && method === "POST") return { marks: [{ id: "1.1:1", correct: true, reason_th: "ตอบตรงโจทย์แล้ว", answer: "solution-only" }], progress: { exercise_correct: 1, exercise_total: 1, exercises_completed: true } };
    if (path === "/ebook/units/unit-001/reveal" && method === "POST") return { "1.1:1": { answers: ["solution-only"], explanation_th: "เฉลย fixture" } };
    if (path === "/ebook/units/unit-001/sessions" && method === "POST") { oralStarts += 1; return { id: "ebook-speak" }; }
    if (path === "/sessions/ebook-speak" && method === "GET") return session("ebook-speak", "ebook", { stage: "conversation", step: 0, hint_level: 0, independent: 0, ebook_unit_id: "unit-001" });
    return {};
  });
  await page.route("**/api/ebook/units/unit-001/progress", async (route) => {
    savedAnswers = route.request().postDataJSON().answers;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: true }) });
  });

  await page.goto("/?view=ebook");
  await expect(page.getByRole("heading", { name: "Learn Ebook" })).toBeVisible();
  await expect(page.getByText("Write the original fixture answer.")).toBeVisible();
  await expect(page.getByText("solution-only")).toHaveCount(0);
  await page.getByLabel("คำตอบ 1.1:1").fill("solution-only");
  await expect.poll(() => savedAnswers["1.1:1"]).toBe("solution-only");
  await page.reload();
  await expect(page.getByLabel("คำตอบ 1.1:1")).toHaveValue("solution-only");
  await page.getByRole("button", { name: "ตรวจคำตอบชุดนี้" }).click();
  await expect(page.getByText(/ถูกต้อง.*ตอบตรงโจทย์แล้ว/)).toBeVisible();
  await page.getByRole("button", { name: "ขอดูเฉลยข้อนี้" }).click();
  await expect(page.getByText("solution-only — เฉลย fixture")).toBeVisible();
  await page.getByRole("button", { name: /ฝึกพูดท้ายบท/ }).click();
  await expect.poll(() => oralStarts).toBe(1);
});
