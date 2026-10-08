const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
require.extensions[".png"] = (module, filename) => {
  module.exports = filename;
};
const {
  assistantTools,
  bornTools,
  pregnancyTools,
  entryToolId,
} = require("../src/data/assistant.ts");

test("assistant tools have unique IDs, valid original PNG assets and implemented destinations", () => {
  assert.equal(
    new Set(assistantTools.map((t) => t.id)).size,
    assistantTools.length,
  );
  for (const tool of assistantTools) {
    assert.ok(tool.kind || tool.route, tool.id);
    if (tool.image)
      assert.equal(
        Buffer.from(tool.image.uri.split(",")[1], "base64")
          .subarray(0, 8)
          .toString("hex"),
        "89504e470d0a1a0a",
      );
    if (tool.route)
      assert.ok(
        fs.existsSync(
          path.join(
            __dirname,
            "../app",
            tool.route === "/easy"
              ? "easy/index.tsx"
              : `${["/lich", "/theo-doi", "/gia-dinh"].includes(tool.route) ? "(tabs)" : ""}${tool.route}.tsx`,
          ),
        ),
        tool.route,
      );
  }
  assert.equal(bornTools.length, 17);
  assert.ok(pregnancyTools.some((t) => t.id === "kick"));
  assert.ok(!pregnancyTools.some((t) => t.id === "diaper"));
});
test("named native image sources contain exactly the original bytes and correct tool mapping", () => {
  const sources = require("../src/data/legacyImageSources.json");
  for (const [name, source] of Object.entries(sources)) {
    assert.deepEqual(
      Buffer.from(source.uri.split(",")[1], "base64"),
      fs.readFileSync(path.join(__dirname, "../assets/legacy", name + ".png")),
      name,
    );
  }
  const expected = {
    injections: "ic_needle",
    "same-week": "same_week",
    growth: "scale-2x",
    statistics: "emoji_1",
    easy: "ic_easy_routine",
    milestones: "ic_medal.or8",
    feeling: "ic_activity_felling",
    milk: "ic_activity_milk",
    pump: "ic_activity_breast_pump",
    sleep: "ic_activity_sleep",
    diaper: "ic_activity_diaper",
    weaning: "ic_activity_weaning",
    activity: "ic_activity_activity",
  };
  for (const [id, name] of Object.entries(expected))
    assert.equal(
      assistantTools.find((tool) => tool.id === id).image.uri,
      sources[name].uri,
      id,
    );
  assert.deepEqual(
    bornTools.map((t) => t.id),
    [
      "vaccines",
      "injections",
      "same-week",
      "statistics",
      "growth",
      "weekly",
      "easy",
      "milestones",
      "today",
      "feeling",
      "milk",
      "pump",
      "sleep",
      "diaper",
      "weaning",
      "activity",
      "teeth",
    ],
  );
});
test("original medals contain 64 unique criteria; custom or duplicate records do not inflate progress", () => {
  const { medalGroups, completedMedalIds } = require("../src/data/medals.ts");
  assert.deepEqual(
    medalGroups.map((g) => g.items.length),
    [17, 13, 8, 13, 13],
  );
  const ids = medalGroups.flatMap((g) => g.items.map((i) => i.id));
  assert.equal(new Set(ids).size, 64);
  const records = [
    { details: { tool: "milestones", medalId: ids[0] } },
    { details: { tool: "milestones", medalId: ids[0] } },
    { details: { tool: "milestones", milestone: "Nâng đầu" } },
    { details: { tool: "milestones", medalId: "unknown" } },
    { details: { tool: "activity", medalId: ids[1] } },
  ];
  assert.deepEqual([...completedMedalIds(records)], [ids[0]]);
});
test("original tooth geometry preserves all twenty positional storage keys and original numbers", () => {
  const shapes = require("../src/data/legacy/legacy-teeth-geometry.json");
  assert.equal(shapes.length, 5);
  assert.deepEqual(
    shapes.map((s) => s.orders[0]),
    [2, 3, 7, 5, 10],
  );
  assert.deepEqual(
    shapes.map((s) => s.orders[1]),
    [1, 4, 8, 6, 9],
  );
  for (const shape of shapes) {
    assert.ok(shape.path.d.startsWith("M"));
    assert.ok(shape.x1 + shape.width <= 300);
    assert.ok(shape.x2 + shape.width <= 300);
    assert.ok(shape.y + shape.height <= 181);
  }
});
test("daily totals never combine minutes and millilitres; local day navigation crosses month boundaries", () => {
  const { dailyTotals, shiftDay } = require("../src/lib/dailyCare.ts");
  assert.equal(
    dailyTotals([
      { amount: 120, unit: "ml" },
      { amount: 90, unit: "ml" },
      { amount: 15, unit: "phút" },
    ]),
    "210 ml · 15 phút",
  );
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDay("2024-02-28", 1), "2024-02-29");
});
test("EASY time shifts handle midnight and reject invalid clock input", () => {
  const {
    parseWakeTime,
    shiftedEasyTime,
  } = require("../src/lib/easySchedule.ts");
  assert.equal(parseWakeTime("07:30"), 450);
  assert.equal(shiftedEasyTime(7.75, 30), "08:15");
  assert.equal(shiftedEasyTime(23.5, 60), "00:30 (+1 ngày)");
  assert.equal(shiftedEasyTime(0, -30), "23:30 (hôm trước)");
  assert.throws(() => parseWakeTime("24:00"));
  assert.throws(() => parseWakeTime("07:60"));
});
test("legacy pumping records and tool-tagged records route to the right history", () => {
  assert.equal(
    entryToolId({ kind: "milk", details: { feeding: "Hút sữa" } }),
    "pump",
  );
  assert.equal(
    entryToolId({ kind: "activity", details: { tool: "teeth" } }),
    "teeth",
  );
  assert.equal(entryToolId({ kind: "diaper" }), "diaper");
});
