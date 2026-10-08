import { FontAwesome5 } from "@expo/vector-icons";
import { Image, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { AssistantTool } from "../data/assistant";

export function AssistantIcon({
  tool,
  size = 54,
}: {
  tool: AssistantTool;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{ position: "absolute" }}
      >
        <Path
          d="M100,0C190,0 200,44.772 200,100S190,200 100,200 0,155.228 0,100 10,0 100,0Z"
          fill={`${tool.color}33`}
        />
      </Svg>
      {tool.id === "teeth" ? (
        <FontAwesome5 name="tooth" solid color={tool.color} size={size * 0.5} />
      ) : tool.image ? (
        <Image
          source={tool.image}
          style={{ width: size * 0.52, height: size * 0.52 }}
          resizeMode="contain"
        />
      ) : (
        <FontAwesome5
          name={
            tool.symbol === "calendar-outline"
              ? "calendar-day"
              : tool.symbol === "newspaper-outline"
                ? "newspaper"
                : "list-ul"
          }
          solid
          color={tool.color}
          size={size * 0.5}
        />
      )}
    </View>
  );
}
