// 📄 src/pages/AutoReplyBuilder/components/AutoReplySidebar.jsx

import React from "react";
import {
  MessageSquare,
  PlayCircle,
  Hourglass,
  Tag,
  FileText,
  GitBranch, // 🆕 for CTA Flow
} from "lucide-react";

const NODE_TYPES = [
  { type: "start", label: "Start", icon: PlayCircle },
  { type: "message", label: "Message", icon: MessageSquare },
  { type: "template", label: "Template", icon: FileText },
  { type: "cta_flow", label: "CTA Flow", icon: GitBranch }, // 🆕 CTA Flow node
  { type: "tag", label: "Tag", icon: Tag },
  { type: "wait", label: "Wait", icon: Hourglass },
];

export default function AutoReplySidebar() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">
        Blocks &amp; Actions
      </h3>

      <div className="space-y-3">
        {NODE_TYPES.map(node => {
          const Icon = node.icon;
          return (
            <div
              key={node.type}
              onDragStart={e => onDragStart(e, node.type)}
              draggable
              className="cursor-move flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:shadow-md hover:border-emerald-500 transition-all"
            >
              <Icon size={18} className="text-emerald-600" />
              <span className="text-sm font-medium text-gray-800">
                {node.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
