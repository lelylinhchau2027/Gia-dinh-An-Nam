import { createContext, useContext } from "react";
import { Platform, TextInput, type TextInputProps } from "react-native";

export const KeyboardFormContext = createContext<string | undefined>(undefined);

// Each Screen owns its toolbar ID, including stacked/modal screens. Numeric
// keyboards need this button because iOS decimal-pad has no Return key.
export function FormInput(props: TextInputProps) {
  const accessoryID = useContext(KeyboardFormContext);
  return (
    <TextInput
      inputAccessoryViewID={Platform.OS === "ios" ? accessoryID : undefined}
      placeholderTextColor="#969BA4"
      {...props}
    />
  );
}
