import { Image, Pressable, Text, View } from "react-native";
import { useState } from "react";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import type { CareEntry } from "../types";
import shapes from "../data/legacy/legacy-teeth-geometry.json";
import images from "../data/legacyImageSources.json";

export function TeethDiagram({
  records,
  onSelect,
  selected,
}: {
  records: CareEntry[];
  onSelect: (tooth: string, existing?: CareEntry) => void;
  selected?: string;
}) {
  const [width, setWidth] = useState(300);
  const scale = Math.min(width, 300) / 300;
  const canvas = 300 * scale;
  const height = 362 * scale + 16;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ width: "100%", alignItems: "center" }}
    >
      <View style={{ width: canvas, height }}>
        <Image
          source={images.upper_gum}
          resizeMode="stretch"
          style={{ width: canvas, height: 181 * scale }}
        />
        <Image
          source={images.lower_gum}
          resizeMode="stretch"
          style={{ width: canvas, height: 181 * scale, marginTop: 16 }}
        />
        {(["Trên", "Dưới"] as const).flatMap((jaw) =>
          (["Phải", "Trái"] as const).flatMap((side) =>
            shapes.map((shape, position) => {
              // Persist the 0.3 positional key unchanged; only the displayed eruption
              // number changes to the original app's 1–10 labels.
              const tooth = `${jaw} · ${side} ${position + 1}`;
              const entry = records.find((e) => e.details?.tooth === tooth);
              const lower = jaw === "Dưới";
              const mirror = side === "Trái";
              const [, , vw, vh] = shape.viewBox.split(" ").map(Number);
              const transform = `translate(${mirror ? vw : 0}, ${lower ? vh : 0}) scale(${mirror ? -1 : 1}, ${lower ? -1 : 1})`;
              const order = shape.orders[lower ? 1 : 0];
              return (
                <Pressable
                  key={tooth}
                  accessibilityRole="button"
                  accessibilityLabel={`${tooth}, răng số ${order}${entry ? ", đã mọc" : ", chưa ghi"}`}
                  hitSlop={4}
                  onPress={() => onSelect(tooth, entry)}
                  style={{
                    position: "absolute",
                    left: (mirror ? shape.x2 : shape.x1) * scale,
                    top: lower
                      ? height - (shape.y + shape.height) * scale
                      : shape.y * scale,
                    width: shape.width * scale,
                    height: shape.height * scale,
                  }}
                >
                  <Svg width="100%" height="100%" viewBox={shape.viewBox}>
                    <G transform={transform}>
                      <Path
                        d={shape.path.d}
                        fill={entry ? "#fff" : "none"}
                        stroke={selected === tooth ? "#A03854" : "#fff"}
                        strokeWidth={selected === tooth ? 3 : 2}
                      />
                    </G>
                    <SvgText
                      x={vw! / 2}
                      y={vh! / 2 + 5}
                      textAnchor="middle"
                      fontFamily="QuicksandSemiBold"
                      fontSize={15}
                      fill={entry ? "#FC7373" : "#fff"}
                    >
                      {order}
                    </SvgText>
                  </Svg>
                </Pressable>
              );
            }),
          ),
        )}
      </View>
      <Text
        style={{
          color: "#858A91",
          fontFamily: "Quicksand",
          textAlign: "center",
          lineHeight: 20,
          marginTop: 16,
        }}
      >
        Răng trắng: đã ghi ngày mọc. Chạm vào răng để thêm hoặc sửa.
      </Text>
    </View>
  );
}
