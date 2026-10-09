import { Redirect } from "expo-router";
// Old notification links open reminders; historical chat rows are retained.
export default function LegacyChatRoute() {
  return <Redirect href="/gia-dinh" />;
}
