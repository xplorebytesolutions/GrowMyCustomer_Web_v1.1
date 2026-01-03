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
    sentAt: createdAt,
    status,
    errorMessage: msg.errorMessage ?? null,
  };
}
