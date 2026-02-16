import React from "react";

const TEMPLATE_BG =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1f2eb' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3Cg fill='%23a8dadc' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm-20-18c9.941 0 18 8.059 18 18s-8.059 18-18 18S-8 39.941-8 30s8.059-18 18-18z'/%3E%3C/g%3E%3Cg fill='%23e5ddd5' fill-opacity='0.3'%3E%3Cpath d='M50 50c0-5.523-4.477-10-10-10s-10 4.477-10 10 4.477 10 10 10 10-4.477 10-10zm-10-8c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

const renderTemplateBody = (body, parameters) => {
  const source = String(body || "");
  if (!source) return "Template body preview";

  const values = Array.isArray(parameters) ? parameters : [];
  const nodes = [];
  const regex = /\{\{(\d+)\}\}/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(source)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    const slot = Number(match[1]);
    const value = String(values[slot - 1] ?? "").trim();

    if (start > lastIndex) {
      nodes.push(
        <React.Fragment key={`txt-${key++}`}>
          {source.slice(lastIndex, start)}
        </React.Fragment>
      );
    }

    if (value) {
      nodes.push(
        <React.Fragment key={`val-${key++}`}>{value}</React.Fragment>
      );
    } else {
      nodes.push(
        <span key={`ph-${key++}`} className="text-emerald-600 font-medium">
          {`{{${slot}}}`}
        </span>
      );
    }

    lastIndex = end;
  }

  if (lastIndex < source.length) {
    nodes.push(
      <React.Fragment key={`tail-${key++}`}>
        {source.slice(lastIndex)}
      </React.Fragment>
    );
  }

  return nodes.length ? nodes : "Template body preview";
};

const isImageHeader = headerKind => String(headerKind || "").toLowerCase() === "image";

export default function CompactTemplatePreviewCard({
  templateBody = "",
  parameters = [],
  headerMediaUrl = "",
  headerMediaPreviewUrl = "",
  headerKind = "none",
  buttons = [],
  templateName = "",
}) {
  const bodyNodes = renderTemplateBody(templateBody, parameters);
  const [mediaBroken, setMediaBroken] = React.useState(false);
  const mediaKind = String(headerKind || "none").toLowerCase();
  const previewSrc = String(headerMediaPreviewUrl || "").trim();
  const rawSrc = String(headerMediaUrl || "").trim();
  const effectiveSrc = previewSrc || (rawSrc.startsWith("handle:") ? "" : rawSrc);
  const hasHeader = !!(effectiveSrc || rawSrc);
  const showRealImage = hasHeader && isImageHeader(mediaKind) && !!effectiveSrc && !mediaBroken;
  const showRealVideo = hasHeader && mediaKind === "video" && !!effectiveSrc && !mediaBroken;
  const safeButtons = Array.isArray(buttons) ? buttons : [];

  React.useEffect(() => {
    setMediaBroken(false);
  }, [effectiveSrc, mediaKind]);

  return (
    <div className="mx-auto w-full max-w-[380px] rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className="rounded-t-xl p-3"
        style={{ backgroundColor: "#e5ddd5", backgroundImage: TEMPLATE_BG }}
      >
        <div className="relative rounded-2xl rounded-tl-sm border border-slate-200 bg-white shadow-sm">
          <div className="absolute -left-1.5 top-2 h-0 w-0 border-b-[7px] border-r-[10px] border-t-[7px] border-b-transparent border-r-white border-t-transparent" />

          {hasHeader ? (
            <div className="overflow-hidden rounded-t-2xl border-b border-slate-200">
              {showRealImage ? (
                <img
                  src={effectiveSrc}
                  alt="Template header"
                  className="h-32 w-full object-cover"
                  onError={() => setMediaBroken(true)}
                />
              ) : showRealVideo ? (
                <video
                  src={effectiveSrc}
                  className="h-32 w-full bg-black object-cover"
                  controls
                  muted
                  onError={() => setMediaBroken(true)}
                />
              ) : (
                <div className="flex h-24 items-center justify-center bg-slate-100 text-[10px] text-slate-500">
                  {mediaKind === "document"
                    ? "Document attached"
                    : mediaKind === "video"
                    ? "Video attached"
                    : "Header media attached"}
                </div>
              )}
            </div>
          ) : null}

          <div className="px-3 py-2.5">
            <div className="whitespace-pre-wrap text-[14px] leading-[1.4] text-slate-800">
              {bodyNodes}
            </div>
            <div className="mt-1 text-right text-[11px] text-slate-400">14:06</div>
          </div>

          {safeButtons.length > 0 ? (
            <div className="border-t border-slate-200">
              {safeButtons.map((button, index) => (
                <button
                  key={`${String(button?.text || "button")}-${index}`}
                  type="button"
                  disabled
                  className={`block w-full px-3 py-1.5 text-center text-[14px] font-medium text-sky-600 ${
                    index > 0 ? "border-t border-slate-200" : ""
                  }`}
                >
                  {String(button?.text || `Button ${index + 1}`)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="truncate border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-500">
        {templateName || "Selected template"}
      </div>
    </div>
  );
}
