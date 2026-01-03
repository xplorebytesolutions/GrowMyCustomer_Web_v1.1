import React, { useEffect, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { X, MessageSquare } from "lucide-react";

const countBodyPlaceholders = body => {
  if (!body) return 0;
  const m = String(body).match(/\{\{\s*\d+\s*\}\}/g);
  return m ? m.length : 0;
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
    messageBody = "",
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
            title={templateName}
          >
            {templateName}
          </div>
        </div>
      </div>

      <div
        className="text-sm text-gray-700 whitespace-pre-wrap mb-3 overflow-y-auto"
        style={{ maxHeight: 180, overscrollBehavior: "contain" }}
        title={messageBody}
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
      </div>

      {canUseProfile && (
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">
              Use WhatsApp Profile Name
            </label>
            <input
              type="checkbox"
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
                className="w-full border rounded px-2 py-1 text-sm"
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
          return (
            <div
              key={`${text}-${index}`}
              className="relative bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded shadow-sm"
              title={text}
            >
              <div className="pr-6 text-center select-none">🔘 {text}</div>
              <Handle
                type="source"
                position={Position.Right}
                id={text}
                title={`Drag to connect: ${text}`}
                aria-label={`Connect from ${text}`}
                style={{
                  background: "#10b981",
                  right: "-10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  border: "2px solid #fff",
                  borderRadius: 9999,
                  boxShadow: "0 0 0 2px rgba(16,185,129,0.25)",
                  cursor: "crosshair",
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
            </div>
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
