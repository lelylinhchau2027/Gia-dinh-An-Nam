import { Pressable, Text, View } from "react-native";
import { useState } from 'react';
import Svg, { Path } from "react-native-svg";
import type { CareEntry } from "../types";

export function TeethDiagram({
  records,
  onSelect,
}: {
  records: CareEntry[];
  onSelect: (tooth: string, existing?: CareEntry) => void;
}) {
  const [width, setWidth] = useState(300);
  const scale = width / 360;
  const toothSize = Math.min(44, width / 8);
  const half = [
    [148, 45],
    [100, 65],
    [65, 100],
    [44, 145],
    [40, 194],
  ];
  return (
    <View>
      <Text
        style={{ color: "#858A91", textAlign: "center", marginVertical: 12 }}
      >
        Chạm vào răng để ghi ngày mọc hoặc sửa. Trái/phải theo phía của bé.
      </Text>
        <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', height: 470 * scale }}>
          <Svg
            width={width}
            height={470 * scale}
            viewBox="0 0 360 470"
            style={{ position: "absolute" }}
          >
            <Path
              d="M15 218 C-5 65 89 9 180 9 C271 9 365 65 345 218 Q326 242 286 217 C291 110 243 61 180 61 C117 61 69 110 74 217 Q34 242 15 218Z"
              fill="#FF8B91"
            />
            <Path
              d="M74 217 C69 110 117 61 180 61 C243 61 291 110 286 217 Q237 184 195 204 Q180 249 165 204 Q116 186 74 217Z"
              fill="#FF626B"
            />
            <Path
              d="M15 252 C-5 405 89 461 180 461 C271 461 365 405 345 252 Q326 228 286 253 C291 360 243 409 180 409 C117 409 69 360 74 253 Q34 228 15 252Z"
              fill="#FF8B91"
            />
            <Path
              d="M74 253 Q180 296 286 253 C291 360 243 409 180 409 C117 409 69 360 74 253Z"
              fill="#FF626B"
            />
          </Svg>
          {(["Trên", "Dưới"] as const).flatMap((jaw) =>
            (["Phải", "Trái"] as const).flatMap((side) =>
              half.map(([x, y], i) => {
                const tooth = `${jaw} · ${side} ${i + 1}`;
                const existing = records.find(
                  (e) => e.details?.tooth === tooth,
                );
                return (
                  <Pressable
                    key={tooth}
                    accessibilityRole="button"
                    accessibilityLabel={`${tooth}${existing ? ", đã mọc, sửa ngày" : ", ghi ngày mọc"}`}
                    onPress={() => onSelect(tooth, existing)}
                    style={{
                      position: "absolute",
                      left: (side === "Phải" ? x! : 360 - x!) * scale - toothSize / 2,
                      top: (jaw === "Trên" ? y! : 470 - y!) * scale - toothSize / 2,
                      width: toothSize,
                      height: toothSize,
                      borderRadius: 15,
                      borderWidth: 2,
                      borderColor: "#fff",
                      backgroundColor: existing ? "#FFFFFF" : "#FF939A",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: existing ? "#8E70CA" : "#FFF",
                        fontFamily: "QuicksandSemiBold",
                        fontSize: 22,
                      }}
                    >
                      {i + 1}
                    </Text>
                  </Pressable>
                );
              }),
            ),
          )}
        </View>
      <Text style={{ textAlign: "center", color: "#858A91", marginTop: 12 }}>
        Răng trắng: đã ghi ngày mọc · Răng hồng: chưa ghi
      </Text>
    </View>
  );
}
