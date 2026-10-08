import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { CareKind } from '../types';
import { colors } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const careMeta: Record<
  CareKind,
  { label: string; icon: IconName; color: string; soft: string; defaultUnit?: string }
> = {
  milk: {
    label: 'Sữa',
    icon: 'water-outline',
    color: colors.blue,
    soft: colors.blueSoft,
    defaultUnit: 'ml',
  },
  sleep: {
    label: 'Ngủ',
    icon: 'moon-outline',
    color: colors.lavender,
    soft: colors.lavenderSoft,
    defaultUnit: 'phút',
  },
  diaper: {
    label: 'Thay bỉm',
    icon: 'happy-outline',
    color: colors.amber,
    soft: colors.amberSoft,
  },
  weaning: {
    label: 'Ăn dặm',
    icon: 'restaurant-outline',
    color: colors.sage,
    soft: colors.sageSoft,
    defaultUnit: 'ml',
  },
  temperature: {
    label: 'Nhiệt độ',
    icon: 'thermometer-outline',
    color: colors.primary,
    soft: colors.primarySoft,
    defaultUnit: '°C',
  },
  medicine: {
    label: 'Uống thuốc',
    icon: 'medkit-outline',
    color: colors.primary,
    soft: colors.primarySoft,
  },
  activity: {
    label: 'Hoạt động',
    icon: 'sunny-outline',
    color: colors.amber,
    soft: colors.amberSoft,
  },
  growth: {
    label: 'Tăng trưởng',
    icon: 'trending-up-outline',
    color: colors.sage,
    soft: colors.sageSoft,
    defaultUnit: 'kg',
  },
};

export const quickCareKinds: CareKind[] = [
  'milk',
  'sleep',
  'diaper',
  'weaning',
  'temperature',
  'medicine',
];

