// Public reference metadata only. No child/user IDs, credentials or community data.
const fs = require("node:fs");
const path = require("node:path");
const endpoint = "https://api.becuame.com";
async function query(query, variables = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.errors)
    throw new Error(result.errors.map((e) => e.message).join("; "));
  return result.data;
}
async function main() {
  const { findGroupListByParentIdAndType: groups } = await query(
    "query { findGroupListByParentIdAndType(type: baby_can_do) { id name totalMedalCount } }",
  );
  const expected = new Map([
    ["20", 17],
    ["21", 13],
    ["22", 8],
    ["23", 13],
    ["24", 13],
  ]);
  if (
    !Array.isArray(groups) ||
    groups.length !== expected.size ||
    new Set(groups.map((g) => g.id)).size !== expected.size ||
    groups.some((g) => g.totalMedalCount !== expected.get(g.id))
  )
    throw new Error("Unexpected group count; review before replacing snapshot");
  groups.sort((a, b) => Number(a.id) - Number(b.id));
  const ids = new Set();
  for (const group of groups) {
    const data = await query(
      "query ($id: ID!) { findAutomatedNotificationListByGroupId(groupId: $id, all: true) { id title shortTitle description } }",
      { id: group.id },
    );
    group.items = data.findAutomatedNotificationListByGroupId;
    if (
      !Array.isArray(group.items) ||
      group.items.length !== group.totalMedalCount
    )
      throw new Error(`Count differs for group ${group.id}`);
    for (const item of group.items) {
      if (
        !item.id ||
        ids.has(item.id) ||
        typeof item.title !== "string" ||
        !item.title.trim()
      )
        throw new Error(
          `Invalid or duplicate medal in group ${group.id}; snapshot unchanged`,
        );
      ids.add(item.id);
    }
  }
  const snapshot = {
    source: endpoint,
    capturedAt: new Date().toISOString(),
    reviewState: "legacy-unverified",
    groups,
  };
  const root = path.resolve(__dirname, "..");
  const target = "src/data/legacy/legacy-medals.json";
  // Only replace after every group has been fetched and validated.
  fs.writeFileSync(
    path.join(root, target),
    JSON.stringify(snapshot, null, 2) + "\n",
  );
  console.log(
    `Saved ${groups.length} public groups, ${groups.reduce((n, g) => n + g.items.length, 0)} reference medals. No personal data requested.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
