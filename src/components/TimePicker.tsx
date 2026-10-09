import { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** Selection only: no keyboard, no locale-dependent parsing, all 60 minutes available. */
export function TimePicker({
  value,
  onChange,
  label = "Chọn giờ",
}: {
  value: string;
  onChange: (time: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("07:00");
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={s.input}
        onPress={() => {
          Keyboard.dismiss();
          setDraft(/^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "07:00");
          setOpen(true);
        }}
      >
        <Text style={s.text}>◷　{value || label}　⌄</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.panel}>
            <Text style={s.title}>
              {label} · {draft}
            </Text>
            <View style={s.columns}>
              {[24, 60].map((count, column) => (
                <View key={count} style={{ flex: 1 }}>
                  <Text style={s.title}>{column === 0 ? "Giờ" : "Phút"}</Text>
                  <ScrollView
                    style={{ maxHeight: 240 }}
                    contentContainerStyle={s.grid}
                  >
                    {Array.from({ length: count }, (_, i) =>
                      String(i).padStart(2, "0"),
                    ).map((n) => (
                      <Pressable
                        key={n}
                        accessibilityLabel={`${column === 0 ? "Giờ" : "Phút"} ${n}`}
                        accessibilityState={{
                          selected: draft.split(":")[column] === n,
                        }}
                        style={[
                          s.cell,
                          draft.split(":")[column] === n && s.selected,
                        ]}
                        onPress={() =>
                          setDraft(
                            column === 0
                              ? `${n}:${draft.slice(3)}`
                              : `${draft.slice(0, 2)}:${n}`,
                          )
                        }
                      >
                        <Text style={s.text}>{n}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>
            <View style={s.columns}>
              <Pressable style={s.action} onPress={() => setOpen(false)}>
                <Text style={s.text}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[s.action, s.selected]}
                onPress={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                <Text style={s.text}>Chọn {draft}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  input: {
    padding: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E9E9EF",
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  text: { color: "#7655AE", fontSize: 16, fontFamily: "QuicksandSemiBold" },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 12,
    color: "#303B46",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#0006",
  },
  panel: {
    width: "100%",
    maxWidth: 500,
    padding: 16,
    paddingBottom: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#fff",
  },
  columns: { flexDirection: "row", gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "33.333%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  selected: { backgroundColor: "#E9E2F5" },
  action: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 14,
  },
});
