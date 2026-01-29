// 📄 src/pages/AutoReplyBuilder/components/AutoReplyCanvas.jsx
import React, {
  useCallback,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

import { toast } from "react-toastify";
import { Button } from "../../../components/ui/button";
import { Settings } from "lucide-react";
import AutoReplyNodeStart from "./AutoReplyNodeStart";
import AutoReplyNodeBlock from "./AutoReplyNodeBlock";
import AutoReplyNodeEditor from "./AutoReplyNodeEditor";

const nodeTypes = {
  start: AutoReplyNodeStart,
  message: AutoReplyNodeBlock,
  template: AutoReplyNodeBlock,
  wait: AutoReplyNodeBlock,
  tag: AutoReplyNodeBlock,
  cta_flow: AutoReplyNodeBlock, // 🆕 CTA Flow nodes use the same block renderer
};

const createGuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
};

const createStartNode = () => {
  const nodeId = createGuid();
  return {
    id: nodeId,
    type: "start",
    position: { x: 100, y: 100 },
    data: { id: nodeId, label: "start" },
  };
};

const AutoReplyCanvas = forwardRef((props, ref) => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [currentFlowId, setCurrentFlowId] = useState(null);
  const [flowName, setFlowName] = useState("");
  const [triggerKeywords, setTriggerKeywords] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState([createStartNode()]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // 🔄 tracking for “unsaved changes”
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // 🔧 NEW: advanced settings popover visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  // easy access to advanced props from parent
  const {
    onOpenFlows,
    onSave,
    flowName: initialFlowName,
    triggerKeywords: initialTriggerKeywords,
    matchMode,
    priority,
    onMatchModeChange,
    onPriorityChange,
  } = props;

  // --------------------------------------------------
  // snapshot helpers – used for dirty-state tracking
  // --------------------------------------------------
  const computeSnapshot = (
    nodesArg,
    edgesArg,
    flowNameArg,
    triggerKeywordsArg,
    flowIdArg
  ) => {
    const simpleNodes = (nodesArg || []).map(n => ({
      id: n.id,
      type: n.type,
      x: n.position?.x ?? 0,
      y: n.position?.y ?? 0,
      label: n.data?.label || "",
    }));

    const simpleEdges = (edgesArg || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    }));

    return JSON.stringify({
      id: flowIdArg ?? null,
      name: flowNameArg || "",
      triggerKeyword: triggerKeywordsArg || "",
      nodes: simpleNodes,
      edges: simpleEdges,
    });
  };

  // recompute dirty flag whenever graph or meta changes
  useEffect(() => {
    if (!lastSavedSnapshot) {
      // no baseline yet (initial load / brand new flow)
      return;
    }

    const snap = computeSnapshot(
      nodes,
      edges,
      flowName,
      triggerKeywords,
      currentFlowId
    );
    setIsDirty(snap !== lastSavedSnapshot);
  }, [
    nodes,
    edges,
    flowName,
    triggerKeywords,
    currentFlowId,
    lastSavedSnapshot,
  ]);

  // --------------------------------------------------
  // deletion helpers
  // --------------------------------------------------
  const handleDeleteNode = useCallback(
    nodeId => {
      setNodes(nds => nds.filter(n => n.id !== nodeId));
      setEdges(eds =>
        eds.filter(e => e.source !== nodeId && e.target !== nodeId)
      );
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const confirmDeleteNode = useCallback(
    nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.type === "start") {
        setPendingDeleteId(nodeId);
      } else {
        handleDeleteNode(nodeId);
      }
    },
    [nodes, handleDeleteNode]
  );

  // --------------------------------------------------
  // ReactFlow callbacks
  // --------------------------------------------------
  const onConnect = useCallback(
    params => {
      const customId = `reactflow__edge-${params.source}${
        params.sourceHandle ? params.sourceHandle : ""
      }-${params.target}`;
      setEdges(eds =>
        addEdge(
          {
            ...params,
            id: customId,
            type: "smoothstep",
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onEdgeClick = useCallback(
    (event, edge) => {
      event.stopPropagation();
      setEdges(eds => eds.filter(e => e.id !== edge.id));
    },
    [setEdges]
  );

  const onDrop = useCallback(
    event => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newId = createGuid();
      const newNode = {
        id: newId,
        type,
        position,
        data: {
          id: newId,
          label: type,
          config: {},
          onDelete: confirmDeleteNode,
        },
      };

      setNodes(nds => nds.concat(newNode));
    },
    [reactFlowInstance, confirmDeleteNode, setNodes]
  );

  const onDragOver = useCallback(event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeSave = updatedNode => {
    setNodes(prev =>
      prev.map(n => (n.id === updatedNode.id ? updatedNode : n))
    );
    setSelectedNode(null);
  };

  // --------------------------------------------------
  // SAVE FLOW – builds DTO payload and delegates up
  // --------------------------------------------------
  const handleSaveFlow = async () => {
    if (!reactFlowInstance) return;

    const flow = reactFlowInstance.toObject();
    const nodeMap = {};
    flow.nodes.forEach(node => {
      nodeMap[node.id] = node.data?.id || node.id;
    });

    const processedEdges =
      flow.edges?.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceNodeId: nodeMap[edge.source],
        targetNodeId: nodeMap[edge.target],
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
      })) || [];

    const processedNodes =
      flow.nodes?.map(node => {
        const id = node.data?.id || node.id;
        const nodeConfig =
          typeof node.data?.config === "object"
            ? JSON.parse(JSON.stringify(node.data.config))
            : {};

        return {
          id,
          type: node.type,
          position: { x: node.position.x, y: node.position.y },
          data: {
            label: node.data?.label || "",
            config: nodeConfig,
          },
        };
      }) || [];

    const payload = {
      id: currentFlowId,
      name: flowName.trim() || initialFlowName || "Untitled Flow",
      triggerKeyword: triggerKeywords.trim() || initialTriggerKeywords || "",
      nodes: processedNodes,
      edges: processedEdges,
    };

    if (typeof onSave === "function") {
      await onSave(payload);

      // update baseline snapshot on successful save
      const savedSnapshot = computeSnapshot(
        processedNodes,
        processedEdges,
        payload.name,
        payload.triggerKeyword,
        currentFlowId
      );
      setLastSavedSnapshot(savedSnapshot);
      setIsDirty(false);
      return;
    }

    toast.error("❌ Save function is not connected.");
  };

  // --------------------------------------------------
  // expose helpers to parent via ref
  // --------------------------------------------------
  useImperativeHandle(ref, () => ({
    loadFlow: flowData => {
      try {
        setSelectedNode(null);
        setPendingDeleteId(null);

        setCurrentFlowId(flowData?.id ?? null);
        setFlowName(flowData?.name || "");
        setTriggerKeywords(flowData?.triggerKeyword || flowData?.keyword || "");

        const loadedNodes =
          flowData?.nodes?.map(node => {
            let config = {};
            if (typeof node.configJson === "string") {
              try {
                config = JSON.parse(node.configJson || "{}") || {};
              } catch {
                config = {};
              }
            } else if (node.configJson && typeof node.configJson === "object") {
              config = node.configJson;
            }

            return {
              id: node.id,
              type: node.nodeType,
              position: { x: node.positionX ?? 0, y: node.positionY ?? 0 },
              data: {
                id: node.id,
                label: node.label || node.nodeName || node.nodeType,
                config,
              },
            };
          }) || [];

        const nodeIds = new Set(loadedNodes.map(n => n.id));
        const loadedEdges = [];
        loadedNodes.forEach(node => {
          const outgoing = node.data?.config?.outgoing || [];
          outgoing.forEach((edgeCfg, idx) => {
            if (!edgeCfg?.targetId || !nodeIds.has(edgeCfg.targetId)) return;

            loadedEdges.push({
              id: `${node.id}->${edgeCfg.targetId}-${idx}`,
              source: node.id,
              target: edgeCfg.targetId,
              sourceHandle: edgeCfg.handle || null,
            });
          });
        });

        const nextNodes = loadedNodes.length > 0 ? loadedNodes : [createStartNode()];

        setNodes(nextNodes);
        setEdges(loadedEdges);

        // establish clean baseline for dirty tracking
        const baselineSnapshot = computeSnapshot(
          nextNodes,
          loadedEdges,
          flowData?.name || "",
          flowData?.triggerKeyword || flowData?.keyword || "",
          flowData?.id ?? null
        );
        setLastSavedSnapshot(baselineSnapshot);
        setIsDirty(false);
      } catch (err) {
        console.error("Failed to load flow into canvas", err);
        toast.error("âŒ Failed to load flow on canvas");

        const fallbackNodes = [createStartNode()];
        setNodes(fallbackNodes);
        setEdges([]);
        setLastSavedSnapshot(computeSnapshot(fallbackNodes, [], "", "", null));
        setIsDirty(false);
      }
    },
    handleSaveFlow,
    saveFlow: handleSaveFlow,
    clearFlow: () => {
      setCurrentFlowId(null);
      setFlowName("");
      setTriggerKeywords("");
      setSelectedNode(null);
      setPendingDeleteId(null);

      const defaultNodes = [createStartNode()];

      setNodes(defaultNodes);
      setEdges([]);

      const baselineSnapshot = computeSnapshot(defaultNodes, [], "", "", null);
      setLastSavedSnapshot(baselineSnapshot);
      setIsDirty(false);
    },
  }));

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <ReactFlowProvider>
      {/* Compact header with inputs + buttons in one row */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Flow name + triggers */}
          <div className="flex-1 flex flex-col md:flex-row md:gap-4">
            <div className="flex-1 mb-2 md:mb-0">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Flow name
              </label>
              <input
                type="text"
                value={flowName}
                onChange={e => setFlowName(e.target.value)}
                placeholder="e.g. Welcome Flow"
                className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
              />
            </div>

            {/* Trigger + settings */}
            <div className="flex-1 relative">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Trigger keywords (comma separated)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={triggerKeywords}
                  onChange={e => setTriggerKeywords(e.target.value)}
                  placeholder="hi, hello, hey"
                  className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                />

                {/* ⚙ Advanced settings button (emerald) */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(prev => !prev)}
                  className={`inline-flex items-center justify-center h-8 w-8 rounded-md border text-xs font-medium transition-colors ${
                    showAdvanced
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  }`}
                  title="Flow matching settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Advanced settings popover */}
              {showAdvanced && (
                <div className="absolute right-0 mt-2 z-30 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">
                    Flow Settings (Advanced)
                  </h4>

                  {/* Match mode */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Match mode
                    </label>
                    <select
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                      value={matchMode || "Word"}
                      onChange={e =>
                        onMatchModeChange?.(e.target.value || "Word")
                      }
                    >
                      <option value="Word">Word (default)</option>
                      <option value="Exact">Exact</option>
                      <option value="StartsWith">StartsWith</option>
                      <option value="Contains">Contains</option>
                    </select>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Controls how trigger keywords are matched against incoming
                      messages. If you’re not sure, keep it on <b>Word</b>.
                    </p>
                  </div>

                  {/* Priority */}
                  <div className="mb-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs"
                      value={priority}
                      onChange={e => onPriorityChange?.(e.target.value)}
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Higher priority wins when multiple flows match the same
                      message. Leave <b>0</b> if you’re not sure.
                    </p>
                  </div>

                  {/* Reset / Close row */}
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      className="text-[11px] text-slate-500 hover:text-slate-700"
                      onClick={() => {
                        onMatchModeChange?.("Word");
                        onPriorityChange?.(0);
                      }}
                    >
                      Reset to defaults
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-emerald-700 font-medium"
                      onClick={() => setShowAdvanced(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions – Save + Flows */}
          <div className="flex items-center gap-2 md:ml-4">
            {/* Save flow button – emerald */}
            <Button
              type="button"
              size="sm"
              onClick={handleSaveFlow}
              className="h-8 px-3 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              💾 Save Flow
            </Button>

            {/* Flow list button – emerald */}
            <Button
              type="button"
              size="sm"
              onClick={onOpenFlows}
              className="h-8 px-3 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              <span className="mr-1 text-[11px]">☰</span>
              Flows
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={reactFlowWrapper}
        className="w-full h-[calc(100vh-10rem)]"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes.map(n => ({
            ...n,
            data: { ...n.data, onDelete: confirmDeleteNode },
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onInit={setReactFlowInstance}
          fitView
          nodeTypes={nodeTypes}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>

        <AutoReplyNodeEditor
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={handleNodeSave}
        />

        {pendingDeleteId && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-xl max-w-sm w-full">
              <h2 className="text-lg font-bold text-red-600 mb-2">
                Delete Start Block?
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This is the starting point of the flow. Deleting it may break
                connected logic.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="text-sm px-3 py-1 rounded bg-gray-200"
                  onClick={() => setPendingDeleteId(null)}
                >
                  Cancel
                </button>
                <button
                  className="text-sm px-3 py-1 rounded bg-red-600 text-white"
                  onClick={() => {
                    handleDeleteNode(pendingDeleteId);
                    setPendingDeleteId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
});

export default AutoReplyCanvas;
