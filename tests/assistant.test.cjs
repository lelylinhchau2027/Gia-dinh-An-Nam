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
        fs.readFileSync(tool.image).subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
      );
    if (tool.route)
      assert.ok(
        fs.existsSync(
          path.join(
            __dirname,
            "../app",
            `${["/lich", "/theo-doi", "/gia-dinh"].includes(tool.route) ? "(tabs)" : ""}${tool.route}.tsx`,
          ),
        ),
        tool.route,
      );
  }
  assert.equal(bornTools.length, 17);
  assert.ok(pregnancyTools.some((t) => t.id === "kick"));
  assert.ok(!pregnancyTools.some((t) => t.id === "diaper"));
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
