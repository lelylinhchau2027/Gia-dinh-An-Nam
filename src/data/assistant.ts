import type { ImageSourcePropType } from "react-native";
import type { CareKind } from "../types";

export type AssistantTool = {
  id: string;
  title: string;
  color: string;
  image?: ImageSourcePropType;
  symbol?: "calendar-outline" | "list-outline" | "newspaper-outline";
  route?: string;
  section?: string;
  kind?: CareKind;
  unit?: string;
  choices?: Record<string, string[]>;
  fields?: Record<string, string>;
  presets?: number[];
  numeric?: boolean;
  hint?: string;
};
// Order and colors checked against ChildToolButtonModelFn / MeasurementTypeFn
// in the user-provided 1.2.21 IPA. Community-only item intentionally excluded.
export const assistantTools: AssistantTool[] = [
  {
    id: "vaccines",
    title: "Lịch tiêm phòng",
    color: "#8616B7",
    symbol: "calendar-outline",
    route: "/child/vaccinations",
  },
  {
    id: "injections",
    title: "Các mũi tiêm",
    color: "#F0AF4C",
    image: require("../../assets/legacy/ic_needle.png"),
    kind: "activity",
    route: "/child/vaccinations",
    section: "injections",
    fields: { vaccine: "Tên vắc-xin", dose: "Mũi số", clinic: "Nơi tiêm" },
    hint: "Ghi lại mũi đã tiêm theo sổ tiêm. Không dùng lịch tham khảo để tự quyết định tiêm.",
  },
  {
    id: "family",
    title: "Việc của bố mẹ",
    color: "#6AB6D4",
    image: require("../../assets/legacy/ic_baby.png"),
    route: "/gia-dinh",
  },
  {
    id: "statistics",
    title: "Thống kê năm",
    color: "#FC6157",
    image: require("../../assets/legacy/emoji_1.png"),
    route: "/child/statistics",
  },
  {
    id: "growth",
    title: "Chiều cao, cân nặng",
    color: "#67ACC7",
    image: require("../../assets/legacy/scale-2x.png"),
    route: "/child/measure",
  },
  {
    id: "weekly",
    title: "Bé theo tuần",
    color: "#248FB9",
    symbol: "newspaper-outline",
    route: "/child/weeks",
  },
  {
    id: "easy",
    title: "Lịch E.A.S.Y.",
    color: "#7759E0",
    image: require("../../assets/legacy/ic_easy_routine.png"),
    route: "/lich",
    section: "easy",
  },
  {
    id: "milestones",
    title: "Huy chương của bé",
    color: "#EAC250",
    image: require("../../assets/legacy/ic_medal.or8.png"),
    kind: "activity",
    choices: {
      category: ["Vận động", "Tay", "Mắt – nhận thức", "Ngôn ngữ", "Tương tác"],
      milestone: [
        "Nâng đầu",
        "Lẫy",
        "Ngồi",
        "Bò",
        "Đứng",
        "Bước đầu tiên",
        "Tiếng nói đầu tiên",
        "Mốc khác",
      ],
    },
    fields: { achievement: "Điều con đã làm được" },
    hint: "Lưu kỷ niệm của riêng con; đây không phải bảng đánh giá phát triển.",
  },
  {
    id: "today",
    title: "Hoạt động trong ngày",
    color: "#EAC250",
    symbol: "list-outline",
    route: "/theo-doi",
  },
  {
    id: "feeling",
    title: "Cảm xúc",
    color: "#F7B64F",
    image: require("../../assets/legacy/ic_activity_felling.png"),
    kind: "activity",
    choices: { feeling: ["Rất vui", "Vui", "Bình thường", "Khó chịu", "Khóc"] },
  },
  {
    id: "milk",
    title: "Lượng sữa",
    color: "#349DEE",
    image: require("../../assets/legacy/ic_activity_milk.png"),
    kind: "milk",
    unit: "ml",
    presets: [30, 60, 90, 120, 150, 180],
  },
  {
    id: "pump",
    title: "Hút sữa",
    color: "#FC77B4",
    image: require("../../assets/legacy/ic_activity_breast_pump.png"),
    kind: "milk",
    unit: "ml",
    presets: [30, 60, 90, 120, 150, 180],
    choices: { side: ["Bên trái", "Bên phải", "Cả hai"] },
  },
  {
    id: "sleep",
    title: "Thời gian ngủ",
    color: "#FFD365",
    image: require("../../assets/legacy/ic_activity_sleep.png"),
    kind: "sleep",
    unit: "phút",
    presets: [15, 30, 45, 60, 90, 120],
  },
  {
    id: "diaper",
    title: "Thay bỉm",
    color: "#39D9AE",
    image: require("../../assets/legacy/ic_activity_diaper.png"),
    kind: "diaper",
  },
  {
    id: "weaning",
    title: "Ăn dặm",
    color: "#FF9D7E",
    image: require("../../assets/legacy/ic_activity_weaning.png"),
    kind: "weaning",
    unit: "g",
    presets: [10, 30, 50, 80, 100],
    fields: { food: "Món ăn" },
    choices: { liking: ["Rất thích", "Thích", "Bình thường", "Không thích"] },
  },
  {
    id: "activity",
    title: "Hoạt động",
    color: "#DA7D53",
    image: require("../../assets/legacy/ic_activity_activity.png"),
    kind: "activity",
    choices: {
      activity: ["Chơi", "Tắm", "Đi dạo", "Đọc sách", "Vận động", "Khác"],
    },
  },
  {
    id: "teeth",
    title: "Mọc răng",
    color: "#FDC02F",
    image: require("../../assets/legacy/cute_tooth.png"),
    kind: "activity",
    hint: "Chọn răng và lưu ngày mọc thực tế của con; không suy ra chẩn đoán từ thời điểm mọc.",
  },
  {
    id: "pregnancy",
    title: "Lịch khám thai",
    color: "#8616B7",
    symbol: "calendar-outline",
    route: "/lich",
    section: "pregnancy",
  },
  {
    id: "kick",
    title: "Đếm cú đạp",
    color: "#2B82FF",
    image: require("../../assets/legacy/ic_footprint.png"),
    kind: "activity",
    unit: "lần",
    numeric: true,
    hint: "Ghi nhận cử động theo hướng dẫn của người theo dõi thai kỳ. Bộ đếm không đánh giá sức khỏe thai.",
  },
  {
    id: "fetal",
    title: "Số đo thai nhi",
    color: "#67ACC7",
    image: require("../../assets/legacy/scale-2x.png"),
    kind: "activity",
    numeric: true,
    unit: "g",
    choices: {
      metric: [
        "Cân nặng thai (g)",
        "Chiều dài thai (cm)",
        "Vòng đầu thai (cm)",
      ],
    },
    hint: "Nhập số đo từ kết quả khám, không tự ước tính.",
  },
  {
    id: "mom",
    title: "Cân nặng của mẹ",
    color: "#FC77B4",
    image: require("../../assets/legacy/ic_mom_weight_scale.png"),
    kind: "activity",
    numeric: true,
    unit: "kg",
  },
  {
    id: "doctor",
    title: "Khám bệnh",
    color: "#67ACC7",
    image: require("../../assets/legacy/ic_activity_doctor.png"),
    kind: "activity",
    fields: {
      clinic: "Cơ sở khám",
      reason: "Lý do khám",
      instructions: "Lời dặn của bác sĩ",
    },
  },
  {
    id: "temperature",
    title: "Nhiệt độ",
    color: "#FC636B",
    image: require("../../assets/legacy/ic_activity_temperature.png"),
    kind: "temperature",
    unit: "°C",
    presets: [36.5, 37, 37.5, 38],
  },
  {
    id: "medicine",
    title: "Uống thuốc",
    color: "#9AD886",
    image: require("../../assets/legacy/ic_activity_medicine.png"),
    kind: "medicine",
    fields: { medicine: "Tên thuốc" },
    hint: "Chỉ ghi liều đã dùng theo chỉ định; app không đề xuất liều thuốc.",
  },
];
export const bornTools = assistantTools.slice(0, 17);
export const pregnancyTools = [
  "pregnancy",
  "statistics",
  "fetal",
  "weekly",
  "kick",
  "mom",
  "doctor",
].map((id) => assistantTools.find((t) => t.id === id)!);
export function findAssistantTool(id?: string) {
  return assistantTools.find((t) => t.id === id);
}
export function entryToolId(entry: {
  kind: CareKind;
  details?: Record<string, string>;
}) {
  return entry.kind === "milk" && entry.details?.feeding === "Hút sữa"
    ? "pump"
    : (entry.details?.tool ?? entry.kind);
}
