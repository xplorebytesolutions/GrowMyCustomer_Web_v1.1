import React, { useEffect, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { X, MessageSquare } from "lucide-react";

const requiresHeaderMediaUrl = templateType => {
  const t = String(templateType || "").trim().toLowerCase();
  return t === "image_template" || t === "video_template" || t === "document_template";
};

const headerMediaKindLabel = templateType => {
  const t = String(templateType || "").trim().toLowerCase();
  if (t === "image_template") return "Image";
  if (t === "video_template") return "Video";
  if (t === "document_template") return "Document";
  return "Media";
};

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

const countBodyPlaceholders = body => {
  if (!body) return 0;
  const s = String(body);
  const positional = s.match(/\{\{\s*\d+\s*\}\}/g) || [];
  const named = s.match(/\{\{\s*\}\}/g) || [];
  return positional.length + named.length;
};

export default function FlowNodeBubble({
  id,
  data = {},
  onDelete = () => {},
  readonly = false,
  onDataChange = () => {},
  visualDebug = false,
}) {
  const {
    templateName = "Untitled Step",
    templateType = "text_template",
    headerMediaUrl = "",
    messageBody = "",
    bodyParams = [],
    urlButtonParams = [],
    buttons = [],
    requiredTag = "",
    requiredSource = "",
    isUnreachable = false,

    // greeting fields
    useProfileName = false,
    profileNameSlot = 1,
  } = data;

  const isTextTemplate = (templateType || "").toLowerCase() === "text_template";
  const placeholderCount = useMemo(
    () => countBodyPlaceholders(messageBody),
    [messageBody]
  );
  const canUseProfile = isTextTemplate && placeholderCount > 0;

  const needsHeaderUrl = requiresHeaderMediaUrl(templateType);
  const headerKind = useMemo(() => headerMediaKindLabel(templateType), [templateType]);
  const headerUrlOk = !needsHeaderUrl || isValidHttpsUrl(headerMediaUrl);

  const dynamicUrlButtons = useMemo(() => {
    const btns = Array.isArray(buttons) ? buttons : [];
    return btns
      .filter(b => {
        const type = String(b?.type || "").trim().toUpperCase();
        const subType = String(b?.subType || "").trim().toLowerCase();
        const mask = String(b?.value || "").trim();
        const isUrl = type === "URL" || subType === "url";
        const isDynamic = mask.includes("{{");
        return isUrl && isDynamic;
      })
      .map(b => ({
        text: (b?.text || "").toString(),
        index: typeof b?.index === "number" ? b.index : 0,
      }))
      .filter(b => b.index >= 0 && b.index <= 2)
      .sort((a, b) => a.index - b.index);
  }, [buttons]);

  // keep trigger info sync'd with first button
  useEffect(() => {
    if (buttons.length > 0) {
      const triggerText = buttons[0]?.text || "";
      onDataChange({
        triggerButtonText: triggerText,
        triggerButtonType: "cta",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buttons]);

  // clamp/disable when template/body changes
  useEffect(() => {
    if (!canUseProfile) {
      if (useProfileName || profileNameSlot != null) {
        onDataChange({ useProfileName: false, profileNameSlot: undefined });
      }
    } else if (useProfileName) {
      const clamped = Math.max(
        1,
        Math.min(profileNameSlot ?? 1, placeholderCount)
      );
      if (clamped !== (profileNameSlot ?? 1)) {
        onDataChange({ profileNameSlot: clamped });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseProfile, placeholderCount]);

  // Keep bodyParams array aligned to current placeholder count (index 0 => {{1}})
  useEffect(() => {
    const current = Array.isArray(bodyParams) ? bodyParams : [];
    if (current.length === placeholderCount) return;
    const next = Array.from({ length: placeholderCount }, (_, i) =>
      (current[i] ?? "").toString()
    );
    onDataChange({ bodyParams: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholderCount]);

  // Ensure urlButtonParams has stable length (max 3). Index 0 => button index "0".
  useEffect(() => {
    const current = Array.isArray(urlButtonParams) ? urlButtonParams : [];
    if (current.length === 3) return;
    const next = Array.from({ length: 3 }, (_, i) => (current[i] ?? "").toString());
    onDataChange({ urlButtonParams: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlButtonParams]);

  return (
    <div className="bg-white shadow-md rounded-xl border border-emerald-200 w-72 p-4 relative">
      {!readonly && (
        <button
          onClick={() => onDelete(id)}
          className="absolute top-1.5 right-1.5 text-red-500 hover:text-red-700"
          title="Delete this step"
          aria-label="Delete step"
        >
          <X size={16} />
        </button>
      )}

      {isUnreachable && (
        <div
          className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-semibold mb-2 inline-block"
          title="This step has no incoming trigger. It may never run."
        >
          ⚠️ Unreachable Step
        </div>
      )}

      <div className="mb-2">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <MessageSquare size={16} className="text-emerald-600 shrink-0" />
          <div
            className="min-w-0 truncate text-sm font-medium text-gray-900"
          >
            {templateName}
          </div>
        </div>
      </div>

      <div
        className="text-sm text-gray-700 whitespace-pre-wrap mb-3 overflow-y-auto"
        style={{ maxHeight: 180, overscrollBehavior: "contain" }}
      >
        💬 {messageBody || "Message body preview..."}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {!!requiredTag && (
          <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
            🎯 Tag: {requiredTag}
          </span>
        )}
        {!!requiredSource && (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
            🔗 Source: {requiredSource}
          </span>
        )}
        {useProfileName && canUseProfile && (
          <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
            {/* render e.g. {{1}} safely as a string */}
            👤 Profile → {`{{${profileNameSlot}}}`}
          </span>
        )}
        {needsHeaderUrl && !headerUrlOk && (
          <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
            ⚠️ {headerKind} URL required
          </span>
        )}
      </div>

      {needsHeaderUrl && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {headerKind} URL (https)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              inputMode="url"
              placeholder="https://..."
              className={`nodrag w-full border rounded px-2 py-1 text-sm outline-none focus:ring-2 ${
                headerUrlOk
                  ? "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
                  : "border-red-400 focus:border-red-500 focus:ring-red-100"
              }`}
              disabled={readonly}
              value={headerMediaUrl}
              onChange={e => onDataChange({ headerMediaUrl: e.target.value })}
            />
            {headerMediaUrl && (
              <a
                className="nodrag text-xs px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap"
                href={headerMediaUrl}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                title={`Open ${headerKind.toLowerCase()} URL`}
              >
                Open
              </a>
            )}
          </div>
          <div className="mt-1 text-[11px] leading-tight text-slate-500">
            {headerKind} templates require an HTTPS URL. Use a publicly accessible link.
          </div>
        </div>
      )}

      {placeholderCount > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">
              Body variables
            </label>
            <span className="text-[11px] text-slate-500">
              {placeholderCount} var{placeholderCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-2">
            {Array.from({ length: placeholderCount }, (_, i) => {
              const slot = i + 1;
              const isProfileSlot =
                !!useProfileName && (profileNameSlot ?? 1) === slot;
              const value = Array.isArray(bodyParams) ? bodyParams[i] : "";

              return (
                <div key={slot} className="flex items-center gap-2">
                  <div className="w-10 text-[11px] text-slate-500 shrink-0">
                    {`{{${slot}}}`}
                  </div>
                  <input
                    className={`nodrag w-full border rounded px-2 py-1 text-sm outline-none focus:ring-2 ${
                      isProfileSlot
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
                    }`}
                    disabled={readonly || isProfileSlot}
                    value={isProfileSlot ? "WhatsApp Profile Name" : value || ""}
                    placeholder={isProfileSlot ? "" : "Enter value"}
                    onChange={e => {
                      const next = Array.isArray(bodyParams)
                        ? [...bodyParams]
                        : Array.from({ length: placeholderCount }, () => "");
                      next[i] = e.target.value;
                      onDataChange({ bodyParams: next });
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-1 text-[11px] leading-tight text-slate-500">
            Fill values for the template body placeholders. The Profile Name toggle can auto-fill one slot.
          </div>
        </div>
      )}

      {dynamicUrlButtons.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">
              URL button values
            </label>
            <span className="text-[11px] text-slate-500">
              {dynamicUrlButtons.length} dynamic
            </span>
          </div>

          <div className="space-y-2">
            {dynamicUrlButtons.map(b => {
              const idx = b.index;
              const value = Array.isArray(urlButtonParams)
                ? (urlButtonParams[idx] || "")
                : "";
              const ok = String(value || "").trim().length > 0;
              const label = b.text?.trim() || `Button ${idx + 1}`;

              return (
                <div key={`${idx}-${label}`} className="flex items-center gap-2">
                  <div className="w-16 text-[11px] text-slate-500 shrink-0">
                    {`Btn ${idx + 1}`}
                  </div>
                  <input
                    className={`nodrag w-full border rounded px-2 py-1 text-sm outline-none focus:ring-2 ${
                      ok
                        ? "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
                        : "border-red-400 focus:border-red-500 focus:ring-red-100"
                    }`}
                    disabled={readonly}
                    value={value}
                    placeholder={label}
                    onChange={e => {
                      const next = Array.isArray(urlButtonParams)
                        ? [...urlButtonParams]
                        : ["", "", ""];
                      next[idx] = e.target.value;
                      onDataChange({ urlButtonParams: next });
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-1 text-[11px] leading-tight text-slate-500">
            Required only for templates with dynamic URL buttons (URL contains {"{{1}}"}). Provide the placeholder value.
          </div>
        </div>
      )}

      {canUseProfile && (
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">
              Use WhatsApp Profile Name
            </label>
            <input
              type="checkbox"
              className="nodrag"
              disabled={readonly}
              checked={!!useProfileName}
              onChange={e => {
                const checked = e.target.checked;
                if (!checked) {
                  onDataChange({
                    useProfileName: false,
                    profileNameSlot: undefined,
                  });
                } else {
                  const clamped = Math.max(
                    1,
                    Math.min(profileNameSlot ?? 1, placeholderCount)
                  );
                  onDataChange({
                    useProfileName: true,
                    profileNameSlot: clamped,
                  });
                }
              }}
            />
          </div>

          {useProfileName && (
            <div className="mt-2">
              <label className="text-xs block mb-1">Slot ({"{{n}}"})</label>
              <select
                className="nodrag w-full border rounded px-2 py-1 text-sm"
                disabled={readonly}
                value={profileNameSlot ?? 1}
                onChange={e => {
                  const n = parseInt(e.target.value, 10) || 1;
                  onDataChange({
                    profileNameSlot: Math.max(1, Math.min(n, placeholderCount)),
                  });
                }}
              >
                {Array.from(
                  { length: Math.max(placeholderCount, 1) },
                  (_, i) => i + 1
                ).map(n => (
                  <option key={n} value={n}>
                    {`{{${n}}}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {buttons.map((btn, index) => {
          const text = (btn.text || "").trim() || `Button ${index + 1}`;
          const handleId = `btn-${index}`;
          return (
            <button
              type="button"
              key={`${text}-${index}`}
              className="nodrag relative w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-emerald-700/30 transition-colors hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              title={text}
              onClick={e => e.stopPropagation()}
            >
              <span className="block pr-6 text-center select-none truncate">
                {text}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={handleId}
                title={`Drag to connect: ${text}`}
                aria-label={`Connect from ${text}`}
                style={{
                  background: "#059669",
                  right: "-10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  border: "2px solid #fff",
                  borderRadius: 9999,
                  boxShadow: "0 0 0 2px rgba(5,150,105,0.25)",
                  cursor: "default",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: -18,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 28,
                  background: "transparent",
                  pointerEvents: "none",
                }}
              />
            </button>
          );
        })}
      </div>

      {buttons.length === 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          title="Drag to connect"
          style={{
            background: "#10b981",
            width: 16,
            height: 16,
            border: "2px solid #fff",
            borderRadius: 9999,
            boxShadow: "0 0 0 2px rgba(16,185,129,0.25)",
          }}
        />
      )}

      <Handle
        type="target"
        position={Position.Top}
        id="incoming"
        title="Drop a connection here"
        style={{
          background: "#10b981",
          width: 16,
          height: 16,
          border: "2px solid #fff",
          borderRadius: 9999,
          boxShadow: "0 0 0 2px rgba(16,185,129,0.25)",
        }}
      />
    </div>
  );
}

// import React, { useEffect } from "react";
// import { Handle, Position } from "@xyflow/react";
// import { X, MessageSquare } from "lucide-react";

// export default function FlowNodeBubble({
//   id,
//   data,
//   onDelete,
//   readonly,
//   onDataChange,
//   visualDebug = false, // not rendered
// }) {
//   const {
//     templateName,
//     messageBody,
//     buttons = [],
//     requiredTag,
//     requiredSource,
//     isUnreachable,
//   } = data;

//   // Keep trigger info in sync with first button
//   useEffect(() => {
//     if (buttons.length > 0 && onDataChange) {
//       const triggerText = buttons[0]?.text || "";
//       onDataChange({
//         ...data,
//         triggerButtonText: triggerText,
//         triggerButtonType: "cta",
//       });
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [buttons]);

//   return (
//     <div className="bg-white shadow-md rounded-xl border border-purple-200 w-72 p-4 relative">
//       {/* ❌ Delete */}
//       {!readonly && (
//         <button
//           onClick={() => onDelete(id)}
//           className="absolute top-1.5 right-1.5 text-red-500 hover:text-red-700"
//           title="Delete this step"
//           aria-label="Delete step"
//         >
//           <X size={16} />
//         </button>
//       )}

//       {/* ⚠️ Warning */}
//       {isUnreachable && (
//         <div
//           className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-semibold mb-2 inline-block"
//           title="This step has no incoming trigger. It may never run."
//         >
//           ⚠️ Unreachable Step
//         </div>
//       )}

//       {/* Header — minimal (icon + name) with divider */}
//       <div className="mb-2">
//         <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
//           <MessageSquare
//             size={16}
//             className="text-purple-600 shrink-0"
//             aria-hidden
//           />
//           <div
//             className="min-w-0 truncate text-sm font-medium text-gray-900"
//             title={templateName || "Untitled Step"}
//           >
//             {templateName || "Untitled Step"}
//           </div>
//         </div>
//       </div>

//       {/* 💬 Body — scrollable to avoid crowding */}
//       <div
//         className="text-sm text-gray-700 whitespace-pre-wrap mb-3 overflow-y-auto"
//         style={{
//           maxHeight: 180, // control the vertical footprint
//           overscrollBehavior: "contain",
//           scrollbarWidth: "thin", // Firefox
//           WebkitOverflowScrolling: "touch", // iOS momentum
//         }}
//         title={messageBody}
//       >
//         💬 {messageBody || "Message body preview..."}
//       </div>

//       {/* 🎯 Badges */}
//       <div className="flex flex-wrap gap-2 mb-2">
//         {!!requiredTag && (
//           <span
//             className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-semibold"
//             title={`Only contacts with tag "${requiredTag}" will receive this step.`}
//           >
//             🎯 Tag: {requiredTag}
//           </span>
//         )}
//         {!!requiredSource && (
//           <span
//             className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-semibold"
//             title={`This step runs only if Source = "${requiredSource}"`}
//           >
//             🔗 Source: {requiredSource}
//           </span>
//         )}
//       </div>

//       {/* 🔘 Buttons + source handles (no connection status UI) */}
//       <div className="flex flex-col gap-2">
//         {buttons.map((btn, index) => {
//           const text = (btn.text || "").trim() || `Button ${index + 1}`;
//           return (
//             <div
//               key={`${text}-${index}`}
//               className="relative bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded shadow-sm"
//               title={text}
//             >
//               <div className="pr-6 text-center select-none">🔘 {text}</div>

//               {/* Right source handle (enlarged hit area) */}
//               <Handle
//                 type="source"
//                 position={Position.Right}
//                 id={text} // keep equal to button text for mapping
//                 title={`Drag to connect: ${text}`}
//                 aria-label={`Connect from ${text}`}
//                 style={{
//                   background: "#9333ea",
//                   right: "-10px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   width: 16,
//                   height: 16,
//                   border: "2px solid #fff",
//                   borderRadius: 9999,
//                   boxShadow: "0 0 0 2px rgba(147,51,234,0.25)",
//                   cursor: "crosshair",
//                 }}
//               />
//               {/* Invisible larger hotspot to make grabbing easier */}
//               <div
//                 style={{
//                   position: "absolute",
//                   right: -18,
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   width: 36,
//                   height: 28,
//                   background: "transparent",
//                   pointerEvents: "none",
//                 }}
//               />
//             </div>
//           );
//         })}
//       </div>

//       {/* 🟣 Fallback source if no buttons */}
//       {buttons.length === 0 && (
//         <Handle
//           type="source"
//           position={Position.Bottom}
//           id="default"
//           title="Drag to connect"
//           style={{
//             background: "#9333ea",
//             width: 16,
//             height: 16,
//             border: "2px solid #fff",
//             borderRadius: 9999,
//             boxShadow: "0 0 0 2px rgba(147,51,234,0.25)",
//           }}
//         />
//       )}

//       {/* 🔵 Incoming target */}
//       <Handle
//         type="target"
//         position={Position.Top}
//         id="incoming"
//         title="Drop a connection here"
//         style={{
//           background: "#9333ea",
//           width: 16,
//           height: 16,
//           border: "2px solid #fff",
//           borderRadius: 9999,
//           boxShadow: "0 0 0 2px rgba(147,51,234,0.25)",
//         }}
//       />
//     </div>
//   );
// }
