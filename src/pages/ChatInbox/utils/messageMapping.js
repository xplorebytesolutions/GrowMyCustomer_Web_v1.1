/**
 * ✅ Fix #1: Tolerant inbound detection
 */
export function inferIsInboundFromAny(obj) {
  if (!obj) return false;

  const rawInbound =
    obj.isInbound ??
    obj.IsInbound ??
    obj.isIncoming ??
    obj.IsIncoming ??
    obj.inbound ??
    obj.Inbound ??
    null;

  if (typeof rawInbound === "boolean") return rawInbound;

  if (typeof rawInbound === "string") {
    const v = rawInbound.toLowerCase().trim();
    if (v === "true") return true;
    if (v === "false") return false;
  }

  const directionRaw =
    obj.direction ??
    obj.Direction ??
    obj.dir ??
    obj.messageDirection ??
    obj.messageDir ??
    obj.DirectionType ??
    "";

  const statusRaw = obj.status ?? obj.deliveryStatus ?? "";

  const dir = String(directionRaw).toLowerCase().trim();
  const status = String(statusRaw).toLowerCase().trim();

  return (
    dir === "in" ||
    dir === "inbound" ||
    dir === "incoming" ||
    dir === "received" ||
    dir === "customer" ||
    dir === "from" ||
    dir.startsWith("in") ||
    status === "received" ||
    status === "incoming"
  );
}

// 🔁 Map hub payload → ChatInbox message shape (SignalR)
// 🔁 Map hub payload → ChatInbox message shape (SignalR)
export function mapHubMessageToChat(msg) {
  if (!msg) return null;

  const providerMessageId =
    msg.providerMessageId ?? msg.ProviderMessageId ?? null;

  const messageLogId =
    msg.messageLogId ?? msg.MessageLogId ?? msg.messageLogID ?? null;

  const messageId =
    msg.messageId ??
    msg.MessageId ??
    msg.wamid ??
    msg.Wamid ??
    msg.waMessageId ??
    msg.WaMessageId ??
    msg.providerMessageId ??
    msg.ProviderMessageId ??
    null;

  const clientMessageId =
    msg.clientMessageId ?? msg.ClientMessageId ?? msg.clientId ?? null;

  const id =
    msg.id ??
    msg.Id ??
    messageLogId ??
    messageId ??
    clientMessageId ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const text =
    msg.text ??
    msg.message ??
    msg.body ??
    msg.content ??
    msg.messageText ??
    msg.MessageText ??
    msg.messageContent ??
    msg.MessageContent ??
    msg.renderedBody ??
    msg.RenderedBody ??
    "";

  let mediaId = msg.mediaId ?? msg.MediaId ?? null;
  let mediaType = msg.mediaType ?? msg.MediaType ?? null;
  const fileName = msg.fileName ?? msg.FileName ?? null;
  const mimeType = msg.mimeType ?? msg.MimeType ?? null;
  let locationLatitude =
    msg.locationLatitude ?? msg.LocationLatitude ?? msg.latitude ?? null;
  let locationLongitude =
    msg.locationLongitude ?? msg.LocationLongitude ?? msg.longitude ?? null;
  let locationName = msg.locationName ?? msg.LocationName ?? msg.name ?? null;
  let locationAddress =
    msg.locationAddress ?? msg.LocationAddress ?? msg.address ?? null;

  const typeFallback =
    msg.type ?? msg.Type ?? msg.messageType ?? msg.MessageType ?? null;

  if (!mediaType && typeFallback) mediaType = typeFallback;
  if (!mediaType) {
    if (msg.image || msg.Image) mediaType = "image";
    else if (msg.video || msg.Video) mediaType = "video";
    else if (msg.audio || msg.Audio) mediaType = "audio";
    else if (msg.document || msg.Document) mediaType = "document";
    else if (msg.location || msg.Location) mediaType = "location";
  }
  if (typeof mediaType === "string") mediaType = mediaType.toLowerCase().trim();

  const nested =
    mediaType === "image"
      ? msg.image ?? msg.Image ?? null
      : mediaType === "video"
        ? msg.video ?? msg.Video ?? null
        : mediaType === "audio"
          ? msg.audio ?? msg.Audio ?? null
          : mediaType === "document"
            ? msg.document ?? msg.Document ?? null
            : mediaType === "location"
              ? msg.location ?? msg.Location ?? null
              : null;

  if (!mediaId && nested && typeof nested === "object") {
    mediaId = nested.id ?? nested.mediaId ?? null;
  }

  if (mediaType === "location" && nested && typeof nested === "object") {
    locationLatitude =
      locationLatitude ?? nested.latitude ?? nested.Latitude ?? null;
    locationLongitude =
      locationLongitude ?? nested.longitude ?? nested.Longitude ?? null;
    locationName = locationName ?? nested.name ?? nested.Name ?? null;
    locationAddress =
      locationAddress ?? nested.address ?? nested.Address ?? null;
  }

  const isInbound = inferIsInboundFromAny(msg);

  const directionRaw = msg.direction ?? msg.Direction ?? msg.dir ?? "";
  const status = msg.status ?? msg.deliveryStatus ?? msg.Status ?? "";

  const createdAt =
    msg.createdAt ??
    msg.sentAt ??
    msg.sentAtUtc ??
    msg.timestamp ??
    new Date().toISOString();

  return {
    id,
    providerMessageId,
    messageLogId: messageLogId ?? null,
    serverId: messageLogId ?? null,
    messageId, // ✅ WhatsApp WAMID (best for reconciliation)
    clientMessageId, // ✅ temp id (best for optimistic reconciliation)
    direction: directionRaw || (isInbound ? "in" : "out"),
    isInbound,
    text,
    mediaId,
    mediaType,
    fileName,
    mimeType,
    locationLatitude,
    locationLongitude,
    locationName,
    locationAddress,
    sentAt: createdAt,
    status,
    errorMessage: msg.errorMessage ?? null,
  };
}
