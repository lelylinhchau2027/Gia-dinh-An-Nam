import { Ionicons } from "@expo/vector-icons";
import {
  useContext,
  useId,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { BottomTabBarHeightContext } from "expo-router/js-tabs";
import { KeyboardFormContext } from "./FormInput";
import {
  Pressable,
  Keyboard,
  InputAccessoryView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, spacing } from "../theme";
import { validDate } from "../lib/recordValidation";

export function Screen({
  children,
  scroll = true,
  keyboardAccessory = scroll,
  contentStyle,
  safeAreaStyle,
  ...scrollProps
}: PropsWithChildren<
  ScrollViewProps & {
    scroll?: boolean;
    keyboardAccessory?: boolean;
    contentStyle?: ViewStyle;
    safeAreaStyle?: ViewStyle;
  }
>) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const tabHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const scrollRef = useRef<ScrollView>(null);
  const accessoryID = useId();
  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      onFocus={() => {
        // Native insets handle keyboard opening; also reveal a new field when
        // focus moves while the keyboard is already visible.
        if (Platform.OS !== "ios" || !Keyboard.isVisible()) return;
        requestAnimationFrame(() => {
          const input = TextInput.State.currentlyFocusedInput();
          if (input)
            scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
              input,
              16,
              true,
            );
        });
      }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );
  return (
    <KeyboardFormContext.Provider value={accessoryID}>
      <SafeAreaView
        edges={[
          "left",
          "right",
          ...(!headerHeight ? ["top" as const] : []),
          ...(!tabHeight ? ["bottom" as const] : []),
        ]}
        style={[styles.safe, safeAreaStyle]}
      >
        {content}
      </SafeAreaView>
      {Platform.OS === "ios" && keyboardAccessory ? (
        <InputAccessoryView nativeID={accessoryID}>
          <View
            style={{
              backgroundColor: "#F0F1F4",
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: "#CCC",
              alignItems: "flex-end",
            }}
          >
            <Pressable
              testID="keyboard-done"
              accessibilityLabel="Xong, ẩn bàn phím"
              onPress={Keyboard.dismiss}
              style={{
                minHeight: 44,
                paddingHorizontal: 20,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "QuicksandSemiBold",
                  fontSize: 17,
                }}
              >
                Xong
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </KeyboardFormContext.Provider>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Pill({
  label,
  tone = "sage",
}: {
  label: string;
  tone?: "sage" | "amber" | "rose" | "blue";
}) {
  const palette = {
    sage: [colors.sageSoft, colors.sage],
    amber: [colors.amberSoft, colors.amber],
    rose: [colors.primarySoft, colors.primary],
    blue: [colors.blueSoft, colors.blue],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }]}>
      <Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  icon,
  disabled,
  ...props
}: PressableProps & { title: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...props}
    >
      {icon ? <Ionicons name={icon} color={colors.white} size={18} /> : null}
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function LinkButton({
  title,
  ...props
}: PressableProps & { title: string }) {
  return (
    <Pressable {...props} hitSlop={8}>
      <Text style={styles.linkButton}>{title}</Text>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.sage} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function formatClock(iso: string): string {
  const date = validDate(iso);
  if (!date) return "Chưa rõ giờ";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = validDate(iso);
  if (!date) return "Chưa rõ thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  screenContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: 32,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: colors.ink },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "QuicksandSemiBold",
    fontSize: 16,
  },
  linkButton: {
    color: colors.primary,
    fontFamily: "QuicksandSemiBold",
    fontSize: 14,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  empty: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sageSoft,
  },
  emptyTitle: { fontWeight: "800", color: colors.ink, fontSize: 16 },
  emptyBody: { textAlign: "center", color: colors.inkMuted, lineHeight: 20 },
});
