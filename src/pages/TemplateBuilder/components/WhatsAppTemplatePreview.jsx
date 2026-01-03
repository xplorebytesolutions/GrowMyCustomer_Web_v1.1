// 📄 File: src/pages/TemplateBuilder/components/WhatsAppTemplatePreview.jsx
import React from "react";

function renderBodyWithVars(text) {
  if (!text) return <span className="text-slate-400">Body preview…</span>;

  // Highlight {{1}}, {{2}} style placeholders
  const parts = text.split(/(\{\{\d+\}\})/g);
  return parts.map((p, idx) => {
    const isVar = /^\{\{\d+\}\}$/.test(p);
    if (!isVar) return <span key={idx}>{p}</span>;
    return (
      <span
        key={idx}
        className="px-1 py-0.5 mx-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold"
        title="Variable placeholder"
      >
        {p}
      </span>
    );
  });
}

export default function WhatsAppTemplatePreview({ draft }) {
  const headerType = (draft?.headerType || "NONE").toUpperCase();
  const headerUrl = draft?.headerMediaUrl;

  const buttons = Array.isArray(draft?.buttons) ? draft.buttons : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">
            Live Preview
          </div>
          <div className="text-xs text-slate-500">WhatsApp-style rendering</div>
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          {headerType}
        </div>
      </div>

      {/* Phone-ish frame */}
      <div className="p-4 bg-slate-50">
        <div className="mx-auto w-full max-w-sm rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-emerald-600 text-white text-sm font-semibold">
            WhatsApp
          </div>

          <div className="p-4 bg-[linear-gradient(180deg,#f8fafc,white)]">
            <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              {headerType === "IMAGE" && (
                <div className="bg-slate-100">
                  {headerUrl ? (
                    <img
                      src={headerUrl}
                      alt="Header"
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                      Header image not uploaded
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">
                {renderBodyWithVars(draft?.bodyText)}
              </div>

              {/* Footer */}
              {draft?.footerText ? (
                <div className="px-4 pb-3 text-xs text-slate-500">
                  {draft.footerText}
                </div>
              ) : null}

              {/* Buttons */}
              {buttons.length > 0 ? (
                <div className="border-t border-slate-200">
                  {buttons.slice(0, 3).map((b, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 text-sm text-emerald-700 font-semibold text-center border-b last:border-b-0 border-slate-200"
                    >
                      {b?.text || `Button ${idx + 1}`}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-3 text-[11px] text-slate-400">
              Preview is approximate; Meta may render slightly differently.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
