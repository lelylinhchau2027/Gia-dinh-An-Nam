import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import type { CareEntry } from "../types";

export function GrowthChart({
  entries,
  metric,
  unit,
}: {
  entries: CareEntry[];
  metric: string;
  unit: string;
}) {
  const points = entries
    .filter(
      (e) =>
        e.kind === "growth" &&
        e.amount !== null &&
        e.unit === unit &&
        (e.details?.metric ??
          (e.unit === "kg" ? "Cân nặng" : "Chiều dài / chiều cao")) === metric,
    )
    .slice(0, 12)
    .reverse();
  const max = Math.max(1, ...points.map((p) => p.amount ?? 0)) * 1.1;
  const firstTime = points[0] ? Date.parse(points[0].occurred_at) : 0;
  const lastTime = points.length
    ? Date.parse(points[points.length - 1]!.occurred_at)
    : 0;
  const coords = points.map((p) => ({
    x:
      lastTime === firstTime
        ? 186
        : 40 +
          ((Date.parse(p.occurred_at) - firstTime) / (lastTime - firstTime)) *
            292,
    y: 184 - ((p.amount ?? 0) / max) * 156,
    p,
  }));
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          fontFamily: "QuicksandSemiBold",
          fontSize: 19,
          color: "#303B46",
        }}
      >
        {metric}
      </Text>
      {!points.length ? (
        <View
          style={{
            minHeight: 120,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#FAFAFC",
          }}
        >
          <Text style={{ fontFamily: "Quicksand", color: "#92929C" }}>
            Chưa có số đo {metric.toLowerCase()}
          </Text>
        </View>
      ) : (
        <Svg
          width="100%"
          height={224}
          viewBox="0 0 350 224"
          accessibilityLabel={`Biểu đồ ${metric}, ${points.length} số đo gần nhất`}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <ViewGrid
              key={i}
              y={184 - i * 39}
              label={((max * i) / 4).toFixed(1)}
            />
          ))}
          <SvgText x={4} y={16} fill="#82828E" fontSize={11}>
            {unit}
          </SvgText>
          <Polyline
            points={coords.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke="#8E70CA"
            strokeWidth={2}
            fill="none"
          />
          {coords.map(({ x, y, p }) => (
            <Circle key={p.id} cx={x} cy={y} r={4} fill="#8E70CA" />
          ))}
          {coords
            .filter((_, i) => i === 0 || i === coords.length - 1)
            .map(({ x, p }, i) => (
              <SvgText
                key={p.id}
                x={x}
                y={207}
                textAnchor={i === 0 && coords.length > 1 ? "start" : "end"}
                fontSize={11}
                fill="#82828E"
              >
                {new Date(p.occurred_at).toLocaleDateString("vi-VN")}
              </SvgText>
            ))}
        </Svg>
      )}
      <Text style={{ color: "#8B8E95", fontSize: 12 }}>
        Số đo thực tế · Chưa đối chiếu đường chuẩn tăng trưởng
      </Text>
    </View>
  );
}
function ViewGrid({ y, label }: { y: number; label: string }) {
  return (
    <>
      <Line x1={38} x2={334} y1={y} y2={y} stroke="#E8E8EC" />
      <SvgText x={32} y={y + 4} textAnchor="end" fontSize={11} fill="#82828E">
        {label}
      </SvgText>
    </>
  );
}
