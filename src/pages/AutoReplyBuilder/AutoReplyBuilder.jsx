// 📄 src/pages/AutoReplyBuilder/AutoReplyBuilder.jsx
import React, { useRef, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AutoReplyCanvas from "./components/AutoReplyCanvas";
import AutoReplySidebar from "./components/AutoReplySidebar";
import AutoReplyFlowsModal from "./components/AutoReplyFlowsListModal";
import { toast } from "react-toastify";
import axiosClient from "../../api/axiosClient";
import { Bot } from "lucide-react";

export default function AutoReplyBuilder() {
  const canvasRef = useRef();
  const [searchParams] = useSearchParams();
  const flowId = searchParams.get("flowId");
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // flows modal
  const [showFlowsModal, setShowFlowsModal] = useState(false);

  // 🔧 flow-level advanced settings (optional)
  const [matchMode, setMatchMode] = useState("Word"); // Word, Exact, StartsWith, Contains
  const [priority, setPriority] = useState(0); // higher wins when multiple flows match

  const toGuidOrNull = value =>
    typeof value === "string" && /^[0-9a-fA-F-]{36}$/.test(value)
      ? value
      : null;

  // ✅ SAVE FLOW handler (connected to <AutoReplyCanvas />)
  const handleSaveFlow = async payload => {
    try {
      const nodesDto =
        payload.nodes?.map((node, idx) => {
          // Map canvas graph into AutoReplyNodeDto expected by backend
          const config = {
            ...(node.data?.config || {}),
            outgoing:
              payload.edges
                ?.filter(e => e.source === node.id)
                .map(e => ({
                  targetId:
                    payload.nodes.find(n => n.id === e.target)?.id || e.target,
                  handle: e.sourceHandle || null,
                })) || [],
          };

          return {
            // Send null for non-Guid values so backend can generate new ids
            id: toGuidOrNull(node.id),
            nodeType: node.type,
            label: node.data?.label || "",
            nodeName: node.data?.label || node.id,
            configJson: JSON.stringify(config),
            positionX: node.position?.x ?? 0,
            positionY: node.position?.y ?? 0,
            order: idx,
          };
        }) || [];

      // 🔧 normalize priority (fallback to 0 if invalid)
      const parsedPriority = Number(priority);
      const safePriority = Number.isNaN(parsedPriority) ? 0 : parsedPriority;

      const dto = {
        id: toGuidOrNull(payload.id) || null,
        name: payload.name?.trim() || "Untitled Flow",
        triggerKeyword: payload.triggerKeyword?.trim() || "",
        isActive: true,
        // 🔥 advanced matching settings (optional)
        matchMode: matchMode || "Word",
        priority: safePriority,
        nodes: nodesDto,
      };

      const { data } = await axiosClient.post("autoreplyflows", dto);
      toast.success("✅ Flow saved successfully!");

      if (data?.id) {
        await loadFlowById(data.id); // reload to ensure we have the latest server copy/id
      }
      setSidebarRefreshKey(k => k + 1);
    } catch (err) {
      toast.error("❌ Failed to save flow");
      console.error("Save error:", err);
    }
  };

  const handleFlowDeleted = () => {
    canvasRef.current?.clearFlow?.();
    // 🔄 reset advanced settings to defaults when flow is cleared
    setMatchMode("Word");
    setPriority(0);
    setSidebarRefreshKey(k => k + 1);
  };

  const loadFlowById = async id => {
    if (!id) return;
    try {
      const { data } = await axiosClient.get(`autoreplyflows/${id}`);

      // 🔥 apply advanced settings from backend (with smart defaults)
      const incomingMode = data?.matchMode;
      const safeMode =
        typeof incomingMode === "string" && incomingMode.trim().length > 0
          ? incomingMode
          : "Word";

      const incomingPriority = data?.priority;
      const safeIncomingPriority =
        typeof incomingPriority === "number" && !Number.isNaN(incomingPriority)
          ? incomingPriority
          : 0;

      setMatchMode(safeMode);
      setPriority(safeIncomingPriority);

      // keep existing behaviour for canvas
      canvasRef.current?.loadFlow(data);
      toast.success("✅ Flow loaded");
    } catch (err) {
      toast.error("❌ Error loading flow");
      console.error(err);
    }
  };

  useEffect(() => {
    if (flowId) {
      loadFlowById(flowId);
    }
  }, [flowId]);

  return (
    <div className="flex overflow-hidden bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* Sidebar (left) */}
      <div className="w-72 border-r border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold mb-4 text-zinc-800 flex items-center gap-2">
          <Bot className="text-emerald-600" size={22} />
          Auto Reply Builder
        </h2>
        <AutoReplySidebar
          key={sidebarRefreshKey}
          onSelectFlow={loadFlowById}
          onDeleteFlow={handleFlowDeleted}
        />
      </div>

      {/* Main Area (right) */}
      <div className="flex-1 flex flex-col">
        {/* Canvas + Settings */}
        <div className="flex-1 bg-white relative overflow-auto">
          <AutoReplyCanvas
            ref={canvasRef}
            flowName=""
            triggerKeywords=""
            onSave={handleSaveFlow}
            // 🔗 let the canvas header "Flows" button open the modal
            onOpenFlows={() => setShowFlowsModal(true)}
          />

          {/* 🔧 Flow-level advanced settings (optional) */}
        </div>
      </div>

      {/* Flows Modal */}
      <AutoReplyFlowsModal
        open={showFlowsModal}
        onClose={() => setShowFlowsModal(false)}
        onFlowSelected={flowIdOrFlow => {
          // You were passing `flow.id` earlier; now we support both id or object.
          const id =
            typeof flowIdOrFlow === "string"
              ? flowIdOrFlow
              : flowIdOrFlow?.id ?? null;
          if (id) {
            loadFlowById(id);
          }
        }}
      />
    </div>
  );
}
