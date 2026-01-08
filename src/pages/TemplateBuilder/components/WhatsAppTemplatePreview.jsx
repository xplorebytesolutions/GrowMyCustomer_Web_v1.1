import React from "react";
import {
  ChevronLeft,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Link2,
  Phone,
  CornerDownLeft,
  CheckCheck,
  Loader2,
} from "lucide-react";

function renderBodyWithVars(text, examples = []) {
  if (!text)
    return (
      <span className="text-slate-400 italic">Start typing body text...</span>
    );

  const parts = String(text).split(/(\{\{\d+\}\})/g);
  return parts.map((part, idx) => {
    const isVar = /^\{\{\d+\}\}$/.test(part);
    if (!isVar) return <span key={idx}>{part}</span>;

    const match = part.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 0;
    const val = examples?.[num - 1];

    if (val) {
      return (
        <span
          key={idx}
          className="font-medium text-slate-800 bg-yellow-100 px-1 rounded mx-0.5 border-b border-yellow-300"
          title={`Variable {{${num}}}`}
        >
          {val}
        </span>
      );
    }

    return (
      <span
        key={idx}
        className="px-1 py-0.5 mx-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold text-xs"
        title="Variable placeholder"
      >
        {part}
      </span>
    );
  });
}

function mediaPlaceholder(type) {
  if (type === "VIDEO") return <VideoIcon size={28} />;
  if (type === "DOCUMENT") return <FileText size={28} />;
  return <ImageIcon size={28} />;
}

// Sub-component for handling media (URL vs Handle)
function DraftMediaPreview({ type, url }) {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // Reset state when url/type changes
    setBlobUrl(null);
    setLoading(false);
    setError(false);

    if (!url) return;
    if (type !== "IMAGE" && type !== "VIDEO") return;

    const isDirectUrl = String(url).match(/^(http|blob|data):/i);

    // If it's already a browser-consumable URL, just use it.
    if (isDirectUrl) {
      setBlobUrl(url);
      return;
    }

    // Otherwise, assume it's a Media Handle/ID and fetch via Proxy
    // We need to fetch it as a blob using our authorized client
    setLoading(true);
    // Dynamic import to avoid circular dependency if placed at top level (rare but safe)
    // Actually we can pass axiosClient or import it at top. Assuming top level import exists.
    import("../../../api/axiosClient").then(({ default: client }) => {
        // Encode the ID because Meta handles often contain slashes (e.g. 4/YTU...)
        client.get(`/template-builder/media/${encodeURIComponent(url)}`, { 
          responseType: "blob",
          __silentToast: true // Prevent global 404 toast
        })
          .then((res) => {
             const u = URL.createObjectURL(res.data);
             setBlobUrl(u);
          })
          .catch(() => setError(true))
          .finally(() => setLoading(false));
    });

  }, [url, type]);

  // Cleanup blob on unmount
  React.useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (type === "VIDEO")
    return (
       <video src={blobUrl || url} className="w-full h-full object-cover" controls />
    );

  if (type === "IMAGE") {
     if (error) {
         return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 text-slate-400 p-4 text-center min-h-[140px]">
               <ImageIcon size={32} className="mb-2 opacity-50" />
               <span className="text-xs font-medium">Image Not Uploaded Yet</span>
               <span className="text-[9px] opacity-60 mt-1 max-w-[150px] truncate">Check Template Editor</span>
            </div>
         );
     }
     
     if (loading) {
         return (
            <div className="flex items-center justify-center w-full h-full bg-slate-50 min-h-[140px]">
               <Loader2 className="animate-spin text-emerald-600 opacity-50" size={24} />
            </div>
         );
     }

    return <img src={blobUrl || url} alt="Header" className="w-full h-full object-cover" />;
  }

  return (
    <div className="w-full h-32 flex items-center justify-center bg-slate-100 text-slate-500">
      <FileText size={34} />
    </div>
  );
}

export default function WhatsAppTemplatePreview({ draft }) {
  const headerType = String(draft?.headerType || "NONE").toUpperCase();
  const headerUrl = draft?.headerMediaUrl;
  const examples = Array.isArray(draft?.examples) ? draft.examples : [];
  const buttons = Array.isArray(draft?.buttons) ? draft.buttons : [];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden max-w-[320px] mx-auto sticky top-4">
      <div className="bg-emerald-600 px-4 py-3 flex items-center gap-3 text-white shadow-sm">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <ChevronLeft size={18} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold flex items-center gap-2">
            Test Org
            <span className="w-3 h-3 rounded-full bg-green-400 border-2 border-emerald-600"></span>
          </div>
          <div className="text-[10px] opacity-80">Online</div>
        </div>
        <div className="text-xs font-mono bg-emerald-700 px-2 py-0.5 rounded opacity-60">
          {headerType === "NONE" ? "TEXT" : headerType}
        </div>
      </div>

      <div 
        className="min-h-[450px] p-4 relative"
        style={{
          backgroundColor: "#e5ddd5",
          backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
          backgroundBlendMode: "overlay"
        }}
      >
        <div className="bg-white rounded-lg rounded-tl-none shadow-sm p-1 max-w-[90%] relative mb-4">
          <div className="p-1">
            {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
              <div className="mb-2 rounded-lg bg-slate-100 overflow-hidden relative min-h-[140px] flex items-center justify-center">
                {headerUrl ? (
                  <DraftMediaPreview type={headerType} url={headerUrl} />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                    <div className="text-slate-500 mb-2">
                      {mediaPlaceholder(headerType)}
                    </div>
                    <div className="text-xs font-medium uppercase mb-1">
                      {headerType}
                    </div>
                    <div className="text-[10px] opacity-60">
                      Not uploaded yet
                    </div>
                  </div>
                )}
              </div>
            )}

            {headerType === "TEXT" && draft?.headerText && (
              <div className="px-2 pt-1 pb-1 font-bold text-slate-800 text-[14px]">
                {draft.headerText}
              </div>
            )}

            <div className="px-2 pt-1 pb-1 text-[13px] leading-snug text-slate-800 whitespace-pre-wrap">
              {renderBodyWithVars(draft?.bodyText, examples)}
            </div>

            {draft?.footerText && (
              <div className="px-2 pt-1 pb-1 text-[10px] text-slate-400 mt-1">
                {draft.footerText}
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 text-right px-2 pb-1.5 flex items-center justify-end gap-1">
            12:00 PM <CheckCheck size={14} className="text-blue-400" />
          </div>

          {buttons.length > 0 && (
            <div className="border-t border-slate-100 mt-1">
              {buttons.map((b, idx) => {
                const type = String(b?.type || "").toUpperCase();
                return (
                  <div
                    key={idx}
                    className="h-9 flex items-center justify-center text-emerald-600 font-medium text-xs border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-default gap-2"
                  >
                    {type === "URL" && <Link2 size={14} />}
                    {(type === "PHONE_NUMBER" || type === "PHONE") && (
                      <Phone size={14} />
                    )}
                    {type === "QUICK_REPLY" && <CornerDownLeft size={14} />}
                    <span className="truncate max-w-[220px]">
                      {b?.text || "Button"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

