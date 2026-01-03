// 📄 src/pages/AutoReplyBuilder/components/AutoReplyNodeBlock.jsx
import React from "react";
import { Handle, Position } from "reactflow";

// Helper: show "Step 1" instead of "node_1" etc.
function formatStepLabel(rawId) {
  if (!rawId) return "Unnamed";
  const match = /^node_(\d+)$/i.exec(rawId);
  if (match) {
    return `Step ${match[1]}`;
  }
  return rawId;
}

export default function AutoReplyNodeBlock({ data }) {
  const type = data.label; // e.g. "message", "template", "cta_flow"
  const config = data?.config || {};

  const labelMap = {
    message: "💬 Message",
    template: "📄 Template",
    wait: "⏱ Wait",
    tag: "🏷 Tag",
    cta_flow: "🔀 CTA Flow", // 🆕 CTA Flow node label
  };

  const bgColorMap = {
    message: "border-blue-300 bg-blue-50",
    template: "border-emerald-300 bg-emerald-50",
    wait: "border-yellow-300 bg-yellow-50",
    tag: "border-pink-300 bg-pink-50",
    cta_flow: "border-emerald-300 bg-emerald-50", // 🆕 CTA Flow color
  };

  const blockLabel = labelMap[type] || "🧩 Block";
  const blockStyle = bgColorMap[type] || "border-gray-300 bg-gray-50";

  const body = config.body || config.text || "";
  const buttons = Array.isArray(config.multiButtons) ? config.multiButtons : [];

  // 🆕 CTA flow name, saved from the node editor
  const ctaFlowName = config.ctaFlowName || "";

  return (
    <div
      className={`relative group rounded-md border px-2 py-1.5 min-h-[70px] w-[220px] max-w-[220px] text-[7px] text-zinc-800 transition-all duration-200 ${blockStyle} hover:shadow-md hover:scale-[1.02]`}
    >
      {type !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: "#ccc" }}
        />
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#ccc" }}
      />

      {/* Delete button */}
      {data?.onDelete && (
        <button
          onClick={e => {
            e.stopPropagation();
            data.onDelete(data.id);
          }}
          className="absolute top-1 right-1.5 text-[7px] text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
          title="Delete this block"
        >
          ✕
        </button>
      )}

      {/* Header */}
      <div className="font-semibold text-[8px] leading-tight mb-0.5">
        {blockLabel}
      </div>

      {/* Step label */}
      <div className="text-[7px] text-emerald-600 font-medium mb-0.5">
        {formatStepLabel(data.id)}
      </div>

      {/* 🆕 CTA Flow info */}
      {type === "cta_flow" && (
        <div className="mt-0.5 text-[7px] text-emerald-700">
          Flow:{" "}
          <span className="font-semibold">
            {ctaFlowName || "No CTA flow selected"}
          </span>
        </div>
      )}

      {/* Body – compact preview with thin scroll (for message/template) */}
      {body && type !== "cta_flow" && (
        <div className="ar-node-body-scroll text-[7px] text-zinc-700 whitespace-pre-wrap max-h-14 overflow-y-auto pr-1">
          {body}
        </div>
      )}

      {/* Template buttons */}
      {type === "template" && buttons.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {buttons.map((btn, index) => (
            <div
              key={index}
              className="relative rounded bg-emerald-100 px-2 py-1 text-[7px] text-emerald-800 border border-emerald-200 flex items-center justify-center text-center"
            >
              {btn.buttonText || btn.text || "(unnamed)"}

              <Handle
                type="source"
                position={Position.Right}
                id={`button-${index}`}
                style={{
                  top: "50%",
                  transform: "translateY(-50%)",
                  right: -5,
                  width: 7,
                  height: 7,
                  background: "#10b981",
                  borderRadius: "50%",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Tag info */}
      {type === "tag" && config.tags?.length > 0 && (
        <div className="mt-0.5 text-[7px] text-zinc-600">
          Tags: {config.tags.join(", ")}
        </div>
      )}

      {/* Wait info */}
      {type === "wait" && config.seconds && (
        <div className="mt-0.5 text-[7px] text-zinc-600">
          Wait for {config.seconds} seconds
        </div>
      )}
    </div>
  );
}
