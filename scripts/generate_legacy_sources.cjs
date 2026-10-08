// Named, immutable image sources: no numeric AssetRegistry identity in release.
// Regenerate only from the original PNGs; tests compare every embedded byte.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const names = fs
  .readdirSync(path.join(root, "assets/legacy"))
  .filter((name) => name.endsWith(".png"))
  .sort();
const sources = Object.fromEntries(
  names.map((name) => [
    name.replace(/\.png$/, ""),
    {
      uri: `data:image/png;base64,${fs.readFileSync(path.join(root, "assets/legacy", name)).toString("base64")}`,
    },
  ]),
);
const target = "src/data/legacyImageSources.json";
fs.writeFileSync(
  path.join(root, target),
  JSON.stringify(sources, null, 2) + "\n",
);
console.log(`Generated ${names.length} byte-identical named image sources.`);
