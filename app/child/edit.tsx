import { FormInput as TextInput } from "../../src/components/FormInput";
import { useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Alert, Pressable, Text, View } from "react-native";
import { useApp } from "../../src/providers/AppProvider";
import { Screen, PrimaryButton } from "../../src/components/ui";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import { formStyles as s } from "../../src/components/forms";
import { parseDay, saveChild } from "../../src/lib/childRecords";
import { pickPhoto, uploadPhoto } from "../../src/services/social";
import { makeId } from "../../src/lib/ids";
import type { Child } from "../../src/types";

export default function EditChild() {
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
  const { children, child, family, loading } = useApp();
  const target = id ? children.find((c) => c.id === id) : child;
  if (loading || !family)
    return (
      <Screen>
        <Text>Đang tải gia đình…</Text>
      </Screen>
    );
  if (mode !== "new" && !target)
    return (
      <Screen>
        <Text>Chưa có hồ sơ bé.</Text>
        <PrimaryButton
          title="Thêm bé"
          onPress={() =>
            router.replace({ pathname: "/child/edit", params: { mode: "new" } })
          }
        />
      </Screen>
    );
  return (
    <ChildEditor
      key={mode === "new" ? `new:${family.id}` : target!.id}
      child={mode === "new" ? null : target!}
      familyId={family.id}
    />
  );
}

function ChildEditor({
  child,
  familyId,
}: {
  child: Child | null;
  familyId: string;
}) {
  const { selectChild, refresh, syncNow } = useApp();
  const [newId] = useState(() => makeId("child"));
  const db = useSQLiteContext();
  const [name, setName] = useState(child?.name ?? "");
  const [nickname, setNickname] = useState(child?.nickname ?? "");
  const [birthday, setBirthday] = useState(child?.birthday ?? "");
  const [due, setDue] = useState(child?.due_date ?? "");
  const [gender, setGender] = useState(child?.gender ?? "unknown");
  const [avatar, setAvatar] = useState(child?.avatar_path ?? null);
  const [cover, setCover] = useState(child?.cover_path ?? null);
  const [busy, setBusy] = useState(false);
  const photo = async (kind: "avatar" | "cover") => {
    setBusy(true);
    try {
      const uri = await pickPhoto();
      if (uri) {
        const path = await uploadPhoto(uri);
        kind === "avatar" ? setAvatar(path) : setCover(path);
      }
    } catch (e) {
      Alert.alert(
        "Chưa tải ảnh được",
        e instanceof Error
          ? e.message
          : "Cần ghép gia đình và có mạng để tải ảnh.",
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const born = parseDay(birthday.trim());
      const expected = parseDay(due.trim());
      if (born && new Date(`${born}T00:00:00`) > new Date())
        throw new Error(
          "Ngày sinh không thể ở tương lai. Nếu đang mang thai, chỉ điền ngày dự sinh.",
        );
      await saveChild(db, {
        id: child?.id ?? newId,
        family_id: familyId,
        name,
        nickname: nickname.trim() || null,
        birthday: born,
        due_date: expected,
        gender,
        avatar_path: avatar,
        cover_path: cover,
      });
      if (!child) await selectChild(newId);
      else await refresh();
      void syncNow();
      router.back();
    } catch (e) {
      Alert.alert(
        "Chưa lưu được",
        e instanceof Error ? e.message : "Hãy thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{ title: child ? "Hồ sơ bé" : "Thêm bé vào gia đình" }}
      />
      <Text style={s.title}>Hồ sơ của bé</Text>
      <Pressable disabled={busy} onPress={() => photo("cover")}>
        <FamilyPhoto
          path={cover}
          style={{ height: 150, width: "100%", borderRadius: 18 }}
        />
        <Text style={s.hint}>Chạm để chọn ảnh bìa</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => photo("avatar")}>
        <FamilyPhoto
          path={avatar}
          style={{ height: 90, width: 90, borderRadius: 45 }}
        />
        <Text style={s.hint}>Chọn ảnh đại diện</Text>
      </Pressable>
      <Text style={s.label}>Tên bé</Text>
      <TextInput
        testID="child-name"
        accessibilityLabel="Tên bé"
        style={s.input}
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Text style={s.label}>Tên ở nhà</Text>
      <TextInput
        style={s.input}
        value={nickname}
        onChangeText={setNickname}
        maxLength={80}
      />
      <View style={s.wrap}>
        {(
          [
            ["unknown", "Chưa biết"],
            ["female", "Bé gái"],
            ["male", "Bé trai"],
          ] as const
        ).map(([v, label]) => (
          <Pressable
            key={v}
            style={[s.chip, gender === v && s.activeChip]}
            onPress={() => setGender(v)}
          >
            <Text>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.label}>Ngày sinh (YYYY-MM-DD)</Text>
      <TextInput
        style={s.input}
        value={birthday}
        onChangeText={setBirthday}
        placeholder="Để trống nếu đang mang thai"
        keyboardType="numbers-and-punctuation"
      />
      <Text style={s.label}>Ngày dự sinh (YYYY-MM-DD)</Text>
      <TextInput
        style={s.input}
        value={due}
        onChangeText={setDue}
        placeholder="Ví dụ 2027-02-15"
        keyboardType="numbers-and-punctuation"
      />
      <PrimaryButton
        testID="save-child"
        title={busy ? "Đang lưu…" : "Lưu hồ sơ"}
        disabled={busy || !name.trim()}
        onPress={save}
      />
    </Screen>
  );
}
