// Optional browser smoke test. This does NOT certify iOS keyboard behavior.
// NODE_PATH=/path/to/playwright-core/node_modules node scripts/ui_smoke.cjs
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const base = process.env.UI_BASE_URL || "http://localhost:8086";

async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    args: ["--no-sandbox", "--enable-features=SharedArrayBuffer"],
  });
  try {
    // Fresh isolated profile: never read the user's signed-in browser or family.
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const go = async (path) => {
      await page.goto(base + path, { timeout: 120000 });
    };
    const saveRecord = async (path) => {
      await page.getByText("Lưu vào nhật ký chung", { exact: true }).click();
      // Preset chips also contain "150 ml"; waiting for one could navigate
      // away while SQLite is still saving. Require the completed return first.
      await page.waitForURL((url) => url.pathname === path);
    };
    const snapshot = (name) =>
      page.screenshot({ path: `build/preview/${name}.png` });
    await go("/em-be");
    await page.getByTestId("tool-milk").waitFor();
    await page.getByText("An Nam", { exact: true }).first().waitFor();
    const bounds = await page.getByTestId("assistant-scroll").boundingBox();
    assert.equal(bounds.x, 0, "assistant must not inherit side padding");
    assert.equal(bounds.width, 390);
    assert.ok(bounds.height > 750, "no dead purple area above tabs");
    await snapshot("assistant-04-top");
    await page.getByTestId("tool-milk").scrollIntoViewIfNeeded();
    await snapshot("assistant-04-grid");
    const openPreferences = async () => {
      await page.getByLabel("Khác, chọn tiện ích", { exact: true }).click();
      await page.getByTestId("toggle-tool-milk").waitFor();
    };
    const savePreferences = async () => {
      await page.getByTestId("save-tool-preferences").click();
      await page
        .getByTestId("save-tool-preferences")
        .waitFor({ state: "hidden" });
    };
    await openPreferences();
    await page.getByTestId("toggle-tool-milk").click();
    await page.getByLabel("Đóng", { exact: true }).last().click();
    await openPreferences();
    assert.equal(
      await page.getByTestId("toggle-tool-milk").getAttribute("aria-checked"),
      "true",
      "closing without saving cancels the draft",
    );
    await page.getByTestId("toggle-tool-milk").click();
    await savePreferences();
    await page.getByTestId("tool-milk").waitFor({ state: "hidden" });
    await go("/em-be");
    await openPreferences();
    assert.equal(
      await page.getByTestId("toggle-tool-milk").getAttribute("aria-checked"),
      "false",
      "saved visibility survives reload",
    );
    await page.getByTestId("toggle-tool-milk").click();
    await savePreferences();
    console.log(
      "PASS: tool visibility saves, persists, and cancels unsaved changes",
    );
    await page.getByTestId("tool-milk").click();
    await page.getByLabel("Thêm lượng sữa", { exact: true }).click();
    await page.getByLabel("Số lượng", { exact: true }).fill("120");
    await page
      .getByLabel("Ghi chú", { exact: true })
      .fill("Kiểm tra giao diện, dữ liệu thử");
    await snapshot("assistant-04-milk-form");
    await saveRecord("/assistant/milk");
    await page.getByText("120 ml", { exact: true }).first().waitFor();
    await page.getByLabel("Sửa Lượng sữa", { exact: true }).click();
    await page.getByLabel("Số lượng", { exact: true }).fill("150");
    await saveRecord("/assistant/milk");
    await page.getByText("150 ml", { exact: true }).first().waitFor();
    console.log("PASS: milk create/edit and daily summary");
    await go("/assistant/pump");
    await page.getByLabel("Thêm hút sữa", { exact: true }).click();
    await page.getByLabel("Số lượng", { exact: true }).fill("90");
    await saveRecord("/assistant/pump");
    await page.getByText("90 ml", { exact: true }).first().waitFor();
    await go("/assistant/milk");
    await page.getByText("150 ml", { exact: true }).first().waitFor();
    assert.ok(!(await page.locator("body").innerText()).includes("240 ml"));
    console.log("PASS: pumping does not inflate consumed milk");
    await go("/assistant/milestones");
    await page.getByLabel("Huy chương Vận động", { exact: true }).click();
    await page
      .getByLabel("Quay đầu sang 2 bên khi đặt nằm sấp", { exact: true })
      .click();
    await saveRecord("/child/medals/20");
    await page.getByText("1 / 17 huy chương", { exact: true }).waitFor();
    await go("/assistant/milestones");
    await page.getByText("1 / 64 huy chương", { exact: true }).waitFor();
    await snapshot("assistant-04-medals");
    console.log("PASS: criterion saved and counted once");
    await go("/assistant/teeth");
    await page
      .getByLabel("Trên · Phải 1, răng số 2, chưa ghi", { exact: true })
      .click();
    await saveRecord("/assistant/teeth");
    await page
      .getByLabel("Trên · Phải 1, răng số 2, đã mọc", { exact: true })
      .waitFor();
    await page
      .getByLabel("Trên · Phải 1, răng số 2, đã mọc", { exact: true })
      .scrollIntoViewIfNeeded();
    await snapshot("assistant-04-teeth");
    console.log("PASS: original tooth shape maps to persisted position");
    await go("/easy/1");
    await page.getByLabel("Giờ bắt đầu E.A.S.Y").fill("07:30");
    await page.getByText("07:30", { exact: true }).first().waitFor();
    await page.getByText("Dùng lịch này cho bé", { exact: true }).click();
    await page.getByText("Đã lưu lịch cho bé", { exact: true }).waitFor();
    await go("/easy");
    await page.getByText("Giờ bắt đầu: 07:30", { exact: true }).waitFor();
    console.log("PASS: customized EASY wake time persists");
    await page.setViewportSize({ width: 320, height: 740 });
    await go("/em-be");
    await page.getByTestId("tool-milk").scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false);
    await snapshot("assistant-04-320");
    await go("/lich");
    await page.getByPlaceholder("Tìm trong cẩm nang…").fill("sữa");
    await snapshot("assistant-04-handbook");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 320px layout, handbook input, no uncaught browser errors",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
