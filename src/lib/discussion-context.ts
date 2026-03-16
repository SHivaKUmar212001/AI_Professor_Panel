import { ReferenceDiscussion } from "./types";

const MAX_REFERENCE_CONTEXT_CHARS = 6000;

function normalizeDiscussionText(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, "").trim();
  return cleaned || "discussion-context.md";
}

function trimDiscussionContext(content: string): string {
  if (content.length <= MAX_REFERENCE_CONTEXT_CHARS) {
    return content;
  }

  const headLength = 3400;
  const tailLength = 2200;
  const head = content.slice(0, headLength).trim();
  const tail = content.slice(-tailLength).trim();

  return `${head}\n\n[Earlier discussion content trimmed for length]\n\n${tail}`;
}

export function prepareReferenceDiscussion(
  input: Partial<ReferenceDiscussion> | null | undefined
): ReferenceDiscussion | null {
  if (!input?.fileName || !input.content) {
    return null;
  }

  const normalizedContent = trimDiscussionContext(
    normalizeDiscussionText(input.content)
  );

  if (!normalizedContent) {
    return null;
  }

  return {
    fileName: sanitizeFileName(input.fileName),
    content: normalizedContent,
    uploadedAt:
      typeof input.uploadedAt === "number" ? input.uploadedAt : Date.now(),
  };
}

export function getReferenceDiscussionPreview(
  content: string,
  maxChars = 180
): string {
  const normalized = normalizeDiscussionText(content);

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars).trimEnd()}...`;
}
