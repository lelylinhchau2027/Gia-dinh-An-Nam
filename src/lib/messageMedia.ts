import type { MessageAttachment } from "../types";

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_MESSAGE_ATTACHMENTS = 4;

export function messageAttachments(value: unknown): MessageAttachment[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (a): a is MessageAttachment =>
          a &&
          typeof a.path === "string" &&
          !a.path.includes(":") &&
          !a.path.includes("..") &&
          /^(image|video)$/.test(a.type) &&
          typeof a.mimeType === "string" &&
          (a.type === "image"
            ? a.mimeType === "image/jpeg"
            : ["video/mp4", "video/quicktime"].includes(a.mimeType)) &&
          Number.isFinite(a.width) &&
          a.width > 0 &&
          Number.isFinite(a.height) &&
          a.height > 0 &&
          Number.isFinite(a.size) &&
          a.size > 0 &&
          a.size <= (a.type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES),
      )
      .slice(0, MAX_MESSAGE_ATTACHMENTS);
  } catch {
    return [];
  }
}

export function validateMessage(
  body: string,
  attachments: MessageAttachment[],
  familyId: string,
  authorId: string,
) {
  if (body.trim().length > 2000)
    throw new Error("Tin nhắn tối đa 2.000 ký tự.");
  if (!body.trim() && !attachments.length)
    throw new Error("Nhập tin nhắn hoặc chọn ảnh/video.");
  if (
    attachments.length > MAX_MESSAGE_ATTACHMENTS ||
    messageAttachments(attachments).length !== attachments.length
  )
    throw new Error("Tệp đính kèm không hợp lệ.");
  if (attachments.some((a) => !a.path.startsWith(`${familyId}/${authorId}/`)))
    throw new Error("Tệp đính kèm không thuộc người gửi trong gia đình này.");
}
