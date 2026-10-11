import { expect, test, type Page } from "@playwright/test";

// The drill records from the microphone, so Chromium is given a fake one.
test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});

const user = {
  id: "daily-drill-learner",
  username: "daily-drill",
  role: "learner",
  must_change_password: false,
  profile: { level: "A1", speed: 1, voice: "Kore", onboarded: true, thai_support: true },
};

const presentSimple = { id: "ebook-002", title: "Present Simple", title_th: "พูดถึงกิจวัตร", level: "A1" };
const sentences = [
  { en: "I fixed the retry bug today.", th: "วันนี้ฉันแก้บั๊ก retry แล้ว", reading_th: "ไอ ฟิกซ์ท เดอะ รี-ไทร บั๊ก ทู-เดย์", grammar: [{ id: "ebook-005", title: "Past Simple: I Did", title_th: "เล่าเรื่องที่จบแล้ว", level: "A1" }] },
  { en: "I usually join the stand-up at nine.", th: "ปกติฉันเข้า stand-up ตอนเก้าโมง", reading_th: "ไอ ยู-ชวล-ลี จอยน์ เดอะ สแตนด์-อัพ แอท ไนน์", grammar: [presentSimple] },
  { en: "QA will confirm tomorrow.", th: "QA จะยืนยันพรุ่งนี้", reading_th: "คิว-เอ วิล คัน-เฟิร์ม ทู-มอร์-โรว์", grammar: [] },
];
const baseEntry = {
  id: "meet-1", day: "2026-10-11", title: "Stand-up", source: "แก้ retry bug แล้ว ปกติเข้า stand-up 9 โมง QA จะ confirm พรุ่งนี้",
  english: sentences.map((sentence) => sentence.en).join(" "), thai: sentences.map((sentence) => sentence.th).join(" "),
  question: "What did you fix?", question_th: "คุณแก้อะไร", phrases: [],
};

type Spoken = { target: string; level: string };

function field(body: string, name: string): string {
  return body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`))?.[1] ?? "";
}

async function installDaily(page: Page, entry: Record<string, unknown>, options: { passes?: boolean; analyzed?: Record<string, unknown> } = {}) {
  const spoken: Spoken[] = [];
  const levels: Record<string, number> = {};
  let fullPassed = false;
  let current = entry;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = route.request().method();
    if (path === "/auth/me") return route.fulfill({ json: user });
    if (path === "/progress") return route.fulfill({ json: { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] } });
    if (path === "/daily-meets" && method === "GET") return route.fulfill({ json: [current] });
    if (path === "/daily-meets/meet-1" && method === "PATCH") {
      // The server splits text that has no sentence list yet.
      if (!current.sentences) current = { ...current, analyzed: false, sentences: sentences.map((sentence) => ({ en: sentence.en, th: "", reading_th: "", grammar: [] })) };
      return route.fulfill({ json: current });
    }
    if (path === "/daily-meets/meet-1/analyze" && method === "POST") return route.fulfill({ status: 202, json: { job_id: "analyze-job" } });
    if (path === "/jobs/analyze-job") {
      current = options.analyzed || current;
      return route.fulfill({ json: { status: "complete", result: current } });
    }
    if (path === "/daily-meets/meet-1/speak" && method === "POST") {
      const body = route.request().postDataBuffer()?.toString("latin1") || "";
      const attempt = { target: field(body, "target"), level: field(body, "level") };
      spoken.push(attempt);
      const passed = options.passes !== false;
      if (passed && attempt.target === "all") fullPassed = true;
      else if (passed) levels[attempt.target] = Math.max(levels[attempt.target] || 0, Number(attempt.level));
      return route.fulfill({ json: {
        target: attempt.target, level: Number(attempt.level), passed, audio_clear: true,
        transcript: passed ? "I fixed the retry bug today." : "I fix the bug.",
        missing_words: passed ? [] : ["retry", "today"],
        tip_th: passed ? "ดีมาก พูดครบทุกคำ" : "ลองพูดคำว่า retry ให้ชัดขึ้น", pronunciation_th: "",
        drill: { levels: { ...levels }, full_passed: fullPassed },
      } });
    }
    if (path.startsWith("/ebook")) return route.fulfill({ json: { title: "Learn Ebook", version: "2026-10-10.v2", page_count: 0, units: [], progress: {}, cursor: null } });
    return route.fulfill({ json: {} });
  });
  return { spoken };
}

async function say(page: Page) {
  await page.getByRole("button", { name: "เริ่มอัดเสียง" }).click();
  await expect(page.getByRole("button", { name: "หยุดและส่งเสียง" })).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "หยุดและส่งเสียง" }).click();
}

for (const device of [
  { name: "desktop 1440", viewport: { width: 1440, height: 1000 } },
  { name: "iPhone 390", viewport: { width: 390, height: 844 } },
]) {
  test.describe(`Daily Meet sentence drill — ${device.name}`, () => {
    test.use({ viewport: device.viewport });

    test("sentences show their grammar units, and support fades from reading aid to memory to the whole entry", async ({ page }) => {
      const daily = await installDaily(page, { ...baseEntry, sentences, analyzed: true, drill: { levels: {}, full_passed: false } });
      await page.goto("/?view=daily-meet");
      await page.locator(".daily-entry").first().click();

      const rows = page.getByTestId("daily-sentence");
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(1)).toContainText("I usually join the stand-up at nine.");
      await expect(rows.nth(1).getByRole("button", { name: /Present Simple/ })).toContainText("A1");
      await expect(page.getByRole("button", { name: "วิเคราะห์ประโยค" })).toHaveCount(0);

      await page.getByRole("button", { name: "ฝึกพูดทีละประโยค" }).click();
      const card = page.getByTestId("daily-drill-sentence");
      // Level 1: sentence, reading aid and meaning.
      await expect(page.getByRole("radio", { name: /มีคำอ่าน/ }).first()).toHaveAttribute("aria-checked", "true");
      await expect(card.locator(".daily-drill-en")).toHaveText(sentences[0].en);
      await expect(page.getByTestId("daily-drill-reading")).toContainText("ไอ ฟิกซ์ท");
      await say(page);
      await expect(page.getByTestId("daily-drill-result")).toContainText("ผ่านประโยคนี้แล้ว");
      await expect(page.getByRole("button", { name: "ประโยค 1 ผ่านแล้ว" })).toBeVisible();
      expect(daily.spoken[0]).toEqual({ target: "0", level: "1" });

      // Level 2: no reading aid.
      await page.getByRole("radio", { name: /ไม่มีคำอ่าน/ }).click();
      await expect(card.locator(".daily-drill-en")).toBeVisible();
      await expect(page.getByTestId("daily-drill-reading")).toHaveCount(0);

      // Level 3: only the Thai meaning; peeking turns the attempt into level 2.
      await page.getByRole("radio", { name: /ไม่เห็นประโยค/ }).click();
      await expect(card.locator(".daily-drill-en")).toHaveCount(0);
      await expect(card.locator(".daily-drill-th")).toHaveText(sentences[0].th);
      await say(page);
      await expect(page.getByTestId("daily-drill-result")).toBeVisible();
      expect(daily.spoken[1]).toEqual({ target: "0", level: "3" });
      await page.getByRole("button", { name: "ประโยคถัดไป" }).click();
      await expect(card.locator(".daily-drill-th")).toHaveText(sentences[1].th);
      await page.getByRole("button", { name: /แอบดูประโยค/ }).click();
      await expect(card.locator(".daily-drill-en")).toHaveText(sentences[1].en);
      await say(page);
      await expect(page.getByTestId("daily-drill-result")).toBeVisible();
      expect(daily.spoken[2]).toEqual({ target: "1", level: "2" });

      // The whole entry from memory.
      await page.getByRole("radio", { name: /พูดรวม/ }).click();
      await expect(page.getByTestId("daily-drill-whole")).toContainText(sentences[2].th);
      await say(page);
      await expect(page.getByTestId("daily-drill-result")).toContainText("เล่าทั้งเรื่องได้แล้ว");
      expect(daily.spoken[3]).toEqual({ target: "all", level: "3" });

      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await page.getByRole("button", { name: "กลับไปที่บันทึก" }).first().click();
      await expect(page.getByText("เล่าทั้งเรื่องผ่านแล้ว")).toBeVisible();
    });

    test("a miss shows what was not heard and does not mark the sentence", async ({ page }) => {
      await installDaily(page, { ...baseEntry, sentences, analyzed: true }, { passes: false });
      await page.goto("/?view=daily-meet");
      await page.locator(".daily-entry").first().click();
      await page.getByRole("button", { name: "ฝึกพูดทีละประโยค" }).click();
      await say(page);
      const result = page.getByTestId("daily-drill-result");
      await expect(result).toContainText("ยังไม่ตรงกับประโยค");
      await expect(result.locator("mark")).toHaveText(["retry", "today"]);
      await expect(page.getByRole("button", { name: "ประโยค 1 ผ่านแล้ว" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "ข้ามไปก่อน" })).toBeVisible();
    });
  });
}

test("an entry written before sentence practice is split on open and can be analysed", async ({ page }) => {
  await installDaily(page, baseEntry, { analyzed: { ...baseEntry, sentences, analyzed: true } });
  await page.goto("/?view=daily-meet");
  await page.locator(".daily-entry").first().click();
  await expect(page.getByTestId("daily-sentence")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Present Simple/ })).toHaveCount(0);
  await page.getByRole("button", { name: "วิเคราะห์ประโยค" }).click();
  await expect(page.getByRole("button", { name: /Present Simple/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "วิเคราะห์ประโยค" })).toHaveCount(0);
});

test("a grammar unit on a sentence opens that unit in Learn Ebook", async ({ page }) => {
  await installDaily(page, { ...baseEntry, sentences, analyzed: true });
  await page.goto("/?view=daily-meet");
  await page.locator(".daily-entry").first().click();
  await page.getByTestId("daily-sentence").nth(1).getByRole("button", { name: /Present Simple/ }).click();
  await expect(page).toHaveURL(/view=ebook&unit=ebook-002/);
});

test.describe("Daily Meet sentence drill — touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  async function drag(page: Page, fromX: number, toX: number, y: number, steps: number, stepMs: number) {
    const client = await page.context().newCDPSession(page);
    const point = (x: number) => [{ x, y, id: 1 }];
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(fromX) });
    for (let i = 1; i <= steps; i++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(fromX + ((toX - fromX) * i) / steps) });
      await page.waitForTimeout(stepMs);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  test("a sideways flick moves between sentences, and the first sentence resists going back", async ({ page }) => {
    await installDaily(page, { ...baseEntry, sentences, analyzed: true });
    await page.goto("/?view=daily-meet");
    await page.locator(".daily-entry").first().click();
    await page.getByRole("button", { name: "ฝึกพูดทีละประโยค" }).click();
    const card = page.getByTestId("daily-drill-sentence");
    await expect(card.locator(".daily-drill-en")).toHaveText(sentences[0].en);
    const box = (await card.boundingBox())!;
    const y = box.y + 40;

    const left = box.x + 60;
    const right = box.x + box.width - 60;
    // Let the card settle before the next touch lands on it.
    const settle = () => page.waitForTimeout(450);

    // Dragging right on the first sentence only stretches a little and returns.
    await drag(page, left, right, y, 8, 16);
    await expect(card.locator(".daily-drill-en")).toHaveText(sentences[0].en);
    await settle();

    // A short, slow drag is not enough to change sentence.
    await drag(page, right, right - 50, y, 6, 60);
    await expect(card.locator(".daily-drill-en")).toHaveText(sentences[0].en);
    await settle();

    // A flick to the left goes to the next sentence; a flick right comes back.
    await drag(page, right, left + 60, y, 6, 12);
    await expect(card.locator(".daily-drill-en")).toHaveText(sentences[1].en);
    await expect(page.getByRole("button", { name: "ประโยค 2" })).toHaveAttribute("aria-current", "step");
    await settle();
    await drag(page, left, right - 60, y, 6, 12);
    await expect(card.locator(".daily-drill-en")).toHaveText(sentences[0].en);
  });
});
