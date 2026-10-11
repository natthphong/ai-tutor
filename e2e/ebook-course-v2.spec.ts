import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "ebook-v2-learner",
  username: "ebook-v2",
  role: "learner",
  must_change_password: false,
  profile: { level: "A1", speed: 1, voice: "Kore", onboarded: true, thai_support: true },
};

const VERSION = "2026-10-10.v2";

// Source-book order differs from the learning path on purpose: the A1 unit is
// number 2 in the book but first on the path.
const units = [
  { id: "ebook-001", unit_id: "1", number: 1, title: "Present continuous", title_th: "พูดถึงสิ่งที่กำลังทำ", level: "A1", path_order: 2, status: "unlearned", percent: 0, current_step: 1, review_due: false, original_book: { available: false } },
  { id: "ebook-002", unit_id: "2", number: 2, title: "Present simple", title_th: "พูดถึงกิจวัตรก่อนไปทำงาน", level: "A1", path_order: 1, status: "unlearned", percent: 0, current_step: 1, review_due: false, original_book: { available: false } },
  { id: "ebook-015", unit_id: "15", number: 15, title: "Past perfect", title_th: "เล่าเหตุการณ์ที่เกิดก่อน", level: "B1", path_order: 3, status: "unlearned", percent: 0, current_step: 1, review_due: false, original_book: { available: false } },
];

const listening = [
  { id: "listen-01", sentence: "I brush my teeth after breakfast.", meaning: "ฉันแปรงฟันหลังอาหารเช้า", question_th: "ผู้พูดแปรงฟันเมื่อไร", options: ["ก่อนอาหารเช้า", "หลังอาหารเช้า", "ก่อนนอน"], answer: "หลังอาหารเช้า" },
  { id: "listen-02", sentence: "She doesn't drive to the office.", meaning: "เธอไม่ได้ขับรถไปออฟฟิศ", question_th: "เธอขับรถไปออฟฟิศไหม", options: ["ขับทุกวัน", "ไม่ขับ", "ขับเฉพาะวันศุกร์"], answer: "ไม่ขับ" },
  { id: "listen-03", sentence: "Do they start work at nine?", meaning: "พวกเขาเริ่มงานตอนเก้าโมงไหม", question_th: "ประโยคนี้ถามเรื่องอะไร", options: ["เวลาเริ่มงาน", "เวลาเลิกงาน", "สถานที่ทำงาน"], answer: "เวลาเริ่มงาน" },
];

const quizKey: Record<string, string> = {
  "quiz-01": "gets",
  "quiz-02": "take",
  "quiz-03": "wakes up",
  "quiz-04": "doesn't",
  "quiz-05": "I commute by bus every day.",
  "quiz-06": "She brushes her teeth before work.",
  "quiz-07": "I don't leave home late.",
  "quiz-08": "I drink coffee before work.",
};

const pack = {
  title: "Present simple", title_th: "พูดถึงกิจวัตรก่อนไปทำงาน", level: "A1", path_order: 1, theme: "Getting ready for work", theme_th: "เตรียมตัวไปทำงาน",
  explanation_th: "Present simple ใช้พูดถึงกิจวัตรและสิ่งที่ทำเป็นประจำ เมื่อประธานเป็น he หรือ she ต้องเติม -s ที่กริยา",
  goal_th: "พูดถึงกิจวัตรที่ทำเป็นประจำก่อนไปทำงานได้",
  pattern: "Subject + base verb (-s/-es for he/she/it)",
  notes: ["ใช้เมื่อพูดถึงกิจวัตร เช่น I wake up early.", "ใช้เมื่อบอกข้อเท็จจริงทั่วไป เช่น The shop opens at nine."],
  forms: [
    { label: "บอกเล่า", pattern: "He/She + verb-s", sentence: "She leaves home at seven.", meaning: "เธอออกจากบ้านตอนเจ็ดโมง" },
    { label: "ปฏิเสธ", pattern: "Subject + don't/doesn't + base verb", sentence: "I don't drink coffee.", meaning: "ฉันไม่ดื่มกาแฟ" },
    { label: "คำถาม", pattern: "Do/Does + subject + base verb?", sentence: "Do you leave early?", meaning: "คุณออกแต่เช้าไหม" },
  ],
  signal_words: ["every day", "usually", "always"],
  common_mistakes: [
    { wrong: "She leave home early.", right: "She leaves home early.", why_th: "ประธาน she ต้องเติม -s ที่กริยา" },
    { wrong: "Does she leaves early?", right: "Does she leave early?", why_th: "หลัง Does ใช้กริยารูปปกติ" },
  ],
  compare_th: "Present simple ใช้กับกิจวัตร ส่วน Present continuous ใช้กับสิ่งที่กำลังทำตอนนี้",
  examples: [
    "I wake up early for work.", "I get dressed before breakfast.", "I don't drink coffee before work.",
    "Do you take a shower before work?", "My sister leaves home at seven.", "We commute by bus every day.",
  ].map((sentence, index) => ({ sentence, meaning: `ความหมายตัวอย่าง ${index + 1}` })),
  vocabulary: ["wake up", "get dressed", "brush", "breakfast", "coffee", "shower", "early", "leave", "ready", "commute"].map((term, index) => ({ id: `v-${index + 1}`, term, meaning: `คำแปล ${index + 1}`, example: `Example with ${term}.`, example_th: `ตัวอย่างคำที่ ${index + 1}` })),
  questions: [
    { id: "quiz-01", kind: "choice", prompt: "He ___ ready before work every day.", instruction_th: "เขาเตรียมตัวก่อนไปทำงานทุกวัน", options: [{ id: "1", text: "get" }, { id: "2", text: "gets" }, { id: "3", text: "is getting" }], tokens: [] },
    { id: "quiz-02", kind: "choice", prompt: "I usually ___ a shower before work.", instruction_th: "ปกติฉันอาบน้ำก่อนไปทำงาน", options: [{ id: "1", text: "take" }, { id: "2", text: "takes" }, { id: "3", text: "am taking" }], tokens: [] },
    { id: "quiz-03", kind: "fill", prompt: "She ___ (wake up) at six.", instruction_th: "เธอตื่นนอนตอนหกโมง", options: [], tokens: [] },
    { id: "quiz-04", kind: "fill", prompt: "He ___ (not / drink) tea.", instruction_th: "เขาไม่ดื่มชา", options: [], tokens: [] },
    { id: "quiz-05", kind: "reorder", prompt: "Put the words in the correct order.", instruction_th: "ฉันเดินทางไปทำงานโดยรถประจำทางทุกวัน", options: [], tokens: ["every", "I", "bus", "day.", "by", "commute"] },
    { id: "quiz-06", kind: "fix", prompt: "She brush her teeth before work.", instruction_th: "แก้ประโยคนี้ให้ถูก: เธอแปรงฟันก่อนไปทำงาน", options: [], tokens: [] },
    { id: "quiz-07", kind: "translate", prompt: "Translate into English.", instruction_th: "ฉันไม่ออกจากบ้านสาย", options: [], tokens: [] },
    { id: "quiz-08", kind: "write", prompt: "What do you do before work?", instruction_th: "เขียนหนึ่งประโยคเกี่ยวกับตัวเอง", options: [], tokens: [] },
  ],
  listening_items: listening.map((item) => ({ id: item.id, sentence: item.sentence, question_th: item.question_th, options: item.options.map((text, index) => ({ id: String(index + 1), text })) })),
  concept_steps: [
    { id: "understand", title: "Understand", status: "available" },
    { id: "examples", title: "Examples", status: "available" },
    { id: "quiz", title: "Quick practice", status: "available" },
    { id: "shadowing", title: "Listen & shadow", status: "available" },
    { id: "speaking", title: "Use it", status: "available" },
  ],
  original_book: { available: false },
  shadowing_sentences: listening.map((item) => ({ lesson_example: item.sentence, sentence: item.sentence, meaning: item.meaning })),
  speaking_prompt: "What do you do before work? Say one to three sentences.",
  speaking_th: "ก่อนไปทำงานคุณทำอะไรบ้าง",
  speaking_criteria: ["ใช้ present simple ได้ถูกต้อง", "บอกกิจวัตรได้ชัดเจน", "ใช้คำเป้าหมายอย่างน้อยสองคำ"],
  useful_phrases: ["I wake up early for work."],
  version: VERSION,
  is_redesigned: true,
};

async function installCourse(page: Page) {
  const progress: Record<string, unknown> = {};
  const checks: Record<string, string>[] = [];
  const sessions: string[] = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = route.request().method();
    if (path === "/auth/me") return route.fulfill({ json: user });
    if (path === "/progress") return route.fulfill({ json: { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] } });
    if (path === "/ebook") {
      return route.fulfill({ json: {
        title: "Learn Ebook · Practical English Grammar A1–B2", version: VERSION, page_count: 0, units,
        progress: {}, cursor: null, recommended_unit_id: "ebook-002",
        path: { total: 3, learned: 0, review: 0, levels: [{ level: "A1", total: 2, learned: 0 }, { level: "A2", total: 0, learned: 0 }, { level: "B1", total: 1, learned: 0 }, { level: "B2", total: 0, learned: 0 }] },
      } });
    }
    const unitMatch = path.match(/^\/ebook\/units\/([^/]+)$/);
    if (unitMatch && method === "GET") {
      const unit = units.find((value) => value.id === unitMatch[1]);
      return route.fulfill({ json: { id: unit?.id, unit, version: VERSION, status: "ready", pack, progress } });
    }
    if (path.endsWith("/progress") && method === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (typeof body.current_step === "number") progress.current_step = body.current_step;
      return route.fulfill({ json: { saved: true, progress } });
    }
    if (path.endsWith("/check") && method === "POST") {
      const body = route.request().postDataJSON() as { answers: Record<string, string> };
      checks.push(body.answers);
      const quizScores = { ...((progress.quiz_scores as Record<string, boolean>) || {}) };
      const listeningScores = { ...((progress.listening_scores as Record<string, boolean>) || {}) };
      const marks = Object.entries(body.answers).map(([id, answer]) => {
        const heard = listening.find((item) => item.id === id);
        if (heard) {
          const correct = answer === heard.answer;
          if (correct) listeningScores[id] = true;
          return { id, correct, reason_th: correct ? `ฟังเข้าใจถูกต้อง · ${heard.sentence} — ${heard.meaning}` : "ยังไม่ตรงกับที่ได้ยิน ลองฟังอีกครั้งแล้วเลือกใหม่", answer: correct ? heard.answer : "" };
        }
        const correct = answer === quizKey[id];
        quizScores[id] = correct;
        return { id, correct, reason_th: correct ? "ถูกต้อง · ใช้กฎของบทนี้ถูกแล้ว" : "ยังไม่ถูก ดูรูปกริยาอีกครั้ง", answer: "" };
      });
      progress.quiz_scores = quizScores;
      progress.listening_scores = listeningScores;
      return route.fulfill({ json: { marks, correct: Object.values(quizScores).filter(Boolean).length, total: 8, listening_done: listening.every((item) => listeningScores[item.id]), progress } });
    }
    if (path.endsWith("/sessions") && method === "POST") {
      sessions.push((route.request().postDataJSON() as { mode: string }).mode);
      return route.fulfill({ json: { id: "ebook-shadow-v2" } });
    }
    return route.fulfill({ json: {} });
  });
  return { checks, sessions };
}

for (const device of [
  { name: "desktop 1440", viewport: { width: 1440, height: 1000 } },
  { name: "iPhone 390", viewport: { width: 390, height: 844 } },
]) {
  test.describe(`Learn Ebook course v2 — ${device.name}`, () => {
    test.use({ viewport: device.viewport });

    test("follows the A1-first path and teaches the grammar point before practice", async ({ page }) => {
      await installCourse(page);
      await page.goto("/?view=ebook");
      // The learner lands on the first unit of the path, not unit 1 of the book.
      await expect(page.getByRole("heading", { name: "Unit lesson title" })).toHaveText("Present simple");
      const unitButtons = page.locator(".ebook-unit strong");
      await expect(unitButtons).toHaveText(["Present simple", "Present continuous", "Past perfect"]);
      await expect(page.locator(".ebook-unit").first()).toContainText("เรียนต่อบทนี้");
      await expect(page.locator(".ebook-unit").nth(2).locator(".ebook-level-tag")).toHaveText("B1");
      await expect(page.getByLabel("Course path progress")).toContainText("A1 0/2");

      // Teaching cards only: the outside-practice prompt repeats lesson text.
      const lesson = page.locator("main.ebook-lesson-column .ebook-lesson-card");
      await expect(lesson.getByText("ต้องเติม -s ที่กริยา", { exact: false }).first()).toBeVisible();
      await expect(lesson.getByText("ใช้เมื่อพูดถึงกิจวัตร เช่น I wake up early.")).toBeVisible();
      await expect(lesson.getByText("Do/Does + subject + base verb?")).toBeVisible();
      await expect(lesson.getByText("She leave home early.")).toBeVisible();
      await expect(lesson.getByText("She leaves home early.")).toBeVisible();
      await expect(lesson.getByText("Present continuous ใช้กับสิ่งที่กำลังทำตอนนี้", { exact: false })).toBeVisible();
      await expect(lesson.getByText("every day", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: /^Next$/ }).click();
      await expect(lesson.locator(".ebook-example")).toHaveCount(6);
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    });

    test("checks each quiz kind one question at a time", async ({ page }) => {
      const { checks } = await installCourse(page);
      await page.goto("/?view=ebook");
      await page.getByRole("listitem", { name: "Quick practice" }).getByRole("button").click();
      const check = page.getByRole("button", { name: "ตรวจคำตอบ", exact: true });
      const next = page.getByRole("button", { name: "Next question" });
      const feedback = page.getByRole("status", { name: "Quiz feedback" });

      // choice: a wrong form is rejected without showing the answer key.
      await page.getByRole("radio", { name: "get", exact: true }).check();
      await check.click();
      await expect(feedback).toContainText("Try again");
      await expect(next).toBeDisabled();
      await feedback.getByRole("button", { name: "Retry" }).click();
      await page.getByRole("radio", { name: "gets", exact: true }).check();
      await check.click();
      await expect(feedback).toContainText("Correct");
      await next.click();

      await page.getByRole("radio", { name: "take", exact: true }).check();
      await check.click();
      await expect(feedback).toContainText("Correct");
      await next.click();

      // fill: the learner types only the missing words.
      await expect(page.getByRole("heading", { name: "She ___ (wake up) at six." })).toBeVisible();
      await page.getByLabel("Answer quiz-03").fill("wakes up");
      await check.click();
      await expect(feedback).toContainText("Correct");
      await next.click();
      await page.getByLabel("Answer quiz-04").fill("doesn't");
      await check.click();
      await expect(feedback).toContainText("Correct");
      await next.click();

      // reorder: tapping the word bank builds the sentence.
      const bank = page.getByLabel("Word bank");
      for (const word of ["I", "commute", "by", "bus", "every", "day."]) await bank.getByRole("button", { name: word, exact: true }).click();
      await expect(page.getByLabel("Your sentence")).toHaveText("Icommutebybuseveryday.");
      await check.click();
      await expect(feedback).toContainText("Correct");
      await next.click();

      // fix: the wrong sentence can be copied and edited.
      await page.getByRole("button", { name: "คัดลอกประโยคมาแก้" }).click();
      await expect(page.getByLabel("Answer quiz-06")).toHaveValue("She brush her teeth before work.");
      await page.getByLabel("Answer quiz-06").fill("She brushes her teeth before work.");
      await check.click();
      await expect(feedback).toContainText("Correct");
      await next.click();

      await expect(page.getByText("ฉันไม่ออกจากบ้านสาย")).toBeVisible();
      await page.getByLabel("Answer quiz-07").fill("I don't leave home late.");
      await check.click();
      await expect(feedback).toContainText("Correct");
      await next.click();
      await page.getByLabel("Answer quiz-08").fill("I drink coffee before work.");
      await check.click();
      await expect(page.getByText("ผ่านแบบฝึกครบ 8 ข้อแล้ว", { exact: false })).toBeVisible();

      // Every request carried exactly one question, so a correct written
      // answer is never sent to the tutor model twice.
      expect(checks.length).toBe(9);
      expect(checks.every((answers) => Object.keys(answers).length === 1)).toBe(true);
      expect(checks[5]).toEqual({ "quiz-05": "I commute by bus every day." });
    });

    test("hides each listening line until it is understood, then opens shadowing", async ({ page }) => {
      const { checks, sessions } = await installCourse(page);
      await page.goto("/?view=ebook");
      await page.getByRole("listitem", { name: "Listen & shadow" }).getByRole("button").click();
      const items = page.getByTestId("ebook-listening-item");
      await expect(items).toHaveCount(3);
      for (const item of listening) await expect(page.getByText(item.sentence, { exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Source lines" })).toHaveCount(0);
      const start = page.locator(".ebook-shadowing-card > .button.primary");
      await expect(start).toBeDisabled();
      await expect(start).toContainText("ฟังให้ครบ 3 ประโยคก่อน");

      // A wrong answer keeps the line hidden.
      await items.nth(0).getByRole("radio", { name: "ก่อนนอน" }).check();
      await items.nth(0).getByRole("button", { name: "ตรวจข้อนี้" }).click();
      await expect(items.nth(0)).toContainText("ยังไม่ตรงกับที่ได้ยิน");
      await expect(page.getByText(listening[0].sentence, { exact: true })).toHaveCount(0);

      for (const [index, item] of listening.entries()) {
        await items.nth(index).getByRole("radio", { name: item.answer }).check();
        await items.nth(index).getByRole("button", { name: "ตรวจข้อนี้" }).click();
        await expect(items.nth(index).getByText(item.sentence, { exact: true })).toBeVisible();
        await expect(items.nth(index).getByText(item.meaning, { exact: true })).toBeVisible();
      }
      expect(checks.at(-1)).toEqual({ "listen-03": "เวลาเริ่มงาน" });
      await expect(page.getByRole("heading", { name: "Source lines" })).toBeVisible();
      await expect(start).toBeEnabled();
      await expect(start).toContainText("Start shadowing practice");
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
      if (device.name === "desktop 1440") await page.screenshot({ path: "docs/screenshots/ebook-v2-listening-desktop-local.png", fullPage: true });
      if (device.name === "iPhone 390") await page.screenshot({ path: "docs/screenshots/ebook-v2-listening-phone-local.png", fullPage: true });
      await start.click();
      await expect.poll(() => sessions).toEqual(["shadowing"]);
    });
  });
}

test("reading steps count as done however the learner moves on, and the percent follows each check", async ({ page }) => {
  const saves: Record<string, unknown>[] = [];
  await installCourse(page);
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().includes("/progress")) saves.push(request.postDataJSON() as Record<string, unknown>);
  });
  await page.goto("/?view=ebook");
  await expect(page.getByRole("heading", { name: "Unit lesson title" })).toHaveText("Present simple");
  // Jump from Understand straight to the quiz with the step bar, never pressing Next.
  await page.getByRole("listitem", { name: "Quick practice" }).getByRole("button").click();
  await expect.poll(() => (saves.at(-1)?.completed_steps as Record<string, boolean> | undefined)?.examples, { timeout: 8000 }).toBe(true);
  expect(saves.at(-1)?.completed_steps).toMatchObject({ understand: true, examples: true });
  expect(saves.at(-1)?.current_step).toBe(3);
  // Going back to an earlier step never un-completes anything.
  await page.getByRole("listitem", { name: "Understand" }).getByRole("button").click();
  await page.getByRole("listitem", { name: "Quick practice" }).getByRole("button").click();
  await expect.poll(() => saves.at(-1)?.current_step, { timeout: 8000 }).toBe(3);
  expect(saves.at(-1)?.completed_steps).toMatchObject({ understand: true, examples: true });
});

test("a finished unit shows 100% as soon as the server reports the last step", async ({ page }) => {
  await installCourse(page);
  // The server settles the reading steps when the quiz is passed and returns
  // every completed step with the check result.
  await page.route("**/api/ebook/units/*/check", async (route) => {
    const body = route.request().postDataJSON() as { answers: Record<string, string> };
    const id = Object.keys(body.answers)[0];
    return route.fulfill({ json: {
      marks: [{ id, correct: true, reason_th: "ถูกต้อง", answer: "" }], correct: 8, total: 8, listening_done: true,
      progress: { current_step: 3, quiz_scores: { [id]: true }, completed_steps: { understand: true, examples: true, quiz: true, shadowing: true, speaking: true }, learned: true },
    } });
  });
  await page.goto("/?view=ebook");
  const row = page.locator(".ebook-unit").first();
  await expect(row).toContainText("Unlearned · 0%");
  await page.getByRole("listitem", { name: "Quick practice" }).getByRole("button").click();
  await page.getByRole("radio", { name: "gets", exact: true }).check();
  await page.getByRole("button", { name: "ตรวจคำตอบ", exact: true }).click();
  await expect(row).toContainText("Learned · 100%");
  await expect(page.locator(".ebook-state-badge")).toHaveText("learned");
  await expect(page.getByRole("progressbar", { name: "Unit progress" })).toHaveAttribute("aria-valuenow", "100");
});

test("a draft save that overlaps a check never shows the progress from before the check", async ({ page }) => {
  await installCourse(page);
  // The server's view of the unit. A save answers with the state it saw when
  // the request arrived, a little later, like a real round trip.
  const server = { current_step: 3, completed_steps: { understand: true, examples: true } as Record<string, boolean> };
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  await page.route("**/api/ebook/units/*/progress", async (route) => {
    const seen = JSON.parse(JSON.stringify(server));
    await wait(800);
    return route.fulfill({ json: { saved: true, progress: seen } });
  });
  await page.route("**/api/ebook/units/*/check", async (route) => {
    const body = route.request().postDataJSON() as { answers: Record<string, string> };
    const id = Object.keys(body.answers)[0];
    await wait(600);
    server.completed_steps.quiz = true;
    return route.fulfill({ json: { marks: [{ id, correct: true, reason_th: "ถูกต้อง", answer: "" }], correct: 8, total: 8, listening_done: false, progress: JSON.parse(JSON.stringify(server)) } });
  });
  await page.goto("/?view=ebook");
  const row = page.locator(".ebook-unit").first();
  await page.getByRole("listitem", { name: "Quick practice" }).getByRole("button").click();
  await expect(page.getByRole("listitem", { name: "Quick practice" })).toHaveAttribute("aria-current", "step");
  // Let the saves from opening the unit and changing step finish first.
  await page.waitForTimeout(2600);
  // Answer and check at once: the debounced draft save fires while the check is in flight.
  await page.getByRole("radio", { name: "gets", exact: true }).check();
  await page.getByRole("button", { name: "ตรวจคำตอบ", exact: true }).click();
  await expect(row).toContainText("Learning · 60%", { timeout: 10000 });
  // Every overlapping save has answered by now; the percent must not fall back.
  await page.waitForTimeout(3000);
  await expect(row).toContainText("Learning · 60%");
  await expect(page.getByRole("progressbar", { name: "Unit progress" })).toHaveAttribute("aria-valuenow", "60");
});

test("a slow save of an earlier step never moves the learner back", async ({ page }) => {
  const saved: number[] = [];
  let firstSeen: () => void = () => {};
  let release: () => void = () => {};
  const firstRequest = new Promise<void>((resolve) => { firstSeen = resolve; });
  const firstResponse = new Promise<void>((resolve) => { release = resolve; });
  let first = true;
  await installCourse(page);
  // Registered last, so it handles progress saves before the course mock.
  await page.route("**/api/ebook/units/*/progress", async (route) => {
    const body = route.request().postDataJSON() as { current_step?: number };
    if (first) {
      first = false;
      // Hold the save of step 1 until the learner has moved to another step.
      firstSeen();
      await firstResponse;
    }
    if (typeof body.current_step === "number") saved.push(body.current_step);
    return route.fulfill({ json: { saved: true, progress: { current_step: body.current_step } } });
  });
  await page.goto("/?view=ebook");
  await expect(page.getByRole("heading", { name: "Unit lesson title" })).toHaveText("Present simple");
  await firstRequest;
  await page.getByRole("listitem", { name: "Quick practice" }).getByRole("button").click();
  await expect(page.getByRole("listitem", { name: "Quick practice" })).toHaveAttribute("aria-current", "step");
  // The stale answer for step 1 arrives before the debounced save of step 3.
  await page.waitForTimeout(250);
  release();
  await expect.poll(() => saved.length, { timeout: 8000 }).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(1200);
  expect(saved[0]).toBe(1);
  expect(saved.at(-1)).toBe(3);
});

test("Today sends the learner to the next Ebook unit after capped review", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (path === "/auth/me") return route.fulfill({ json: user });
    if (path === "/progress") return route.fulfill({ json: { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] } });
    if (path === "/daily-plan") {
      return route.fulfill({ json: {
        lesson: null, due_count: 22, minutes: 30, blocks: [],
        ebook: {
          total: 145, learned: 12, review_limit: 15, review_today: 15,
          levels: [{ level: "A1", total: 13, learned: 12 }],
          next_unit: { id: "ebook-005", number: 5, title: "Past simple (I did)", title_th: "เล่าเรื่องที่จบไปแล้ว", level: "A1", path_order: 13, status: "unlearned", percent: 0 },
        },
      } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/");
  const card = page.locator(".ebook-today-card");
  await expect(card).toContainText("Past simple (I did)");
  await expect(card).toContainText("เรียนจบแล้ว 12/145 บท");
  await expect(card).toContainText("ทบทวน 15 ข้อก่อน แล้วเรียนบทนี้ต่อ");
  await expect(card.locator(".pill")).toHaveText("A1");
});

// The state found on a real account: quiz, listening questions and speaking
// passed, but the shadowing half of step 4 never done.
const speakingBeforeShadowing = {
  current_step: 5,
  completed_steps: { understand: true, examples: true, quiz: true, speaking: true },
  listening_scores: { "listen-01": true, "listen-02": true, "listen-03": true },
  quiz_scores: Object.fromEntries(Object.keys(quizKey).map((id) => [id, true])),
};

async function installOpenShadowing(page: Page, progress: Record<string, unknown> = speakingBeforeShadowing) {
  const course = await installCourse(page);
  await page.route("**/api/ebook/units/ebook-002", (route) => route.fulfill({ json: { id: "ebook-002", unit: units[1], version: VERSION, status: "ready", pack, progress } }));
  return course;
}

test("a unit with speaking passed but shadowing open says so and offers shadowing as the next action", async ({ page }) => {
  const course = await installOpenShadowing(page);
  await page.goto("/?view=ebook&unit=ebook-002&continue=1");

  // The learner lands on the open step, and no step shows a check it has not earned.
  const shadowStep = page.getByRole("listitem", { name: /Listen & shadow/ });
  await expect(shadowStep).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("listitem", { name: /Use it/ })).toHaveAttribute("data-step-state", "done");
  await expect(page.getByTestId("ebook-part-listen")).toHaveClass(/done/);
  await expect(page.getByTestId("ebook-part-shadow")).toHaveClass(/open/);
  await expect(page.getByRole("progressbar", { name: "Lesson steps" })).toHaveAttribute("aria-valuenow", "4");

  const nextUp = page.getByTestId("ebook-next-up");
  await expect(nextUp).toContainText("เหลืออีก 1 ขั้น จึงครบ 100%");
  await expect(nextUp.locator('li[data-step="shadowing"]')).toHaveClass(/open/);
  await expect(nextUp.locator('li[data-step="speaking"]')).toHaveClass(/done/);

  // Moving past the open step flags it instead of ticking it.
  await page.getByRole("listitem", { name: /Use it/ }).getByRole("button").click();
  await expect(shadowStep).toHaveAttribute("data-step-state", "skipped");
  await expect(shadowStep).toContainText("ยังไม่ครบ");

  await nextUp.getByRole("button", { name: "เริ่มพูดตาม 3 ประโยค" }).click();
  await expect.poll(() => course.sessions).toEqual(["shadowing"]);
  await expect(page).toHaveURL(/from=ebook&unit=ebook-002/);
});

test("ending a speaking session reports what the unit still needs and returns to that unit", async ({ page }) => {
  await installOpenShadowing(page);
  await page.route("**/api/sessions/speak-done", (route) => route.fulfill({ json: {
    session: {
      id: "speak-done", mode: "ebook", status: "completed",
      state: { stage: "conversation", step: 2, hint_level: 0, independent: 2, ebook_unit_id: "2", ebook_lesson_id: "ebook-002", daily_title: "Ebook · Present simple" },
      summary: { attempts: 2, independent: 2, mastered: false, message: "ฝึกเสร็จแล้ว" },
      progress: { percent: 100, completed_drills: 0, total_drills: 0, independent_conversations: 2, required_conversations: 2, ready_to_complete: true },
    },
    lesson: {}, turns: [], attempts: [],
  } }));
  await page.goto("/?view=practice&session=speak-done&from=ebook&unit=ebook-002");

  const result = page.getByTestId("ebook-unit-result");
  await expect(result).toContainText("80%");
  await expect(result).toContainText("บทนี้ยังเหลืออีก 1 ขั้น");
  await expect(result.locator('li[data-step="shadowing"]')).toContainText("พูดตาม 3 ประโยค");
  await expect(result.locator('li[data-step="speaking"]')).toHaveClass(/done/);

  await result.getByRole("button", { name: "กลับไปทำขั้นที่เหลือ" }).click();
  await expect(page).toHaveURL(/view=ebook&unit=ebook-002/);
  await expect(page.getByRole("heading", { name: "Unit lesson title" })).toHaveText("Present simple");
  await expect(page.getByRole("listitem", { name: /Listen & shadow/ })).toHaveAttribute("aria-current", "step");
  // A plain reload afterwards restores the saved step, as before.
  await page.reload();
  await expect(page.getByRole("listitem", { name: /Use it/ })).toHaveAttribute("aria-current", "step");
});

test("a finished unit reports 100% after its last session", async ({ page }) => {
  const done = { ...speakingBeforeShadowing, completed_steps: { ...speakingBeforeShadowing.completed_steps, shadowing: true }, learned: true };
  await installOpenShadowing(page, done);
  await page.goto("/?view=ebook&unit=ebook-002");
  await expect(page.getByTestId("ebook-next-up")).toContainText("บทนี้ครบ 100% แล้ว");
  await expect(page.getByRole("progressbar", { name: "Lesson steps" })).toHaveAttribute("aria-valuenow", "5");
  for (const name of [/Understand/, /Examples/, /Quick practice/, /Listen & shadow/, /Use it/]) {
    await expect(page.getByRole("listitem", { name })).toHaveAttribute("data-step-state", "done");
  }
});

test("each unit offers a prompt to keep practising with an AI outside the app", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await installCourse(page);
  await page.goto("/?view=ebook");
  await page.getByRole("button", { name: "Copy prompt" }).click();
  await expect(page.getByRole("button", { name: "คัดลอกแล้ว" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Lesson: Present simple");
  expect(copied).toContain("My level for this lesson: A1");
  expect(copied).toContain(pack.pattern);
  expect(copied).toContain("wake up");
  expect(copied).toContain("She leaves home early.");
  expect(copied).toContain("Ask ONE short question at a time");
  await expect(page.getByTestId("ebook-unit-prompt")).toHaveText(copied);
});
