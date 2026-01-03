// 📄 src/pages/DeveloperNotes/components/QueryBlock.jsx
import React, { useMemo, useState } from "react";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

async function copyToClipboard(text) {
  if (!text) return;
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "true");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export default function QueryBlock({
  content,
  formatLabel = "SQL",
  defaultCollapsedLines = 12,
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = useMemo(() => String(content || "").split(/\r?\n/), [content]);
  const shouldCollapse = lines.length > defaultCollapsedLines;

  const displayText = useMemo(() => {
    if (!shouldCollapse) return String(content || "");
    if (expanded) return String(content || "");
    return lines.slice(0, defaultCollapsedLines).join("\n");
  }, [content, defaultCollapsedLines, expanded, lines, shouldCollapse]);

  const handleCopy = async () => {
    try {
      await copyToClipboard(String(content || ""));
      toast.success("Copied to clipboard", { autoClose: 900 });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error("Failed to copy", { autoClose: 1200 });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold tracking-wide text-purple-200 border border-purple-400/20">
            Format: {formatLabel}
          </span>
          {shouldCollapse ? (
            <span className="text-[11px] text-slate-300">
              {expanded ? `${lines.length} lines` : `Showing ${defaultCollapsedLines} / ${lines.length} lines`}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {shouldCollapse ? (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expand
                </>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            className={cx(
              "inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700",
              "focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            )}
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
        </div>
      </div>

      <pre className="m-0 p-4 text-[12px] leading-5 overflow-auto max-h-[420px]">
        <code>{displayText}</code>
        {!expanded && shouldCollapse ? (
          <div className="mt-3 text-[11px] text-slate-400">
            <span className="opacity-80">…</span>
          </div>
        ) : null}
      </pre>
    </div>
  );
}

