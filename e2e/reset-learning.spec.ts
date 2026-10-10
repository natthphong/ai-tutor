import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "reset-learner",
  username: "reset-learner",
  role: "learner",
  must_change_password: false,
  profile: { level: "A1", speed: 1, voice: "Kore", onboarded: true, thai_support: true, daily_minutes: 30, monthly_budget: 200, live_minutes: 10 },
};

async function install(page: Page, options: { failWith?: { status: number; error: string } } = {}) {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    const method = route.request().method();
    if (path === "/auth/me") return route.fulfill({ json: user });
    if (path === "/progress") return route.fulfill({ json: { streak: 0, attempts: 0, speaking_minutes: 0, daily: [] } });
    if (path === "/usage") return route.fulfill({ json: { spent: 12, budget: 200, live_seconds: 0, ai_configured: true } });
    if (path === "/account/reset" && method === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      requests.push(body);
      if (options.failWith) return route.fulfill({ status: options.failWith.status, json: { error: options.failWith.error } });
      return route.fulfill({ json: { reset: true, scope: body.scope, deleted: { vocabulary: 42, review_items: 17, review_events: 5 } } });
    }
    return route.fulfill({ json: {} });
  });
  return requests;
}

for (const device of [
  { name: "desktop 1440", viewport: { width: 1440, height: 1000 } },
  { name: "iPhone 390", viewport: { width: 390, height: 844 } },
]) {
  test.describe(`Reset learning data — ${device.name}`, () => {
    test.use({ viewport: device.viewport });

    test("asks for the typed word before clearing the collection and reviews", async ({ page }) => {
      const requests = await install(page);
      await page.addInitScript(() => localStorage.setItem("toko-ebook:reset-learner:2026-10-10.v2:ebook-002", "{\"answers\":{}}"));
      await page.goto("/?view=settings");
      await page.getByRole("button", { name: "รีเซ็ตทั้งหมด" }).click();
      const dialog = page.getByRole("dialog", { name: "รีเซ็ตข้อมูลการเรียน" });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("กู้คืนไม่ได้");
      await expect(dialog).toContainText("คลังของฉัน");
      await expect(dialog).toContainText("ยอดใช้ AI ของเดือนนี้");
      const confirm = dialog.getByRole("button", { name: "ยืนยันรีเซ็ต" });
      const word = dialog.getByLabel("Type delete to confirm");
      await expect(word).toBeFocused();
      await expect(confirm).toBeDisabled();
      await word.fill("delet");
      await expect(confirm).toBeDisabled();
      await word.fill("remove");
      await expect(confirm).toBeDisabled();
      // Pressing Enter with the wrong word must not send anything.
      await word.press("Enter");
      expect(requests).toHaveLength(0);
      await word.fill("Delete");
      await expect(confirm).toBeEnabled();
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
      if (device.name === "desktop 1440") await page.screenshot({ path: "docs/screenshots/reset-dialog-desktop-local.png" });
      if (device.name === "iPhone 390") await page.screenshot({ path: "docs/screenshots/reset-dialog-phone-local.png" });
      await confirm.click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("status")).toContainText("ลบคำศัพท์ 42 คำ และรายการทบทวน 17 รายการ");
      expect(requests).toEqual([{ confirm: "Delete", scope: "library" }]);
      // Lesson drafts stay when lesson progress was kept.
      expect(await page.evaluate(() => localStorage.getItem("toko-ebook:reset-learner:2026-10-10.v2:ebook-002"))).not.toBeNull();
    });

    test("clears lesson progress only when the learner opts in, and can be cancelled", async ({ page }) => {
      const requests = await install(page);
      await page.addInitScript(() => {
        localStorage.setItem("toko-ebook:reset-learner:2026-10-10.v2:ebook-002", "{\"answers\":{}}");
        localStorage.setItem("toko-ebook:someone-else:2026-10-10.v2:ebook-002", "{\"answers\":{}}");
      });
      await page.goto("/?view=settings");
      const open = page.getByRole("button", { name: "รีเซ็ตทั้งหมด" });
      await open.click();
      const dialog = page.getByRole("dialog", { name: "รีเซ็ตข้อมูลการเรียน" });
      await dialog.getByLabel("Type delete to confirm").fill("delete");
      // Escape and Cancel close without sending, and forget the typed word.
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await open.click();
      await expect(dialog.getByLabel("Type delete to confirm")).toHaveValue("");
      await dialog.getByRole("button", { name: "ยกเลิก" }).click();
      await expect(dialog).toHaveCount(0);
      expect(requests).toHaveLength(0);

      await open.click();
      await expect(dialog).not.toContainText("กลับไปเริ่มบทแรก");
      await dialog.getByRole("checkbox").check();
      await expect(dialog).toContainText("กลับไปเริ่มบทแรก");
      await dialog.getByLabel("Type delete to confirm").fill("delete");
      await dialog.getByRole("button", { name: "ยืนยันรีเซ็ต" }).click();
      await expect(page.getByRole("status")).toContainText("พร้อมความคืบหน้าบทเรียนและประวัติการฝึก");
      expect(requests).toEqual([{ confirm: "delete", scope: "all" }]);
      // Only this learner's local lesson drafts are removed.
      expect(await page.evaluate(() => [localStorage.getItem("toko-ebook:reset-learner:2026-10-10.v2:ebook-002"), localStorage.getItem("toko-ebook:someone-else:2026-10-10.v2:ebook-002")])).toEqual([null, "{\"answers\":{}}"]);
    });
  });
}

test("keeps the dialog open and shows the server's reason when a reset is refused", async ({ page }) => {
  const requests = await install(page, { failWith: { status: 409, error: "หยุด Live ที่กำลังใช้งานก่อนรีเซ็ต" } });
  await page.goto("/?view=settings");
  await page.getByRole("button", { name: "รีเซ็ตทั้งหมด" }).click();
  const dialog = page.getByRole("dialog", { name: "รีเซ็ตข้อมูลการเรียน" });
  await dialog.getByLabel("Type delete to confirm").fill("delete");
  await dialog.getByRole("button", { name: "ยืนยันรีเซ็ต" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("หยุด Live ที่กำลังใช้งานก่อนรีเซ็ต");
  await expect(dialog).toBeVisible();
  await expect(page.getByText("รีเซ็ตแล้ว")).toHaveCount(0);
  expect(requests).toHaveLength(1);
});
