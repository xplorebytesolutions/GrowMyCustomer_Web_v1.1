// 📄 src/pages/campaigns/components/templates/TemplateCard.jsx
import React from "react";
import {
  FaPaperPlane,
  FaRegImage,
  FaRegFileAlt,
  FaEye,
  FaTrash,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaPlay,
  FaUserPlus,
  FaList,
} from "react-icons/fa";

/* -------------------------------- helpers -------------------------------- */
function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/**
 * Props:
 *  - t: { id, name, kind, recipients, createdAt?, sentAt?, scheduledAt?, status? }
 *  - sending?: boolean
 *  - deleting?: boolean
 *  - onAssign, onViewRecipients, onSend
 *  - onPreview?, onDelete?
 */
export default function TemplateCard({
  t,
  sending = false,
  deleting = false,
  onAssign,
  onViewRecipients,
  onSend,
  onPreview,
  onDelete,
}) {
  const recipients = Number(t?.recipients || 0);
  const statusRaw = (t?.status || "").toString().toLowerCase();

  // --- Type (Text vs Image)
  const kind = (t?.kind || t?.templateType || t?.type || "")
    .toString()
    .toLowerCase();
  const isImage = kind === "image_header" || kind.includes("image");
  const typeLabel = isImage ? "Image Header" : "Text Only";

  // --- Dates
  const createdAt =
    t?.createdAt || t?.created_on || t?.createdOn || t?.created || null;
  const sentAt =
    t?.sentAt || t?.lastSentAt || t?.dispatchedAt || t?.deliveredAt || null;
  const scheduledAt = t?.scheduledAt || t?.queuedFor || null;

  const isSent =
    Boolean(sentAt) ||
    ["sent", "delivered", "dispatched", "completed"].includes(statusRaw);

  const canAssign = !isSent;
  const canViewRecipients = recipients > 0;
  const canDelete = recipients > 0 && !isSent && !deleting;
  const canSend = recipients > 0 && !isSent && !sending;

  // --- Status mapping
  const status = (() => {
    const s = (t?.status || "").toString().toLowerCase();
    if (sentAt || s === "sent") return "Sent";
    if (scheduledAt || ["scheduled", "queued", "queue", "pending"].includes(s))
      return "Scheduled";
    return "Not Sent";
  })();

  const statusConfig = {
    Sent: {
      icon: FaCheckCircle,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    Scheduled: {
      icon: FaClock,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    "Not Sent": {
      icon: FaExclamationCircle,
      color: "text-gray-600",
      bg: "bg-gray-50",
      border: "border-gray-200",
    },
  };

  const currentStatus = statusConfig[status] || statusConfig["Not Sent"];
  const StatusIcon = currentStatus.icon;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-gray-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
              {t?.name || "Untitled Campaign"}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                {isImage ? (
                  <FaRegImage className="text-xs" />
                ) : (
                  <FaRegFileAlt className="text-xs" />
                )}
                {typeLabel}
              </span>
            </div>
          </div>

          {/* Small action buttons in header */}
          <div className="flex items-center gap-1">
            {/* Preview button */}
            {onPreview && (
              <button
                onClick={onPreview}
                type="button"
                title="Preview"
                aria-label="Preview"
                className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center"
              >
                <FaEye className="text-sm" />
              </button>
            )}

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={canDelete ? onDelete : undefined}
                type="button"
                title="Delete campaign"
                disabled={!canDelete}
                className={cx(
                  "w-8 h-8 rounded-lg border transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
                  canDelete
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300"
                    : "border-gray-200 bg-gray-50 text-gray-300"
                )}
              >
                <FaTrash className="text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Status and recipients */}
        <div className="flex items-center justify-between">
          <div
            className={cx(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium",
              currentStatus.bg,
              currentStatus.color,
              currentStatus.border,
              "border"
            )}
          >
            <StatusIcon className="text-xs" />
            {status}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{recipients}</div>
            <div className="text-xs text-gray-500 font-medium">Recipients</div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 px-6 py-5">
        {/* Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
              <FaCalendarAlt className="text-xs" />
              <span className="text-xs font-medium">Created</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-gray-600">
              <FaPaperPlane className="text-xs" />
              <span className="text-xs font-medium">Last Sent</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {sentAt ? new Date(sentAt).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary actions - just above footer */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={cx(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              canAssign
                ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                : "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
            )}
            onClick={canAssign ? onAssign : undefined}
            type="button"
            disabled={!canAssign}
            title={canAssign ? "Assign recipients" : "Campaign already sent"}
          >
            <FaUserPlus className="text-xs" />
            Assign Recipients
          </button>

          <button
            className={cx(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              canViewRecipients
                ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                : "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
            )}
            onClick={canViewRecipients ? onViewRecipients : undefined}
            type="button"
            disabled={!canViewRecipients}
            title={canViewRecipients ? "View recipients" : "Add recipients first"}
          >
            <FaList className="text-xs" />
            View Recipients
          </button>
        </div>
      </div>

      {/* Footer with Send Campaign button */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-100">
        <button
          className={cx(
            "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
            canSend
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-emerald-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
          disabled={!canSend || sending}
          onClick={onSend}
          type="button"
          title={
            canSend
              ? "Send campaign"
              : isSent
                ? "Campaign already sent"
                : "Add recipients first"
          }
          aria-label="Send campaign"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <FaPlay className="text-sm" />
              Send Campaign
            </>
          )}
        </button>
      </div>
    </article>
  );
}
