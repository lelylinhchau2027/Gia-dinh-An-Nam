import { StyleSheet } from "react-native";
import { colors } from "../theme";
export const formStyles = StyleSheet.create({
  gap: { gap: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    fontFamily: "Quicksand",
    padding: 14,
    minHeight: 50,
    color: colors.ink,
    fontSize: 16,
  },
  label: { color: colors.ink, fontFamily: "QuicksandSemiBold", fontSize: 15 },
  title: { color: colors.ink, fontWeight: "900", fontSize: 24 },
  body: {
    color: colors.ink,
    fontFamily: "Quicksand",
    fontSize: 16,
    lineHeight: 24,
  },
  hint: {
    color: colors.inkMuted,
    fontFamily: "Quicksand",
    fontSize: 13,
    lineHeight: 20,
  },
  error: { color: colors.primary, fontSize: 14, lineHeight: 22 },
  comment: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  chip: { padding: 12, borderRadius: 20, backgroundColor: colors.surfaceMuted },
  activeChip: { backgroundColor: colors.primarySoft },
});
