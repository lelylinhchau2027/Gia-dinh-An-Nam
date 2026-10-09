import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import type { FamilyMessage, MessageAttachment } from "../types";
import { client, familySession, uploadPhotoWithMetadata } from "./social";
import { makeId } from "../lib/ids";
import { messageAttachments, MAX_VIDEO_BYTES } from "../lib/messageMedia";

export async function pickChatMedia(kind: "image" | "video") {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === "image" ? ["images"] : ["videos"],
    quality: 0.8,
    allowsMultipleSelection: false,
  });
  return result.canceled ? null : (result.assets[0] ?? null);
}

export async function uploadChatMedia(
  asset: ImagePicker.ImagePickerAsset,
): Promise<MessageAttachment> {
  if (asset.type !== "video") {
    return {
      ...(await uploadPhotoWithMetadata(asset.uri)),
      type: "image",
      mimeType: "image/jpeg",
    };
  }
  const { familyId, user } = await familySession();
  const nativeInfo =
    Platform.OS !== "web" ? await FileSystem.getInfoAsync(asset.uri) : null;
  const size =
    nativeInfo?.exists && !nativeInfo.isDirectory
      ? nativeInfo.size
      : asset.fileSize;
  if (!size || size > MAX_VIDEO_BYTES)
    throw new Error("Video tối đa 25 MB. Hãy cắt ngắn video rồi chọn lại.");
  const mime =
    asset.mimeType ||
    (/\.mov(?:\?|$)/i.test(asset.uri) ? "video/quicktime" : "video/mp4");
  if (!["video/mp4", "video/quicktime"].includes(mime))
    throw new Error("Hãy chọn video MP4 hoặc MOV.");
  const path = `${familyId}/${user.id}/${makeId("video")}.${mime === "video/quicktime" ? "mov" : "mp4"}`;
  const { data, error } = await client()
    .storage.from("family-media")
    .createSignedUploadUrl(path);
  if (error) throw error;
  if (Platform.OS === "web") {
    const bytes = await (await fetch(asset.uri)).arrayBuffer();
    if (bytes.byteLength > MAX_VIDEO_BYTES)
      throw new Error("Video tối đa 25 MB.");
    const result = await client()
      .storage.from("family-media")
      .uploadToSignedUrl(path, data.token, bytes, { contentType: mime });
    if (result.error) throw result.error;
  } else {
    // Stream the file with the native uploader; never allocate a base64 video
    // in JavaScript on the iPhone 11.
    const result = await FileSystem.uploadAsync(data.signedUrl, asset.uri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": mime, "x-upsert": "false" },
    });
    if (result.status < 200 || result.status >= 300)
      throw new Error("Chưa tải được video. Kiểm tra mạng và migration 0003.");
  }
  return {
    path,
    type: "video",
    mimeType: mime,
    width: asset.width || 1,
    height: asset.height || 1,
    size,
  };
}

export async function readChat(
  db: SQLiteDatabase,
  familyId: string,
  limit = 40,
): Promise<FamilyMessage[]> {
  const rows = await db.getAllAsync<FamilyMessage>(
    "SELECT * FROM family_messages WHERE family_id=? ORDER BY created_at DESC,id DESC LIMIT ?",
    familyId,
    limit,
  );
  return rows.map((m) => ({
    ...m,
    attachments: messageAttachments(m.attachments),
  }));
}

export async function partnerReadTime(
  familyId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client()
    .from("family_message_reads")
    .select("last_read_at")
    .eq("family_id", familyId)
    .neq("user_id", userId)
    .order("last_read_at", { ascending: false })
    .limit(1);
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code))
      throw new Error(
        "Trạng thái đã đọc và ảnh/video cần nâng Supabase bằng migration 0003.",
      );
    throw new Error(
      "Chưa tải được trạng thái đã đọc. Kiểm tra mạng và kết nối gia đình.",
    );
  }
  return data?.[0]?.last_read_at ?? null;
}

export async function markChatRead(familyId: string, lastMessageId: string) {
  const { error } = await client().rpc("mark_family_messages_read", {
    p_family_id: familyId,
    p_last_message_id: lastMessageId,
  });
  if (error) throw error;
}
