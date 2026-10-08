import snapshot from "./legacy/legacy-medals.json";
import images from "./legacyImageSources.json";
import type { CareEntry } from "../types";

const visuals = [
  {
    id: "20",
    category: "Vận động",
    image: images["ic_medal_crawling.or8"],
    color: "#AA4D53",
  },
  {
    id: "21",
    category: "Tay",
    image: images["ic_medal_hand.or8"],
    color: "#88994E",
  },
  {
    id: "22",
    category: "Mắt – nhận thức",
    image: images["ic_medal_eye.or8"],
    color: "#78678F",
  },
  {
    id: "23",
    category: "Ngôn ngữ",
    image: images["ic_medal_talk.or8"],
    color: "#5485A6",
  },
  {
    id: "24",
    category: "Tương tác",
    image: images["ic_medal_interactive.or8"],
    color: "#AE9659",
  },
];
export const medalGroups = snapshot.groups.map((group) => ({
  ...group,
  ...visuals.find((visual) => visual.id === group.id)!,
}));
export function completedMedalIds(history: CareEntry[]) {
  const valid = new Set(
    medalGroups.flatMap((g) => g.items.map((item) => item.id)),
  );
  return new Set(
    history
      .filter(
        (e) =>
          e.details?.tool === "milestones" &&
          e.details.medalId &&
          valid.has(e.details.medalId),
      )
      .map((e) => e.details!.medalId!),
  );
}
