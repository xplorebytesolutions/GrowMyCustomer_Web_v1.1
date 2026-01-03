import React from "react";
import { AlertCircle, CheckCheck, Clock } from "lucide-react";

/**
 * StatusIcon — WhatsApp-ish delivery semantics
 * - Clock: queued / sending / pending / unknown in-flight
 * - ✓✓: sent/delivered
 * - ✓✓ (green): read/seen
 * - Alert: failed/error
 */
export function StatusIcon({ status, variant = "onLight" }) {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (!s) return null;

  const palette =
    variant === "onDark"
      ? {
          failed: "text-rose-300",
          read: "text-emerald-300",
          delivered: "text-white/70",
          sent: "text-white/70",
          inFlight: "text-white/70",
        }
      : {
          failed: "text-rose-600",
          read: "text-emerald-600",
          delivered: "text-slate-500",
          sent: "text-slate-500",
          inFlight: "text-slate-500",
        };

  const isFailed =
    s === "failed" ||
    s === "error" ||
    s.includes("fail") ||
    s.includes("reject");

  if (isFailed) {
    return (
      <span
        title={status}
        className={`inline-flex items-center text-[10px] ${palette.failed}`}
      >
        <AlertCircle className="w-3 h-3" />
      </span>
    );
  }

  const isRead =
    s === "read" || s === "seen" || s === "viewed" || s.includes("read");
  if (isRead) {
    return (
      <span
        title={status}
        className={`inline-flex items-center text-[10px] ${palette.read}`}
      >
        <CheckCheck className="w-3 h-3" />
      </span>
    );
  }

  const isDelivered = s === "delivered" || s.includes("deliver");
  if (isDelivered) {
    return (
      <span
        title={status}
        className={`inline-flex items-center text-[10px] ${palette.delivered}`}
      >
        <CheckCheck className="w-3 h-3" />
      </span>
    );
  }

  const isSent = s === "sent";
  if (isSent) {
    return (
      <span
        title={status}
        className={`inline-flex items-center text-[10px] ${palette.sent}`}
      >
        <CheckCheck className="w-3 h-3" />
      </span>
    );
  }

  // In-flight + safest default: Clock (never lie with ✓)
  const isInFlight =
    s === "sending" ||
    s === "queued" ||
    s === "pending" ||
    s.includes("queue") ||
    s.includes("send") ||
    s.includes("accept") ||
    s.includes("submit") ||
    s.includes("process") ||
    s.includes("progress");

  if (isInFlight) {
    return (
      <span
        title={status}
        className={`inline-flex items-center text-[10px] ${palette.inFlight}`}
      >
        <Clock className="w-3 h-3" />
      </span>
    );
  }

  return (
    <span
      title={status}
      className={`inline-flex items-center text-[10px] ${palette.inFlight}`}
    >
      <Clock className="w-3 h-3" />
    </span>
  );
}
