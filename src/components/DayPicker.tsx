import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function DayPicker({
  value,
  onChange,
  allowFuture = false,
}: {
  value: string;
  onChange: (day: string) => void;
  allowFuture?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (start.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = localDay(new Date());
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chọn ngày"
        onPress={() => {
          setMonth(new Date(`${value}T12:00:00`));
          setOpen(true);
        }}
        style={s.input}
      >
        <Text style={s.text}>▦　{value.split("-").reverse().join("/")}　⌄</Text>
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.panel}>
            <View style={s.row}>
              <Pressable
                style={s.button}
                accessibilityLabel="Tháng trước"
                onPress={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <Text style={s.text}>‹</Text>
              </Pressable>
              <Text style={s.text}>
                Tháng {month.getMonth() + 1}/{month.getFullYear()}
              </Text>
              <Pressable
                style={s.button}
                accessibilityLabel="Tháng sau"
                onPress={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <Text style={s.text}>›</Text>
              </Pressable>
            </View>
            <View style={s.grid}>
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <Text key={d} style={s.weekday}>
                  {d}
                </Text>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <View key={`blank${i}`} style={s.day} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = localDay(
                  new Date(month.getFullYear(), month.getMonth(), i + 1),
                );
                const disabled = !allowFuture && day > today;
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityLabel={day}
                    disabled={disabled}
                    onPress={() => {
                      onChange(day);
                      setOpen(false);
                    }}
                    style={[
                      s.day,
                      value === day && {
                        backgroundColor: "#E9E2F5",
                        borderRadius: 22,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: disabled
                          ? "#DDD"
                          : value === day
                            ? "#8E70CA"
                            : "#303B46",
                        fontFamily: "QuicksandSemiBold",
                        fontSize: 16,
                      }}
                    >
                      {i + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.row}>
              <Pressable
                style={s.button}
                onPress={() => {
                  onChange(today);
                  setOpen(false);
                }}
              >
                <Text style={s.text}>Hôm nay</Text>
              </Pressable>
              <Pressable style={s.button} onPress={() => setOpen(false)}>
                <Text style={s.text}>Đóng</Text>
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
    borderWidth: 1,
    borderColor: "#E9E9EF",
    borderRadius: 9,
    padding: 14,
    minHeight: 50,
    backgroundColor: "#fff",
  },
  text: { fontFamily: "QuicksandSemiBold", fontSize: 16, color: "#8E70CA" },
  overlay: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 450,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 12,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    minWidth: 44,
    minHeight: 44,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    paddingVertical: 12,
    fontFamily: "QuicksandSemiBold",
    color: "#92929C",
  },
  day: {
    width: "14.2857%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
