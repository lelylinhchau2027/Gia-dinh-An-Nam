import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../lib/supabase";
import { makeId } from "../lib/ids";
import { Image } from "react-native";

export function client() {
  if (!supabase) throw new Error("Chưa kết nối dịch vụ gia đình.");
  return supabase;
}
export async function familySession() {
  const c = client();
  const {
    data: { user },
    error,
  } = await c.auth.getUser();
  if (error || !user) throw new Error("Hãy kết nối gia đình trước.");
  const result = await c
    .from("family_members")
    .select("family_id, display_name")
    .eq("user_id", user.id)
    .single();
  if (result.error)
    throw new Error("Hãy tạo gia đình hoặc nhập mã ghép trước.");
  return {
    user,
    familyId: result.data.family_id as string,
    name: result.data.display_name as string,
  };
}
export async function pickPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}
export async function uploadPhoto(uri: string) {
  return (await uploadPhotoWithMetadata(uri)).path;
}
export async function uploadPhotoWithMetadata(uri: string) {
  const { familyId, user } = await familySession();
  // Bound both axes. Resizing every portrait to width 1600 can otherwise
  // produce a huge decoded bitmap on memory-constrained devices.
  const { width, height } = await Image.getSize(uri);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("Không đọc được kích thước ảnh.");
  const resize =
    width >= height
      ? { width: Math.min(width, 1600) }
      : { height: Math.min(height, 1600) };
  const image = await ImageManipulator.manipulateAsync(uri, [{ resize }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!image.base64) throw new Error("Không thể đọc ảnh đã chọn.");
  const bytes = decode(image.base64);
  if (bytes.byteLength > 8 * 1024 * 1024)
    throw new Error("Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.");
  const path = `${familyId}/${user.id}/${makeId("photo")}.jpg`;
  const { error } = await client()
    .storage.from("family-media")
    .upload(path, bytes, { contentType: "image/jpeg" });
  if (error) throw error;
  return {
    path,
    width: image.width,
    height: image.height,
    size: bytes.byteLength,
  };
}
export async function photoUrl(path: string) {
  const { data, error } = await client()
    .storage.from("family-media")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
export type Post = {
  id: string;
  family_id: string;
  author_id: string;
  body: string;
  image_paths: string[];
  created_at: string;
};
export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};
export async function loadFeed(before?: string) {
  const { familyId, user } = await familySession();
  let query = client()
    .from("family_posts")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(20);
  if (before) query = query.lt("created_at", before);
  const result = await query;
  if (result.error) throw result.error;
  const posts = (result.data ?? []).map((p) => ({
    ...p,
    image_paths: Array.isArray(p.image_paths)
      ? p.image_paths.filter((path: unknown) => typeof path === "string")
      : [],
  })) as Post[];
  const ids = posts.map((p) => p.id);
  const [likes, members] = await Promise.all([
    ids.length
      ? client().from("post_likes").select("post_id,user_id").in("post_id", ids)
      : Promise.resolve({ data: [], error: null }),
    client()
      .from("family_members")
      .select("user_id,display_name")
      .eq("family_id", familyId),
  ]);
  if (likes.error || members.error) throw likes.error ?? members.error;
  return {
    posts,
    likes: likes.data ?? [],
    members: members.data ?? [],
    userId: user.id,
  };
}
export async function publishPost(body: string, images: string[]) {
  const { familyId, user } = await familySession();
  const { error } = await client().from("family_posts").insert({
    family_id: familyId,
    author_id: user.id,
    body: body.trim(),
    image_paths: images,
  });
  if (error) throw error;
}
export async function setLike(post: Post, liked: boolean) {
  const { user } = await familySession();
  const result = liked
    ? await client()
        .from("post_likes")
        .upsert(
          { post_id: post.id, family_id: post.family_id, user_id: user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true },
        )
    : await client()
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
  if (result.error) throw result.error;
}
export async function loadComments(postId: string, before?: string) {
  let query = client()
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw error;
  return data as Comment[];
}
export async function commentOnPost(post: Post, body: string) {
  const { user } = await familySession();
  const { error } = await client().from("post_comments").insert({
    post_id: post.id,
    family_id: post.family_id,
    author_id: user.id,
    body: body.trim(),
  });
  if (error) throw error;
}
