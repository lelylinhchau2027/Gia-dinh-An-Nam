// Read only the static drawing data; never execute code from the IPA.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");
const ipa = process.argv[2];
if (!ipa)
  throw new Error("Usage: node scripts/extract_legacy_teeth.cjs legacy.ipa");
const bundle = execFileSync(
  "unzip",
  ["-p", ipa, "Payload/becuame.app/main.jsbundle"],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);
const line = bundle.split("\n").find((line) => line.includes("e.TOOTH_DATA=["));
if (!line) throw new Error("No static tooth geometry found");
function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((prop) => {
        if (!ts.isPropertyAssignment(prop))
          throw new Error("Not a static property");
        return [prop.name.text, literal(prop.initializer)];
      }),
    );
  throw new Error("Refusing non-literal source");
}
let result;
function visit(node) {
  if (
    ts.isBinaryExpression(node) &&
    node.left.getText() === "e.TOOTH_DATA" &&
    ts.isArrayLiteralExpression(node.right)
  )
    result = literal(node.right);
  ts.forEachChild(node, visit);
}
visit(ts.createSourceFile("legacy.js", line, ts.ScriptTarget.ESNext, true));
if (result?.length !== 5) throw new Error("Expected five tooth shapes");
const root = path.resolve(__dirname, "..");
const target = "src/data/legacy/legacy-teeth-geometry.json";
const next = JSON.stringify(result, null, 2) + "\n";
fs.writeFileSync(path.join(root, target), next);
console.log("Extracted five original shapes; no legacy executable was run.");
