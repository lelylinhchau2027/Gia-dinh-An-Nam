import { FormInput as TextInput } from "../src/components/FormInput";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card, LinkButton, PrimaryButton, Screen } from "../src/components/ui";
import { formStyles as s } from "../src/components/forms";
import { supabase } from "../src/lib/supabase";
import { currentUser } from "../src/services/familySync";
import { useApp } from "../src/providers/AppProvider";
import type { User } from "@supabase/supabase-js";

export default function AccountScreen() {
  const { family, syncNow, pendingSyncCount } = useApp();
  const db = useSQLiteContext();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"link" | "restore">("link");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState<
    Array<{ user_id: string; display_name: string }>
  >([]);
  const paired = !!family && !family.id.startsWith("family_local");
  const load = async () => {
    if (!supabase) return;
    const u = await currentUser();
    setUser(u);
    if (family && paired) {
      const { data, error } = await supabase
        .from("family_members")
        .select("user_id, display_name")
        .eq("family_id", family.id);
      if (error) throw error;
      setMembers(data ?? []);
    }
  };
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, [family?.id]);
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Không thực hiện được. Hãy thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  const send = () =>
    perform(async () => {
      if (!supabase) throw new Error("Chưa kết nối dịch vụ gia đình.");
      const address = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
        throw new Error("Email chưa hợp lệ.");
      if (mode === "restore") {
        if (paired || pendingSyncCount > 0)
          throw new Error(
            "Máy đang có gia đình hoặc dữ liệu chưa đồng bộ. Hãy liên kết email cho tài khoản hiện tại trước.",
          );
        const { error } = await supabase.auth.signInWithOtp({
          email: address,
          options: { shouldCreateUser: false },
        });
        if (error) throw error;
      } else {
        const before = await currentUser();
        if (!before.is_anonymous) throw new Error("Tài khoản đã có email.");
        const { error } = await supabase.auth.updateUser({ email: address });
        if (error) throw error;
      }
      setSentTo(address);
      setMessage("Đã gửi yêu cầu. Nhập mã xác nhận trong email.");
    });
  const verify = () =>
    perform(async () => {
      if (!supabase) return;
      if (mode === "restore" && (paired || pendingSyncCount > 0))
        throw new Error("Hãy đồng bộ dữ liệu hiện tại trước khi khôi phục.");
      const { data, error } = await supabase.auth.verifyOtp({
        email: sentTo,
        token: code.trim(),
        type: mode === "link" ? "email_change" : "email",
      });
      if (error) throw error;
      if (mode === "link" && data.user?.id !== user?.id)
        throw new Error("Danh tính xác nhận không khớp.");
      await syncNow();
      await load();
      setSentTo("");
      setCode("");
      setMessage(
        "Email đã được xác nhận. Dùng email này để đăng nhập trên máy mới.",
      );
    });
  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Tài khoản & gia đình</Text>
      <Card style={s.gap}>
        <Text style={s.label}>
          {user?.email && !user.is_anonymous
            ? user.email
            : "Tài khoản trên điện thoại này"}
        </Text>
        <Text style={s.body}>
          {user?.is_anonymous
            ? "Liên kết email để giữ nguyên hồ sơ và khôi phục khi đổi máy."
            : "Bạn có thể nhận mã đăng nhập bằng email này khi cài lại ứng dụng."}
        </Text>
      </Card>
      {user?.is_anonymous ? (
        <Card style={s.gap}>
          {!paired && !sentTo ? (
            <View style={s.row}>
              <LinkButton
                title="Liên kết email"
                onPress={() => setMode("link")}
              />
              <LinkButton
                title="Khôi phục tài khoản cũ"
                onPress={() => setMode("restore")}
              />
            </View>
          ) : null}
          <Text style={s.label}>
            {mode === "link"
              ? "Giữ dữ liệu bằng email"
              : "Đăng nhập lại tài khoản đã liên kết"}
          </Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            editable={!busy && !sentTo}
            placeholder="Email của bạn"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {sentTo ? (
            <>
              <TextInput
                style={s.input}
                value={code}
                onChangeText={setCode}
                placeholder="Mã trong email"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
              />
              <PrimaryButton
                title="Xác nhận mã"
                disabled={busy || !code.trim()}
                onPress={verify}
              />
              <LinkButton
                title="Đổi email / gửi lại"
                disabled={busy}
                onPress={() => {
                  setSentTo("");
                  setCode("");
                }}
              />
            </>
          ) : (
            <PrimaryButton
              title="Gửi mã xác nhận"
              disabled={busy || !email.trim()}
              onPress={send}
            />
          )}
        </Card>
      ) : null}
      {message ? (
        <Text style={s.error} accessibilityRole="alert">
          {message}
        </Text>
      ) : null}
      <Card style={s.gap}>
        <Text style={s.label}>Hai thành viên</Text>
        {members.map((m) => (
          <Text key={m.user_id} style={s.body}>
            {m.display_name}
            {m.user_id === user?.id ? " (Bạn)" : ""}
          </Text>
        ))}
        <LinkButton
          title="Mã ghép gia đình"
          onPress={() => router.push("/gia-dinh")}
        />
      </Card>
      <Card style={s.gap}>
        <Text style={s.label}>Thông báo của bạn</Text>
        <Text style={s.hint}>
          Telegram nhận hoạt động mới; lịch đã đồng bộ được nhắc cục bộ trên
          iPhone. Đã ngừng dùng token APNs cũ.
        </Text>
        <LinkButton
          title="Quản lý Telegram"
          onPress={() => router.push("/family/telegram")}
        />
      </Card>
      <Text style={s.hint}>
        Để khôi phục trên máy mới: mở Tài khoản → Khôi phục tài khoản cũ, dùng
        cùng email. Không tạo gia đình mới.
      </Text>
    </Screen>
  );
}
