import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  MarkerType,
} from "@xyflow/react";

/**
 * SmartLabeledEdge
 * - Shows button text as label
 * - If nodes are horizontally close and label is long, it renders the label vertically
 * - Supports selection and your purple style
 *
 * Optional: props.data?.labelVertical = true forces vertical label
 */
export default function SmartLabeledEdge(props) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd = { type: MarkerType.ArrowClosed, color: "#059669" },
    label,
    selected,
    data,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // Heuristic: long label + nodes are close horizontally => use vertical
  const dx = Math.abs(targetX - sourceX);
  const longLabel = String(label || "").length > 12;
  const vertical = data?.labelVertical ?? (longLabel && dx < 220);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: "#059669", strokeWidth: selected ? 2 : 1.5, ...style }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <div
              title={label}
              style={{
                // vertical when needed
                writingMode: vertical ? "vertical-rl" : "horizontal-tb",
                textOrientation: vertical ? "mixed" : "upright",

                background: "#fff",
                padding: "4px 6px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                fontSize: 10,
                color: "#374151",
                lineHeight: 1.1,
                maxHeight: vertical ? 140 : "none",
                maxWidth: vertical ? 18 : 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: vertical ? "normal" : "nowrap",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
