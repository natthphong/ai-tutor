import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "ebook-redesign-learner",
  username: "ebook-redesign",
  role: "learner",
  must_change_password: false,
  profile: { level: "A1", speed: 1, voice: "Kore", onboarded: true, thai_support: true },
};

const unit = (id: string, number: number, title: string) => ({
  id, number, title, lesson_page: number, exercise_page: number + 1,
  sections: [{ id: "1.1", item_ids: ["1.1:1"] }],
});

const units = [
  unit("unlearned", 1, "Unlearned fixture"),
  unit("learning", 2, "Learning fixture"),
  unit("learned", 3, "Learned fixture"),
  unit("review", 4, "Review fixture"),
];

const vocabulary = Array.from({ length: 11 }, (_, index) => ({
  term: `fixture-${index + 1}`,
  meaning: `ความหมาย ${index + 1}`,
  example: `Lesson example ${index + 1}.`,
}));

const pack = {
  explanation_th: "คำอธิบายจาก fixture",
  goal_th: "ใช้ pattern นี้คุยเรื่องงานของคุณได้",
  pattern: "I use [grammar].",
  examples: [
    { sentence: "She has lived here for years.", meaning: "เธออาศัยอยู่ที่นี่มาหลายปีแล้ว" },
    { sentence: "She has worked here since May.", meaning: "เธอทำงานที่นี่ตั้งแต่เดือนพฤษภาคม" },
    { sentence: "She has learned a lot.", meaning: "เธอเรียนรู้มามาก" },
  ],
  useful_phrases: ["present_tenses", "a-client-handoff", "Could you share the deadline?"],
  vocabulary,
  concept_steps: [
    { id: "notice", title: "Notice", status: "complete", quiz: null },
    { id: "meaning", title: "Meaning", status: "active", quiz: null },
    { id: "form", title: "Form", status: "locked", quiz: null },
    { id: "try", title: "Try it", status: "locked", quiz: null },
    { id: "use", title: "Use it", status: "locked", quiz: { id: "quiz-1", prompt: "Choose the grammar", options: [{ id: "option-a", text: "A" }, { id: "option-b", text: "B" }] } },
  ],
  original_book: { page: 2, label: "Original Book" },
  shadowing_sentences: [
    { lesson_example: "She has lived here for years.", source_page: 1 },
  ],
  questions: [{ id: "1.1:1", kind: "write", prompt: "Write a fixture answer.", instruction_th: "พิมพ์คำตอบ", options: [], example: false }],
};

const state = {
  unlearned: { learning_state: "unlearned" },
  learning: { learning_state: "learning", active_step: "meaning", answers: {} },
  learned: { learning_state: "learned", exercises_completed: true, speaking_completed: true },
  review: { learning_state: "review", review_due: true },
};

async function installEbookApi(page: Page, options: { failFirstCheck?: boolean } = {}) {
  const progressByUnit: Record<string, Record<string, unknown>> = Object.fromEntries(
    units.map(value => [value.id, { ...state[value.id as keyof typeof state] }]),
  );
  const savedVocabulary: Record<string, unknown> = {};
  const checkRequestIds: string[] = [];
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = route.request().method();
    if (path === "/auth/me") return route.fulfill({ json: user });
    if (path === "/progress") return route.fulfill({ json: { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] } });
    if (path === "/vocabulary" && method === "POST") {
      Object.assign(savedVocabulary, route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({ json: { saved: true } });
    }
    if (path === "/ebook") {
      return route.fulfill({ json: {
        title: "Synthetic Learn Ebook", version: "redesign-fixture-v1", page_count: 10, units,
        progress: progressByUnit,
        cursor: { unit_id: "learning", page: 2 },
      } });
    }
    if (path.startsWith("/ebook/pages/")) return route.fulfill({ status: 200, contentType: "image/jpeg", body: "" });
    const match = path.match(/^\/ebook\/units\/([^/]+)$/);
    if (match && method === "GET") {
      const id = match[1] as keyof typeof state;
      return route.fulfill({ json: { unit: units.find(value => value.id === id), version: "redesign-fixture-v1", status: "ready", pack, progress: progressByUnit[id] } });
    }
    const progressMatch = path.match(/^\/ebook\/units\/([^/]+)\/progress$/);
    if (progressMatch && method === "PATCH") {
      const id = progressMatch[1];
      const body = route.request().postDataJSON() as Record<string, unknown>;
      progressByUnit[id] = { ...(progressByUnit[id] || {}), ...body };
      return route.fulfill({ json: { saved: true, progress: progressByUnit[id] } });
    }
    if (path.endsWith("/check") && method === "POST") {
      const body = route.request().postDataJSON() as { request_id?: string; answers?: Record<string, string> };
      checkRequestIds.push(body.request_id || "");
      const submitted = Object.values(body.answers || {});
      expect(submitted.length).toBeGreaterThan(0);
      expect(submitted.every((value) => value.trim().length > 0)).toBe(true);
      expect(submitted).toContain("B");
      expect(submitted).not.toContain("option-b");
      if (options.failFirstCheck && checkRequestIds.length <= 2) return route.abort("failed");
      return route.fulfill({ json: { marks: [{ id: "quiz-1", correct: false, reason_th: "ยังไม่ตรง", answer: "fixture answer" }], correct: 0, total: submitted.length, progress: state.learning } });
    }
    if (path.endsWith("/sessions") && method === "POST") return route.fulfill({ json: { id: "ebook-speak" } });
    return route.fulfill({ json: {} });
  });
  return { progressByUnit, savedVocabulary, checkRequestIds };
}

for (const device of [
  { name: "desktop 1440", viewport: { width: 1440, height: 1000 } },
  { name: "iPad portrait", viewport: { width: 820, height: 1180 } },
  { name: "iPad landscape", viewport: { width: 1180, height: 820 } },
  { name: "iPhone 390", viewport: { width: 390, height: 844 } },
]) {
  test.describe(`Learn Ebook redesign — ${device.name}`, () => {
    test.use({ viewport: device.viewport });

    test("shows four progress states and a five-step accessible concept journey", async ({ page }) => {
      await installEbookApi(page);
      await page.goto("/?view=ebook");
      await expect(page.getByRole("heading", { name: "Learn Ebook" })).toBeVisible();
      for (const label of ["Unlearned", "Learning", "Learned", "Review"]) await expect(page.getByText(`${label} · 0%`, { exact: true })).toBeVisible();
      for (const label of ["Learning", "Learned", "Review"]) await expect(page.getByRole("button", { name: new RegExp(`^${label}\\s+1$`) })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Concept steps" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Concept steps" }).getByRole("listitem")).toHaveCount(5);
      await expect(page.getByRole("listitem", { name: /Meaning/ })).toHaveAttribute("aria-current", "step");
      await expect(page.getByRole("button", { name: "Explain", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Practice", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Next$/ })).toBeVisible();
      const dimensions = await page.evaluate(() => ({ viewportWidth: window.innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
      expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
      if (device.name === "iPhone 390") {
        const actions = await page.getByLabel("Lesson actions").boundingBox();
        const stepper = await page.getByRole("navigation", { name: "Concept steps" }).boundingBox();
        const bottomNav = await page.locator(".bottom-nav").boundingBox();
        expect(actions).not.toBeNull();
        expect(stepper).not.toBeNull();
        expect(bottomNav).not.toBeNull();
        expect((actions?.y || 0) + (actions?.height || 0)).toBeLessThanOrEqual(bottomNav?.y || 0);
        const overlapWidth = Math.max(0, Math.min((actions?.x || 0) + (actions?.width || 0), (stepper?.x || 0) + (stepper?.width || 0)) - Math.max(actions?.x || 0, stepper?.x || 0));
        const overlapHeight = Math.max(0, Math.min((actions?.y || 0) + (actions?.height || 0), (stepper?.y || 0) + (stepper?.height || 0)) - Math.max(actions?.y || 0, stepper?.y || 0));
        expect(overlapWidth * overlapHeight).toBe(0);
      }
      if (device.name === "desktop 1440") await page.screenshot({ path: "docs/screenshots/ebook-desktop-local.png", fullPage: true });
      if (device.name === "iPhone 390") await page.screenshot({ path: "docs/screenshots/ebook-phone-local.png", fullPage: true });
    });

    test("limits vocabulary, gives submitted question feedback, and keeps source text verbatim", async ({ page }) => {
      const { savedVocabulary, checkRequestIds } = await installEbookApi(page, { failFirstCheck: true });
      await page.goto("/?view=ebook");
      await expect(page.getByRole("heading", { name: "Vocabulary" })).toBeVisible();
      const showAllVocabulary = page.getByRole("button", { name: "Show all 10 vocabulary" });
      if (await showAllVocabulary.isVisible()) await showAllVocabulary.click();
      await expect(page.getByTestId("ebook-vocabulary-word")).toHaveCount(10);
      await expect(page.getByText("She has lived here for years.").first()).toBeVisible();
      await expect(page.getByText("Source: lesson example, page 1")).toBeVisible();
      await page.getByRole("button", { name: "Save fixture-1", exact: true }).click();
      await expect.poll(() => savedVocabulary).toEqual({ term: "fixture-1", meaning: "ความหมาย 1", example: "Lesson example 1." });
      await expect(page.getByRole("heading", { name: "Choose the grammar" })).toHaveCount(0);
      await page.getByRole("button", { name: /^Next$/ }).click();
      await expect(page.getByRole("heading", { name: "Choose the grammar" })).toBeVisible();
      await page.getByRole("radio", { name: "B" }).check();
      await page.getByRole("button", { name: "ตรวจคำตอบชุดนี้" }).click();
      await expect(page.getByText("Failed to fetch", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "ตรวจคำตอบชุดนี้" }).click();
      await expect(page.getByRole("status", { name: "Quiz feedback" })).toContainText("Try again");
      expect(checkRequestIds).toHaveLength(3);
      expect(new Set(checkRequestIds).size).toBe(1);
    });

  test("keeps the original book optional and restores the active step after reload", async ({ page }) => {
      const { progressByUnit } = await installEbookApi(page);
      await page.goto("/?view=ebook");
      await expect(page.getByAltText(/หนังสือต้นฉบับ/)).toHaveCount(0);
      await page.getByRole("button", { name: "Open Original Book" }).click();
      await expect(page.getByAltText(/หนังสือต้นฉบับ หน้า 2/)).toBeVisible();
      await page.getByRole("button", { name: "Close Original Book" }).click();
      await expect(page.getByRole("heading", { name: "Choose the grammar" })).toHaveCount(0);
      await page.getByRole("button", { name: /^Next$/ }).click();
      await expect(page.getByRole("heading", { name: "Choose the grammar" })).toBeVisible();
      await expect.poll(() => progressByUnit.learning.current_step).toBe(3);
      expect((progressByUnit.learning.completed_steps as Record<string, boolean> | undefined)?.examples).toBe(true);
      await page.reload();
      await expect(page.getByRole("listitem", { name: /Form/ })).toHaveAttribute("aria-current", "step");
      await expect(page.getByRole("button", { name: "Start speaking practice" })).toBeVisible();
    });
  });
}

test("shows the goal, pattern, and real examples on the first lesson step", async ({ page }) => {
  await installEbookApi(page);
  await page.goto("/?view=ebook");
  await page.getByRole("button", { name: /Unlearned fixture/ }).click();
  const lesson = page.locator("main.ebook-lesson-column");
  await expect(lesson.getByText("ใช้ pattern นี้คุยเรื่องงานของคุณได้", { exact: true }).first()).toBeVisible();
  await expect(lesson.getByText("I use [grammar].", { exact: true })).toBeVisible();
  for (const sentence of [
    "She has lived here for years.",
    "She has worked here since May.",
    "She has learned a lot.",
  ]) await expect(lesson.getByText(sentence, { exact: true })).toBeVisible();
  await expect(page.getByText("present_tenses", { exact: true })).toHaveCount(0);
  await expect(page.getByText("a-client-handoff", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Could you share the deadline?", { exact: true })).toBeVisible();
});

test("routes ebook shadowing sessions to the exact lesson line practice", async ({ page }) => {
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = route.request().method();
    if (path === "/auth/me") return route.fulfill({ json: user });
    if (path === "/progress") return route.fulfill({ json: { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] } });
    if (path === "/sessions/ebook-shadow" && method === "GET") {
      return route.fulfill({ json: {
        session: {
          id: "ebook-shadow",
          mode: "listening",
          status: "active",
          state: {
            ebook_activity: "shadowing",
            shadow_index: 0,
            shadow_lines: ["She has lived here for years.", "She has worked here since May.", "She has learned a lot."],
            shadow_meanings: ["เธออาศัยอยู่ที่นี่มาหลายปีแล้ว"],
          },
          summary: {},
        },
        lesson: {},
        turns: [{ id: "shadow-turn-1", role: "model", text: "She has lived here for years.", text_th: "เธออาศัยอยู่ที่นี่มาหลายปีแล้ว" }],
        attempts: [],
      } });
    }
    if (path === "/sessions/ebook-shadow/listen" && method === "POST") {
      return route.fulfill({ json: { audio_id: "shadow-audio", target: "She has worked here since May.", meaning_th: "เธอทำงานที่นี่ตั้งแต่เดือนพฤษภาคม" } });
    }
    return route.fulfill({ json: {} });
  });

  await page.goto("/?view=practice&session=ebook-shadow&from=ebook");
  await expect(page.getByText("LESSON-DERIVED SHADOWING")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Listen, then say it your way" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "She has lived here for years." })).toBeVisible();
  await expect(page.getByText("เธออาศัยอยู่ที่นี่มาหลายปีแล้ว")).toBeVisible();
  await page.getByRole("button", { name: "Listen to this line" }).click();
  await expect(page.getByRole("heading", { name: "She has worked here since May." })).toBeVisible();
  await expect(page.getByText("เธอทำงานที่นี่ตั้งแต่เดือนพฤษภาคม")).toBeVisible();
});

test("shows shadowing complete when the backend advances past the final line", async ({ page }) => {
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = route.request().method();
    if (path === "/auth/me") return route.fulfill({ json: user });
    if (path === "/progress") return route.fulfill({ json: { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] } });
    if (path === "/sessions/ebook-shadow-complete" && method === "GET") {
      return route.fulfill({ json: {
        session: {
          id: "ebook-shadow-complete",
          mode: "listening",
          status: "active",
          state: {
            ebook_activity: "shadowing",
            shadow_index: 3,
            shadow_lines: ["She has lived here for years.", "She has worked here since May.", "She has learned a lot."],
            shadow_meanings: ["เธออาศัยอยู่ที่นี่มาหลายปีแล้ว"],
          },
          summary: {},
        },
        lesson: {},
        turns: [],
        attempts: [],
      } });
    }
    return route.fulfill({ json: {} });
  });

  await page.goto("/?view=practice&session=ebook-shadow-complete&from=ebook");
  await expect(page.getByRole("heading", { name: "Shadowing complete" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three lines passed" })).toBeVisible();
});
