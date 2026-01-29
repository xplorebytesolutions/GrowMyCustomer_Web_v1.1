import React, { useMemo } from "react";

const isValidHttpsUrl = value => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:";
  } catch {
    return false;
  }
};

const fillPlaceholders = (text, params = [], profileSlot = null) => {
  const source = String(text || "");
  const list = Array.isArray(params) ? params : [];

  const used = new Set();

  let out = source.replace(/\{\{\s*(\d+)\s*\}\}/g, (m, nRaw) => {
    const n = parseInt(nRaw, 10);
    if (!Number.isFinite(n) || n <= 0) return m;
    if (profileSlot != null && n === profileSlot) return "Contact name";
    const idx = n - 1;
    used.add(idx);
    const v = list[idx];
    return String(v ?? "").trim() ? String(v) : m;
  });

  // Support NAMED tokens "{{}}" by filling sequentially (in-order)
  let cursor = 0;
  out = out.replace(/\{\{\s*\}\}/g, m => {
    while (cursor < list.length && used.has(cursor)) cursor++;
    const idx = cursor;
    cursor++;

    if (profileSlot != null && idx === profileSlot - 1) return "Contact name";
    const v = list[idx];
    return String(v ?? "").trim() ? String(v) : m;
  });

  return out;
};

/**
 * 📄 WhatsAppTemplatePreview
 * @param {Object} props.template - Template metadata from backend
 */
export default function WhatsAppTemplatePreview({
  template,
  headerMediaUrl = "",
  bodyParams = [],
  urlButtonParams = ["", "", ""],
  useProfileName = false,
  profileNameSlot = 1,
}) {
  const name = template?.name ?? template?.Name ?? "";
  const language = template?.language ?? template?.Language ?? "en_US";
  const body = template?.body ?? template?.bodyText ?? template?.Body ?? "";
  const placeholderCount = template?.placeholderCount ?? template?.PlaceholderCount ?? 0;

  const headerKindRaw =
    template?.headerKind ??
    template?.HeaderKind ??
    (template?.hasImageHeader || template?.HasImageHeader ? "image" : "none");
  const headerKind = String(headerKindRaw || "none").trim().toLowerCase();
  const needsHeaderUrl =
    headerKind === "image" || headerKind === "video" || headerKind === "document";
  const headerOk = !needsHeaderUrl || isValidHttpsUrl(headerMediaUrl);

  const buttons =
    template?.buttonParams ??
    template?.ButtonParams ??
    template?.multiButtons ??
    template?.MultiButtons ??
    [];
  const buttonList = Array.isArray(buttons) ? buttons : [];

  const finalBody = useMemo(() => {
    const slot = useProfileName ? Math.max(1, Number(profileNameSlot || 1)) : null;
    return fillPlaceholders(body || "No content", bodyParams, slot);
  }, [body, bodyParams, useProfileName, profileNameSlot]);

  if (!template) return null;

  return (
    <div className="mt-2 rounded-xl border border-emerald-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {name || "Template preview"}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              {language}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              {placeholderCount} var{placeholderCount === 1 ? "" : "s"}
            </span>
            {headerKind !== "none" && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                  needsHeaderUrl
                    ? headerOk
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {headerKind.toUpperCase()}
                {needsHeaderUrl ? (headerOk ? " • URL set" : " • URL required") : ""}
              </span>
            )}
            {useProfileName && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                Contact → {`{{${Math.max(1, Number(profileNameSlot || 1))}}}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {needsHeaderUrl && (
        <div className="px-4 pt-3">
          <div
            className={`rounded-lg border px-3 py-2 text-[11px] ${
              headerOk
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {headerOk && headerMediaUrl
              ? `Header URL: ${headerMediaUrl}`
              : "Header URL required (https)"}
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="ar-node-body-scroll text-[13px] leading-5 text-slate-700 whitespace-pre-wrap max-h-28 overflow-y-auto pr-1">
          {finalBody || "No content"}
        </div>
      </div>

      {buttonList.length > 0 && (
        <div className="px-4 pb-4 pt-0">
          <div className="space-y-2">
            {buttonList.map((btn, index) => {
              const text =
                String(btn?.buttonText || btn?.text || btn?.Text || "").trim() ||
                "(unnamed)";
              const type = String(
                btn?.buttonType ||
                  btn?.subType ||
                  btn?.SubType ||
                  btn?.type ||
                  btn?.Type ||
                  ""
              ).trim();

              const typeNorm = type.toLowerCase();
              const parameterValue = String(
                btn?.parameterValue ||
                  btn?.ParameterValue ||
                  btn?.targetUrl ||
                  btn?.TargetUrl ||
                  ""
              ).trim();

              const idx =
                typeof btn?.index === "number"
                  ? btn.index
                  : typeof btn?.Index === "number"
                  ? btn.Index
                  : index;

              const isUrl =
                typeNorm === "url" ||
                String(btn?.type || btn?.Type || "").toUpperCase() === "URL";
              const isDynamic = isUrl && parameterValue.includes("{{");
              const param =
                Array.isArray(urlButtonParams) && idx >= 0 && idx <= 2
                  ? String(urlButtonParams[idx] || "").trim()
                  : "";
              const paramOk = !isDynamic || !!param;

              return (
                <div
                  key={`${text}-${index}`}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ${
                    paramOk
                      ? "bg-emerald-600 ring-emerald-700/25"
                      : "bg-emerald-600 ring-red-400/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate">{text}</div>
                    <div className="shrink-0 text-[11px] text-white/80">
                      {type || "button"}
                    </div>
                  </div>
                  {isDynamic && (
                    <div
                      className={`mt-1 text-[11px] ${
                        param ? "text-white/90" : "text-red-200"
                      }`}
                    >
                      {param ? `URL param: ${param}` : "URL param required"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
