import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useApp } from "../providers/AppProvider";
import { registerFamilyPush } from "../services/familySync";

export function PushRegistration() {
  const { family, currentUserId, syncNow } = useApp();
  const last = useRef(0);
  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !family ||
      family.id.startsWith("family_local")
    )
      return;
    let busy = false,
      alive = true;
    last.current = 0;
    const register = async (force = false) => {
      if (!alive || busy || (!force && Date.now() - last.current < 5 * 60000))
        return;
      busy = true;
      last.current = Date.now();
      try {
        await registerFamilyPush(false);
      } catch {
        /* Exact error is shown by explicit Settings check. */
      } finally {
        busy = false;
      }
    };
    void register();
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void register();
    });
    const token = Notifications.addPushTokenListener(() => {
      void register(true);
    });
    const received = Notifications.addNotificationReceivedListener(() => {
      void syncNow();
    });
    return () => {
      alive = false;
      foreground.remove();
      token.remove();
      received.remove();
    };
  }, [family?.id, currentUserId, syncNow]);
  return null;
}
