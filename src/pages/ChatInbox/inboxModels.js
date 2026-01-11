// 📄 src/pages/ChatInbox/inboxModels.js

/**
 * Conversation status as used in the Inbox UI.
 *
 * "New"     -> first contact / not yet handled
 * "Open"    -> active conversation, needs attention
 * "Pending" -> waiting on customer
 * "Closed"  -> resolved
 *
 * @typedef {"New" | "Open" | "Pending" | "Closed"} ConversationStatus
 */

/**
 * Conversation mode:
 *
 * "automation" -> bot / AutoReply / flows are allowed to respond
 * "agent"      -> human agent has taken over, bot should stay quiet
 *
 * @typedef {"automation" | "agent"} ConversationMode
 */

/**
 * Where this conversation primarily comes from.
 *
 * "AutoReply" -> triggered via keyword flows
 * "Campaign"  -> initiated by campaign / broadcast
 * "Manual"    -> purely agent-driven
 * "Unknown"   -> fallback when backend doesn't know yet
 *
 * @typedef {"AutoReply" | "Campaign" | "Manual" | "Unknown"} ConversationSourceType
 */

/**
 * Lightweight summary of a conversation used in:
 * - conversation list (left column)
 * - ChatHeader
 * - ContactDetailsPanel
 *
 * This is the *canonical* shape the front-end expects. All mocks and
 * future API responses should conform to this as much as possible.
 *
 * @typedef {Object} ConversationSummary
 * @property {string} id
 *
 * @property {string} contactId       - CRM Contact.Id (GUID as string)
 * @property {string} contactName
 * @property {string} contactPhone
 *
 * @property {string} lastMessagePreview - short text shown in the list
 * @property {string} lastMessageAt      - ISO string
 * @property {number} unreadCount
 *
 * @property {ConversationStatus} status
 * @property {string} numberId           - WhatsApp number id (wa-num-1 etc.)
 * @property {string} numberLabel        - "Sales", "Support", etc.
 * @property {boolean} within24h         - true if inside 24h session window
 *
 * @property {string | null} assignedToUserId
 * @property {string | null} assignedToUserName
 * @property {boolean} isAssignedToMe
 *
 * @property {ConversationMode} mode
 * @property {ConversationSourceType} sourceType
 * @property {string | null} sourceName - campaign name / flow name / note
 *
 * @property {string | null} firstSeenAt       - ISO
 * @property {number}        totalMessages
 * @property {string | null} lastAgentReplyAt  - ISO
 * @property {string | null} lastAutomationAt  - ISO
 */

/**
 * Allowed values for the little pills / dropdowns in UI.
 */
export const CONVERSATION_STATUSES = /** @type {ConversationStatus[]} */ ([
  "New",
  "Open",
  "Pending",
  "Closed",
]);

export const CONVERSATION_MODES = /** @type {ConversationMode[]} */ ([
  "automation",
  "agent",
]);

export const CONVERSATION_SOURCE_TYPES =
  /** @type {ConversationSourceType[]} */ ([
    "AutoReply",
    "Campaign",
    "Manual",
    "Unknown",
  ]);

/**
 * Direction of each chat bubble in the message list.
 *
 * "in"         -> customer message
 * "out"        -> agent message (you / teammate)
 * "automation" -> auto-reply / campaign / CTA flow
 * "system"     -> system notices ("conversation closed", etc.)
 *
 * @typedef {"in" | "out" | "automation" | "system"} MessageDirection
 */

/**
 * Single message item rendered in the middle panel.
 *
 * @typedef {Object} MessageItem
 * @property {string} id
 * @property {MessageDirection} direction
 * @property {string} text
 * @property {string | null | undefined} [mediaId]
 * @property {"image" | "document" | "video" | "audio" | "location" | null | undefined} [mediaType]
 * @property {string | null | undefined} [fileName]
 * @property {string | null | undefined} [mimeType]
 * @property {string | null | undefined} [localPreviewUrl] - objectURL for sender preview (UI-only)
 * @property {number | null | undefined} [locationLatitude]
 * @property {number | null | undefined} [locationLongitude]
 * @property {string | null | undefined} [locationName]
 * @property {string | null | undefined} [locationAddress]
 * @property {string} sentAt
 * @property {string | undefined} [senderName]
 */

/**
 * Factory to create a safe ConversationSummary object from a partial.
 *
 * @param {Partial<ConversationSummary>} partial
 * @returns {ConversationSummary}
 */
export function createConversationSummary(partial) {
  return {
    id: partial.id ?? "",

    contactId: partial.contactId ?? "", // 👈 new
    contactName: partial.contactName ?? "",
    contactPhone: partial.contactPhone ?? "",

    lastMessagePreview: partial.lastMessagePreview ?? "",
    lastMessageAt: partial.lastMessageAt ?? new Date().toISOString(),
    unreadCount:
      typeof partial.unreadCount === "number" ? partial.unreadCount : 0,

    status: partial.status ?? "New",
    numberId: partial.numberId ?? "",
    numberLabel: partial.numberLabel ?? "",
    within24h: Boolean(partial.within24h),

    assignedToUserId:
      typeof partial.assignedToUserId === "string"
        ? partial.assignedToUserId
        : null,
    assignedToUserName:
      typeof partial.assignedToUserName === "string"
        ? partial.assignedToUserName
        : null,
    isAssignedToMe: Boolean(partial.isAssignedToMe),

    mode: partial.mode ?? "automation",
    sourceType: partial.sourceType ?? "Unknown",
    sourceName: partial.sourceName ?? null,

    firstSeenAt: partial.firstSeenAt ?? null,
    totalMessages:
      typeof partial.totalMessages === "number" ? partial.totalMessages : 0,
    lastAgentReplyAt: partial.lastAgentReplyAt ?? null,
    lastAutomationAt: partial.lastAutomationAt ?? null,
  };
}

/**
 * Helper to map a raw DTO from the backend into ConversationSummary.
 *
 * @param {any} dto - raw backend object
 * @param {string | null} currentUserId
 * @returns {ConversationSummary}
 */
export function mapConversationDtoToSummary(dto, currentUserId) {
  const summary = createConversationSummary({
    id: dto.id,

    contactId: dto.contactId, // 👈 new
    contactName: dto.contactName,
    contactPhone: dto.contactPhone,

    lastMessagePreview: dto.lastMessagePreview,
    lastMessageAt: dto.lastMessageAt,

    unreadCount: dto.unreadCount,
    status: dto.status,
    numberId: dto.numberId,
    numberLabel: dto.numberLabel,
    within24h: dto.within24h,

    assignedToUserId: dto.assignedToUserId,
    assignedToUserName: dto.assignedToUserName,

    mode: dto.mode,
    sourceType: dto.sourceType,
    sourceName: dto.sourceName,

    firstSeenAt: dto.firstSeenAt,
    totalMessages: dto.totalMessages,
    lastAgentReplyAt: dto.lastAgentReplyAt,
    lastAutomationAt: dto.lastAutomationAt,
  });

  if (currentUserId) {
    summary.isAssignedToMe =
      summary.assignedToUserId != null &&
      summary.assignedToUserId === currentUserId;
  }

  return summary;
}
