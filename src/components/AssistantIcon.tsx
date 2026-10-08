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
      {tool.symbol === "calendar-outline" ? (
        <Svg width={size * 0.5} height={size * 0.57} viewBox="0 0 448 512">
          <Path
            fill={tool.color}
            d="M448 112v80H0v-80a48 48 0 0 1 48-48h48v48a16 16 0 0 0 16 16h32a16 16 0 0 0 16-16V64h128v48a16 16 0 0 0 16 16h32a16 16 0 0 0 16-16V64h48a48 48 0 0 1 48 48z"
          />
          <Path
            fill={tool.color}
            opacity={0.4}
            d="M0 192v272a48 48 0 0 0 48 48h352a48 48 0 0 0 48-48V192zm192 176a16 16 0 0 1-16 16H80a16 16 0 0 1-16-16v-96a16 16 0 0 1 16-16h96a16 16 0 0 1 16 16zm112-240h32a16 16 0 0 0 16-16V16a16 16 0 0 0-16-16h-32a16 16 0 0 0-16 16v96a16 16 0 0 0 16 16zm-192 0h32a16 16 0 0 0 16-16V16a16 16 0 0 0-16-16h-32a16 16 0 0 0-16 16v96a16 16 0 0 0 16 16z"
          />
        </Svg>
      ) : tool.id === "teeth" ? (
        <FontAwesome5 name="tooth" solid color={tool.color} size={size * 0.5} />
      ) : tool.image ? (
        <Image
          key={tool.id}
          source={tool.image}
          style={{ width: size * 0.52, height: size * 0.52 }}
          resizeMode="contain"
        />
      ) : (
        <FontAwesome5
          name={tool.symbol === "newspaper-outline" ? "newspaper" : "list-ul"}
          solid
          color={tool.color}
          size={size * 0.5}
        />
      )}
    </View>
  );
}
