const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
let size = 1000,
  uploadStatus = 200,
  uploads = [],
  signs = 0;
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === "react-native") return { Platform: { OS: "ios" } };
  if (id === "expo-image-picker") return {};
  if (id === "expo-file-system/legacy")
    return {
      getInfoAsync: async () => ({ exists: true, isDirectory: false, size }),
      FileSystemUploadType: { BINARY_CONTENT: 0 },
      uploadAsync: async (...args) => {
        uploads.push(args);
        return { status: uploadStatus };
      },
    };
  if (id === "./social")
    return {
      familySession: async () => ({
        familyId: "family",
        user: { id: "sender" },
      }),
      uploadPhotoWithMetadata: async () => ({
        path: "family/sender/photo.jpg",
        width: 800,
        height: 1200,
        size: 1000,
      }),
      client: () => ({
        storage: {
          from: () => ({
            createSignedUploadUrl: async () => {
              signs++;
              return {
                data: {
                  signedUrl: "https://uploads.test/video?token=test",
                  token: "test",
                },
                error: null,
              };
            },
          }),
        },
      }),
    };
  return load.call(this, id, ...args);
};
const { uploadChatMedia } = require("../src/services/chat.ts");
const { messageAttachments } = require("../src/lib/messageMedia.ts");
const video = {
  uri: "file:///test-video.mp4",
  type: "video",
  mimeType: "video/mp4",
  width: 720,
  height: 1280,
  fileSize: 1000,
};
test("iOS videos use native binary upload; oversize files fail before creating an upload URL", async () => {
  const media = await uploadChatMedia(video);
  assert.equal(media.type, "video");
  assert.equal(media.size, 1000);
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0][1], video.uri);
  assert.equal(uploads[0][2].httpMethod, "PUT");
  assert.equal(uploads[0][2].uploadType, 0);
  size = 26 * 1024 * 1024;
  await assert.rejects(uploadChatMedia(video), /25 MB/);
  assert.equal(signs, 1);
  assert.equal(uploads.length, 1);
  size = 1000;
  uploadStatus = 403;
  await assert.rejects(uploadChatMedia(video), /Chưa tải được video/);
});
test("media parser ignores malformed old payloads and rejects untrusted URLs/types", () => {
  const good = {
    path: "family/sender/photo.jpg",
    type: "image",
    mimeType: "image/jpeg",
    width: 800,
    height: 1200,
    size: 1000,
  };
  assert.deepEqual(messageAttachments(JSON.stringify([good])), [good]);
  for (const value of [
    "{broken",
    "null",
    {},
    [{ ...good, path: "https://attacker.test/a.jpg" }],
    [{ ...good, path: "family/../secret" }],
    [{ ...good, mimeType: "text/html" }],
    [{ ...good, size: Infinity }],
  ])
    assert.deepEqual(messageAttachments(value), []);
});
