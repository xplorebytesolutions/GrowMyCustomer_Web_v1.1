// src/utils/normalizeTemplate.js
export default function normalizeTemplate(raw) {
  const buttons = raw?.multiButtons || raw?.buttonParams || raw?.buttons || [];
  const imageUrl = raw?.imageUrl || null;
  const body =
    raw?.messageBody ||
    raw?.templateBody ||
    raw?.sampleBody ||
    raw?.messageTemplate ||
    raw?.body ||
    "";

  const createdAt =
    raw?.createdAt || raw?.created_on || raw?.createdOn || raw?.created || null;

  const sentAt =
    raw?.sentAt ||
    raw?.lastSentAt ||
    raw?.dispatchedAt ||
    raw?.deliveredAt ||
    raw?.sent_at ||
    raw?.sentOn ||
    raw?.sent_on ||
    null;

  const scheduledAt =
    raw?.scheduledAt ||
    raw?.queuedFor ||
    raw?.scheduled_at ||
    raw?.queued_for ||
    null;

  const status = raw?.status || raw?.sendStatus || raw?.state || null;

  return {
    id: raw?.id,
    name: raw?.name || "Untitled Campaign",
    kind: imageUrl ? "image_header" : "text_only",
    body,
    caption: raw?.imageCaption || raw?.caption || "",
    imageUrl,
    buttons,
    hasButtons: Array.isArray(buttons) && buttons.length > 0,
    recipients: raw?.recipientCount || 0,
    createdAt,
    sentAt,
    scheduledAt,
    status,
    updatedAt: raw?.updatedAt || raw?.updated_at || createdAt || null,
    raw,
  };
}
