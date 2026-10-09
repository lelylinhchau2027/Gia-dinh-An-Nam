import { Text, type TextProps } from "react-native";
import { colors } from "../theme";

/** Comfortable reading size for reminder details, status and notification setup. */
export function FamilyText({ style, ...props }: TextProps) {
  return <Text {...props} style={[{
    fontFamily: "Quicksand", fontSize: 15, lineHeight: 23,
    color: colors.ink, marginVertical: 3,
  }, style]} />;
}
