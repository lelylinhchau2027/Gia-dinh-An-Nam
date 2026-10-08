import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTitle } from "../../src/components/AppTitle";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import {
  Card,
  EmptyState,
  LinkButton,
  PrimaryButton,
  Screen,
  formatDateTime,
} from "../../src/components/ui";
import {
  client,
  commentOnPost,
  loadComments,
  loadFeed,
  pickPhoto,
  publishPost,
  setLike,
  uploadPhoto,
  type Comment,
  type Post,
} from "../../src/services/social";
import { useApp } from "../../src/providers/AppProvider";
import { formStyles as s } from "../../src/components/forms";

export default function FeedScreen() {
  const { family } = useApp();
  const [feed, setFeed] = useState<Awaited<ReturnType<typeof loadFeed>> | null>(
    null,
  );
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const paired = !!family && !family.id.startsWith("family_local");
  const reload = useCallback(async () => {
    if (!paired) return;
    setRefreshing(true);
    try {
      const next = await loadFeed();
      setFeed(next);
      setMore(next.posts.length === 20);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Chưa tải được bảng tin. Kiểm tra kết nối và thử lại.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [paired]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  useEffect(() => {
    if (!paired || !family) return;
    const channel = client().channel(`feed:${family.id}`);
    for (const table of ["family_posts", "post_likes"])
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `family_id=eq.${family.id}`,
        },
        () => {
          void reload();
        },
      );
    channel.subscribe();
    return () => {
      void client().removeChannel(channel);
    };
  }, [family?.id, paired, reload]);
  const publish = async () => {
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const image of images) uploaded.push(await uploadPhoto(image));
      await publishPost(body, uploaded);
      setBody("");
      setImages([]);
      await reload();
    } catch (e) {
      Alert.alert(
        "Chưa xác nhận đăng bài",
        "Kiểm tra bảng tin trước khi thử lại. " +
          (e instanceof Error ? e.message : "Hãy kiểm tra kết nối."),
      );
    } finally {
      setBusy(false);
    }
  };
  const loadMore = async () => {
    if (!feed?.posts.length) return;
    setRefreshing(true);
    try {
      const next = await loadFeed(
        feed.posts[feed.posts.length - 1]!.created_at,
      );
      setFeed((old) =>
        old
          ? {
              ...next,
              posts: [
                ...old.posts,
                ...next.posts.filter(
                  (p) => !old.posts.some((o) => o.id === p.id),
                ),
              ],
              likes: [...old.likes, ...next.likes],
            }
          : next,
      );
      setMore(next.posts.length === 20);
    } catch {
      setError("Chưa tải được bài cũ. Kéo xuống để thử lại.");
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <Screen
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={reload} />
      }
    >
      <View style={s.row}>
        <LinkButton
          title="Việc chung & lời nhắn"
          onPress={() => router.push("/gia-dinh")}
        />
        <LinkButton title="Tài khoản" onPress={() => router.push("/account")} />
      </View>
      <AppTitle
        eyebrow="Những ngày bên nhau"
        title="Bảng tin gia đình"
        subtitle="Giữ lại những khoảnh khắc nhỏ, cùng nhìn con lớn lên."
      />
      {!paired ? (
        <Card>
          <EmptyState
            icon="heart-outline"
            title="Kết nối hai người"
            body="Tạo gia đình hoặc nhập mã ghép để cùng đăng ảnh và trò chuyện."
          />
          <PrimaryButton
            title="Kết nối gia đình"
            onPress={() => router.push("/family/connect")}
          />
        </Card>
      ) : (
        <>
          <Card style={s.gap}>
            <TextInput
              style={s.input}
              placeholder="Hôm nay nhà mình có gì vui?"
              multiline
              value={body}
              onChangeText={setBody}
              maxLength={5000}
              editable={!busy}
            />
            <View style={s.wrap}>
              {images.map((uri, i) => (
                <Pressable
                  key={`${uri}:${i}`}
                  disabled={busy}
                  accessibilityLabel="Bỏ ảnh"
                  onPress={() =>
                    setImages((list) => list.filter((_, n) => n !== i))
                  }
                >
                  <Image
                    source={{ uri }}
                    style={{ width: 80, height: 80, borderRadius: 12 }}
                  />
                  <Text style={s.hint}>Bỏ ảnh ×</Text>
                </Pressable>
              ))}
            </View>
            <LinkButton
              disabled={busy || images.length >= 6}
              title={`Thêm ảnh (${images.length}/6)`}
              onPress={async () => {
                try {
                  const uri = await pickPhoto();
                  if (uri) setImages((v) => [...v, uri].slice(0, 6));
                } catch {
                  Alert.alert("Chưa chọn được ảnh");
                }
              }}
            />
            <PrimaryButton
              title={busy ? "Đang đăng…" : "Đăng khoảnh khắc"}
              disabled={busy || (!body.trim() && !images.length)}
              onPress={publish}
            />
            <Text style={s.hint}>
              Chỉ hai thành viên gia đình xem được. Cần mạng để đăng bài và ảnh.
            </Text>
          </Card>
          {error ? (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          ) : null}
          {feed?.posts.map((post) => (
            <PostCard key={post.id} post={post} feed={feed} reload={reload} />
          ))}
          {feed && !feed.posts.length ? (
            <EmptyState
              icon="images-outline"
              title="Khoảnh khắc đầu tiên"
              body="Đăng một tấm ảnh hoặc đôi dòng để bắt đầu album của nhà mình."
            />
          ) : null}
          {more ? (
            <PrimaryButton
              title="Xem bài cũ hơn"
              disabled={refreshing}
              onPress={loadMore}
            />
          ) : null}
        </>
      )}
      <LinkButton
        title="Cài đặt & thông báo"
        onPress={() => router.push("/cai-dat")}
      />
    </Screen>
  );
}

function PostCard({
  post,
  feed,
  reload,
}: {
  post: Post;
  feed: Awaited<ReturnType<typeof loadFeed>>;
  reload: () => Promise<void>;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const name = (id: string) =>
    feed.members.find((m) => m.user_id === id)?.display_name ?? "Người nhà";
  const likes = feed.likes.filter((l) => l.post_id === post.id);
  const liked = likes.some((l) => l.user_id === feed.userId);
  const action = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      Alert.alert(
        "Chưa thực hiện được",
        e instanceof Error ? e.message : "Hãy thử lại khi có mạng.",
      );
    } finally {
      setBusy(false);
    }
  };
  const refreshComments = useCallback(async () => {
    const rows = await loadComments(post.id);
    setComments(rows);
    setMore(rows.length === 40);
  }, [post.id]);
  const isOpen = comments !== null;
  useEffect(() => {
    if (!isOpen) return;
    const channel = client()
      .channel(`comments:${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${post.id}`,
        },
        () => {
          void refreshComments().catch(() => undefined);
        },
      )
      .subscribe();
    return () => {
      void client().removeChannel(channel);
    };
  }, [isOpen, post.id, refreshComments]);
  return (
    <Card style={s.gap}>
      <View style={s.row}>
        <Text style={s.label}>{name(post.author_id)}</Text>
        <Text style={s.hint}>{formatDateTime(post.created_at)}</Text>
      </View>
      {post.body ? <Text style={s.body}>{post.body}</Text> : null}
      {post.image_paths.map((path) => (
        <FamilyPhoto
          key={path}
          path={path}
          style={{ width: "100%", height: 260, borderRadius: 16 }}
        />
      ))}
      <View style={s.row}>
        <LinkButton
          disabled={busy}
          title={`${liked ? "♥" : "♡"} ${likes.length} lượt thích`}
          onPress={() =>
            action(async () => {
              await setLike(post, !liked);
              await reload();
            })
          }
        />
        <LinkButton
          disabled={busy}
          title={comments ? "Thu gọn" : "Bình luận"}
          onPress={() =>
            comments ? setComments(null) : action(refreshComments)
          }
        />
      </View>
      {comments ? (
        <>
          {more ? (
            <LinkButton
              title="Bình luận cũ hơn"
              disabled={busy}
              onPress={() =>
                action(async () => {
                  const next = await loadComments(
                    post.id,
                    comments[comments.length - 1]?.created_at,
                  );
                  setComments((v) => [...(v ?? []), ...next]);
                  setMore(next.length === 40);
                })
              }
            />
          ) : null}
          {[...comments].reverse().map((c) => (
            <View key={c.id} style={s.comment}>
              <Text style={s.label}>{name(c.author_id)}</Text>
              <Text style={s.body}>{c.body}</Text>
              {c.author_id === feed.userId ? (
                <LinkButton
                  title="Xóa bình luận"
                  disabled={busy}
                  onPress={() =>
                    action(async () => {
                      const { error } = await client()
                        .from("post_comments")
                        .delete()
                        .eq("id", c.id);
                      if (error) throw error;
                      await refreshComments();
                    })
                  }
                />
              ) : null}
            </View>
          ))}
          <TextInput
            style={s.input}
            value={body}
            onChangeText={setBody}
            placeholder="Viết bình luận…"
            multiline
            maxLength={2000}
            editable={!busy}
          />
          <PrimaryButton
            title="Gửi bình luận"
            disabled={busy || !body.trim()}
            onPress={() =>
              action(async () => {
                await commentOnPost(post, body);
                setBody("");
                await refreshComments();
              })
            }
          />
        </>
      ) : null}
      {post.author_id === feed.userId ? (
        <LinkButton
          title="Xóa bài"
          disabled={busy}
          onPress={() =>
            Alert.alert(
              "Xóa bài viết?",
              "Bài và các bình luận sẽ được xóa khỏi bảng tin.",
              [
                { text: "Giữ lại", style: "cancel" },
                {
                  text: "Xóa",
                  style: "destructive",
                  onPress: () =>
                    action(async () => {
                      const { error } = await client()
                        .from("family_posts")
                        .delete()
                        .eq("id", post.id);
                      if (error) throw error;
                      await reload();
                    }),
                },
              ],
            )
          }
        />
      ) : null}
    </Card>
  );
}
