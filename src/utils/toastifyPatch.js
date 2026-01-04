import { toast } from "react-toastify";

function normalizeToastString(value) {
  if (typeof value !== "string") return value;

  // Remove common leading "status emojis" so we don't get a duplicate icon
  // (Toastify already shows an icon for success/error/warn/info).
  let s = value.trimStart();

  // Repeatedly strip leading markers + whitespace.
  // Keep this intentionally conservative (prefix-only).
  // Examples: "❌ Failed" -> "Failed", "⚠️ Warning" -> "Warning".
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const before = s;
    s = s.replace(
      /^(✅|❌|⚠️|⚠|ℹ️|ℹ|⛔|⏰|🚫|✔️|✔|✓|✖|✕|×)\s+/u,
      ""
    );
    if (s === before) break;
  }

  return s;
}

function normalizeToastContent(content) {
  if (typeof content === "string") return normalizeToastString(content);
  return content;
}

function wrapToastFn(fn) {
  return (content, options) => fn(normalizeToastContent(content), options);
}

export function applyToastifyPatches() {
  if (toast.__xb_patched) return;
  toast.__xb_patched = true;

  const original = {
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warn: toast.warn,
    default: toast,
    promise: toast.promise,
    update: toast.update,
  };

  toast.success = wrapToastFn(original.success);
  toast.error = wrapToastFn(original.error);
  toast.info = wrapToastFn(original.info);
  toast.warn = wrapToastFn(original.warn);

  // Normalize default toast("...") as well
  // eslint-disable-next-line func-names
  const wrappedDefault = function (content, options) {
    return original.default(normalizeToastContent(content), options);
  };
  Object.assign(wrappedDefault, toast);
  // Preserve callable export behavior by copying patched methods back
  // eslint-disable-next-line no-param-reassign
  // (We can't reassign the imported binding, but we can patch methods.)

  // Normalize toast.promise message strings (pending/success/error)
  toast.promise = (promise, messages, options) => {
    const nextMessages = { ...(messages || {}) };
    if (typeof nextMessages.pending === "string") {
      nextMessages.pending = normalizeToastString(nextMessages.pending);
    }
    if (typeof nextMessages.success === "string") {
      nextMessages.success = normalizeToastString(nextMessages.success);
    }
    if (typeof nextMessages.error === "string") {
      nextMessages.error = normalizeToastString(nextMessages.error);
    }
    return original.promise(promise, nextMessages, options);
  };

  // Keep update working, and normalize the "render" string when provided
  toast.update = (id, options) => {
    const next = { ...(options || {}) };
    if (typeof next.render === "string") next.render = normalizeToastString(next.render);
    return original.update(id, next);
  };
}

applyToastifyPatches();

