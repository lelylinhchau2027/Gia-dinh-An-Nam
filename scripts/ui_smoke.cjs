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
  let page;
  const errors = [];
  try {
    // Fresh isolated profile: never read the user's signed-in browser or family.
    page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    page.setDefaultTimeout(60000);
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
    // A direct reload renders the template before the local baby is loaded.
    await page.getByText("An Nam", { exact: true }).waitFor();
    await page.getByLabel("Giờ bắt đầu E.A.S.Y", { exact: true }).click();
    await page.getByLabel("Giờ 07", { exact: true }).click();
    await page.getByLabel("Phút 30", { exact: true }).click();
    await page.getByText("Chọn 07:30", { exact: true }).click();
    await page.getByText("07:30", { exact: true }).first().waitFor();
    await page.getByText("Dùng lịch này cho bé", { exact: true }).click();
    await page.getByText("Đã lưu lịch cho bé", { exact: true }).waitFor();
    await go("/easy");
    await page.getByText("Giờ bắt đầu: 07:30", { exact: true }).waitFor();
    console.log("PASS: customized EASY wake time persists");
    await go("/em-be");
    await page.getByTestId("choose-child").click();
    await page.getByTestId("add-child").click();
    await page.getByTestId("child-name").fill("Bé thứ hai");
    await page.getByTestId("save-child").click();
    await page.waitForURL((url) => url.pathname === "/em-be");
    await page.getByText("Đổi bé · 2 hồ sơ", { exact: true }).waitFor();
    await go("/assistant/milk");
    await page.getByText("Bé thứ hai", { exact: true }).waitFor();
    assert.ok(
      !(await page.locator("body").innerText()).includes("150 ml"),
      "new baby's diary must not show older baby's milk",
    );
    await page.getByTestId("add-care-record").click();
    await page.getByLabel("Số lượng", { exact: true }).fill("45");
    await saveRecord("/assistant/milk");
    await page.getByText("45 ml", { exact: true }).first().waitFor();
    await go("/em-be");
    await page.getByTestId("choose-child").click();
    await page.getByLabel("Chọn bé An Nam", { exact: true }).click();
    await page
      .getByLabel("Chọn bé An Nam", { exact: true })
      .waitFor({ state: "hidden" });
    await go("/assistant/milk");
    await page.getByText("An Nam", { exact: true }).waitFor();
    await page.getByText("150 ml", { exact: true }).first().waitFor();
    assert.ok(!(await page.locator("body").innerText()).includes("45 ml"));
    console.log(
      "PASS: add/switch babies, isolated diaries, selected baby survives reload",
    );
    await go("/family/message");
    await page.getByText("Lời nhắc của hai người", { exact: true }).waitFor();
    assert.equal(await page.getByTestId("chat-input").count(), 0);
    await page.getByText("Tạo lời nhắc", { exact: true }).click();
    await page
      .getByPlaceholder("Lịch tiêm, khám, mua đồ…")
      .fill("Lịch thử Telegram và cục bộ");
    await page.getByLabel("Chọn giờ", { exact: true }).click();
    await page.getByLabel("Giờ 23", { exact: true }).click();
    await page.getByLabel("Phút 45", { exact: true }).click();
    await page.getByText("Chọn 23:45", { exact: true }).click();
    await page
      .getByLabel("Phút 45", { exact: true })
      .waitFor({ state: "hidden" });
    await page
      .getByPlaceholder("Cần chuẩn bị gì, ai hỗ trợ…")
      .fill("Ghi chú riêng chỉ trong app");
    await snapshot("reminder-06-picker");
    await page.getByText("Tạo lời nhắc", { exact: true }).last().click();
    await page.waitForURL((url) => url.pathname === "/gia-dinh");
    await page
      .getByText("Lịch thử Telegram và cục bộ", { exact: true })
      .waitFor();
    await go("/gia-dinh");
    await page
      .getByText("Lịch thử Telegram và cục bộ", { exact: true })
      .waitFor();
    await snapshot("reminder-06-list");
    await go("/family/attention");
    await page.getByText("Xác nhận gửi báo nhanh", { exact: true }).waitFor();
    await go("/widgets");
    await page.getByText("Ba kiểu tiện ích", { exact: true }).waitFor();
    await snapshot("widgets-06-settings");
    console.log(
      "PASS: tap-only time, offline reminder persists, retired chat redirects, widget/attention settings",
    );
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
  } catch (error) {
    // This is an isolated demo profile; never inspect a signed-in family.
    console.error("Browser errors:", errors);
    if (page) {
      console.error(
        "Screen:",
        (await page.locator("body").innerText()).slice(-4000),
      );
      await page.screenshot({ path: "build/preview/ui-smoke-failure.png" });
    }
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
