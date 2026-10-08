import easyJson from './legacy/legacy-easy-common-templates.json';
import pregnancyJson from './legacy/legacy-pregnancy-examinations.json';
import taxonomiesJson from './legacy/legacy-care-taxonomies.json';
import vaccinationJson from './legacy/legacy-vaccination-schedule.json';
import wonderWeeksJson from './legacy/legacy-wonder-weeks.json';
import growthJson from './legacy/legacy-growth-standards.json';
import currentRotaJson from './current/vietnam-tcmr-2026.json';
import type { EasyTemplate, LegacyReferenceItem } from '../types';

export const legacyVaccinations = vaccinationJson as LegacyReferenceItem[];
export const legacyPregnancyExaminations = pregnancyJson as LegacyReferenceItem[];
export const easyTemplates = easyJson as EasyTemplate[];
export const careTaxonomies = taxonomiesJson;
export const legacyWonderWeeks = wonderWeeksJson;
export const legacyGrowthStandards = growthJson;

type CurrentVaccinationDataset = {
  datasetId: string;
  title: string;
  effectiveFrom: string;
  reviewedAt: string;
  sourceName: string;
  sourceUrl: string;
  replacesLegacyGroup: string;
  items: LegacyReferenceItem[];
};

export const verifiedVaccinationDatasets = [
  currentRotaJson as CurrentVaccinationDataset,
];

const vaccinationOverrides = new Map(
  verifiedVaccinationDatasets.map((dataset) => [
    dataset.replacesLegacyGroup,
    dataset.items,
  ]),
);

export const activeVaccinations = (() => {
  const insertedOverrides = new Set<string>();
  const merged = legacyVaccinations.flatMap((item) => {
    const groupName = item.shortTitle || item.title.replace(/\n/g, ' ');
    const replacement = vaccinationOverrides.get(groupName);
    if (!replacement) return [item];
    if (insertedOverrides.has(groupName)) return [];
    insertedOverrides.add(groupName);
    return replacement;
  });
  for (const [groupName, replacement] of vaccinationOverrides) {
    if (!insertedOverrides.has(groupName)) merged.push(...replacement);
  }
  return merged;
})();

export const referenceRelease = {
  id: 'an-nam-reference-2026-10-08',
  label: 'Bản kết hợp: dữ liệu gốc + phần đã kiểm chứng',
  capturedAt: '2026-10-08',
  sourceUpdatedAt: '2022-07-27',
  reviewState: 'partial-review' as const,
  warning:
    'Nhóm Rota đã được thay bằng lịch TCMR 2026. Các nhóm còn lại vẫn là dữ liệu gốc đang chờ kiểm chứng; luôn xác nhận lịch cá nhân tại cơ sở tiêm chủng.',
};

export const vaccineGroups = Array.from(
  activeVaccinations.reduce((groups, item) => {
    const label = item.shortTitle || item.title.replace(/\n/g, ' ');
    const current = groups.get(label) ?? [];
    current.push(item);
    groups.set(label, current);
    return groups;
  }, new Map<string, LegacyReferenceItem[]>()),
).map(([name, milestones]) => ({ name, milestones }));

export function formatLegacyRange(item: LegacyReferenceItem): string {
  if (item.displayValue) return item.displayValue;
  if (item.valueFrom === item.valueTo) {
    return item.conditionType === 'age_in_weeks'
      ? `Tuần ${item.valueFrom}`
      : `${item.valueFrom} tháng`;
  }
  const unit = item.conditionType === 'age_in_weeks' ? 'tuần' : 'tháng';
  return `${item.valueFrom}–${item.valueTo} ${unit}`;
}

export function formatEasyTime(value: number | null): string {
  if (value === null) return '';
  const hour = Math.floor(value);
  const minute = Math.round((value - hour) * 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export const easyTypeLabels: Record<string, string> = {
  E: 'Ăn',
  A: 'Hoạt động',
  S: 'Ngủ',
  Y: 'Thời gian của bố mẹ',
  NONE: 'Mốc sinh hoạt',
};
