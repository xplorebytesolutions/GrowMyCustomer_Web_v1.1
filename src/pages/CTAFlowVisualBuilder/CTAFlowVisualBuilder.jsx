// src/pages/CTAFlowVisualBuilder/CTAFlowVisualBuilder.jsx
import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  ConnectionMode,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Eye, Minus } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import TemplatePickerModal from "./components/TemplatePickerModal";
import FlowNodeBubble from "./components/FlowNodeBubble";
import {
  saveVisualFlow,
  getVisualFlowById,
  updateVisualFlow,
  publishFlow,
  forkFlow,
  getFlowUsage,
} from "./ctaFlowVisualApi";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import dagre from "dagre";
import SmartLabeledEdge from "./components/edges/SmartLabeledEdge";

const GRID = 16;
const NODE_DEFAULT = { width: 260, height: 140 };

function CTAFlowVisualBuilderInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodesRef = useRef([]);
  const [showPicker, setShowPicker] = useState(false);
  const [flowName, setFlowName] = useState("");
  const flowNameRef = useRef(null);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [readonly, setReadonly] = useState(false);

  // policy state
  const [isPublished, setIsPublished] = useState(false);
  const [republishNeeded, setRepublishNeeded] = useState(false);
  const [lockInfo, setLockInfo] = useState({ locked: false, campaigns: [] });
  const [forkModalOpen, setForkModalOpen] = useState(false);

  // async state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dirty, setDirty] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const mode = searchParams.get("mode"); // 'edit' | 'view' | null
  const flowId = searchParams.get("id");
  const visualDebug = true;

  // figure out source tab for Back button
  const fromTab = (searchParams.get("from") || "draft").toLowerCase();
  const backTab = fromTab === "published" ? "published" : "draft";

  const goBackToManager = useCallback(() => {
    if (!readonly && dirty) {
      const ok = window.confirm("You have unsaved changes. Leave this page?");
      if (!ok) return;
    }
    navigate(`/app/cta-flow/flow-manager?tab=${backTab}`);
  }, [readonly, dirty, backTab, navigate]);

  useEffect(() => {
    nodesRef.current = [...nodes];
  }, [nodes]);

  // warn on unload if dirty
  useEffect(() => {
    const onBeforeUnload = e => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // --- Node helpers
  const handleDeleteNode = useCallback(
    nodeId => {
      if (readonly) return;
      setDirty(true);
      setNodes(nds => nds.filter(n => n.id !== nodeId));
      setEdges(eds =>
        eds.filter(e => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [readonly, setNodes, setEdges]
  );

  const handleNodeDataChange = useCallback(
    (nodeId, newData) => {
      setDirty(true);
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        )
      );
    },
    [setNodes]
  );

  const nodeTypes = useMemo(
    () => ({
      customBubble: props => (
        <FlowNodeBubble
          {...props}
          onDelete={handleDeleteNode}
          onDataChange={newData => handleNodeDataChange(props.id, newData)}
          readonly={readonly}
          visualDebug={visualDebug}
        />
      ),
    }),
    [handleDeleteNode, readonly, visualDebug, handleNodeDataChange]
  );

  const edgeTypes = useMemo(() => ({ smart: SmartLabeledEdge }), []);

  // --- Load / Bootstrap + policy checks
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (mode === "edit" || mode === "view") {
        try {
          const data = await getVisualFlowById(flowId);

          const builtNodes = (data.nodes || []).map((node, index) => ({
            id: node.id,
            type: "customBubble",
            position: {
              x: node.positionX ?? 120 + index * 120,
              y: node.positionY ?? 150 + (index % 5) * 60,
            },
            data: {
              templateName: node.templateName,
              templateType: node.templateType,
              messageBody: node.messageBody,
              triggerButtonText: node.triggerButtonText || "",
              triggerButtonType: node.triggerButtonType || "cta",
              requiredTag: node.requiredTag || "",
              requiredSource: node.requiredSource || "",
              useProfileName: !!node.useProfileName,
              profileNameSlot:
                typeof node.profileNameSlot === "number" &&
                node.profileNameSlot > 0
                  ? node.profileNameSlot
                  : 1,
              buttons: (node.buttons || []).map((btn, i) => ({
                text: btn.text,
                type: btn.type,
                subType: btn.subType,
                value: btn.value,
                targetNodeId: btn.targetNodeId || null,
                index: typeof btn.index === "number" ? btn.index : i,
              })),
            },
          }));

          const builtEdges = (data.edges || []).map(edge => ({
            id: `e-${edge.fromNodeId}-${edge.toNodeId}-${
              edge.sourceHandle || "h"
            }`,
            source: edge.fromNodeId,
            target: edge.toNodeId,
            sourceHandle: edge.sourceHandle || null,
            type: "smart",
            animated: true,
            style: { stroke: "#9333ea" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
            label: edge.sourceHandle || "",
          }));

          const nodesWithIncoming = new Set(builtEdges.map(e => e.target));
          const nodesWithWarnings = builtNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              isUnreachable: false,
              hasNoIncoming: !nodesWithIncoming.has(node.id),
            },
          }));

          setNodes(nodesWithWarnings);
          setEdges(builtEdges);
          setFlowName(data.flowName || "Untitled Flow");
          setIsPublished(!!data.isPublished);
          setDirty(false);

          // policy: if editing a published flow, check attachment
          if (mode === "edit" && data.isPublished) {
            try {
              const usage = await getFlowUsage(flowId);
              if (usage?.campaigns?.length > 0) {
                setLockInfo({ locked: true, campaigns: usage.campaigns });
                setForkModalOpen(true);
                setReadonly(true);
              } else {
                setReadonly(false);
              }
            } catch {
              setLockInfo({ locked: true, campaigns: [] });
              setForkModalOpen(true);
              setReadonly(true);
            }
          } else {
            setReadonly(mode === "view");
          }

          // initial fit
          setTimeout(() => fitView({ padding: 0.25 }), 80);
        } catch {
          toast.error("❌ Failed to load flow");
        } finally {
          setLoading(false);
        }
      } else {
        // creating new flow
        setNodes([]);
        setEdges([]);
        setFlowName("Untitled Flow");
        setIsPublished(false);
        setReadonly(false);
        setDirty(false);
        setLoading(false);
        setTimeout(() => fitView({ padding: 0.25 }), 80);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, mode]);

  // Auto-fit when viewing, and refit on window resize
  useEffect(() => {
    if (mode !== "view") return;
    const t = setTimeout(() => fitView({ padding: 0.25 }), 80);
    const onResize = () => fitView({ padding: 0.25 });
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [mode, nodes.length, edges.length, fitView]);

  // --- Add template
  const handleTemplateSelect = ({ name, type, body, buttons = [] }) => {
    if (readonly) return;
    const id = uuidv4();
    const newNode = {
      id,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      type: "customBubble",
      data: {
        templateName: name || "Untitled",
        templateType: type || "text_template",
        messageBody: body || "Message body preview...",
        triggerButtonText: buttons[0]?.text || "",
        triggerButtonType: "cta",
        useProfileName: false,
        profileNameSlot: 1,
        buttons: buttons.map((btn, idx) => ({
          text: btn.text || "",
          type: btn.type || "QUICK_REPLY",
          subType: btn.subType || "",
          value: btn.parameterValue || "",
          targetNodeId: null,
          index: idx,
        })),
      },
    };
    setDirty(true);
    setNodes(nds => [...nds, newNode]);
    setShowPicker(false);
    toast.success(
      `✅ Step added with ${type?.replace("_", " ") || "template"}`
    );
    setTimeout(() => fitView({ padding: 0.25 }), 50);
  };

  // --- Connection rules
  const isValidConnection = useCallback(
    params => {
      if (!params?.source || !params?.sourceHandle) return false;
      const duplicate = edges.some(
        e =>
          e.source === params.source && e.sourceHandle === params.sourceHandle
      );
      return !duplicate;
    },
    [edges]
  );

  const onConnect = useCallback(
    params => {
      if (readonly) return;
      setDirty(true);
      const label = params.sourceHandle || "";

      setEdges(eds =>
        addEdge(
          {
            ...params,
            id: uuidv4(),
            type: "smart",
            animated: true,
            style: { stroke: "#9333ea" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
            label,
          },
          eds
        )
      );

      setNodes(nds =>
        nds.map(node => {
          if (node.id !== params.source) return node;
          const sourceHandle = params.sourceHandle || "";
          const updatedButtons = [...(node.data.buttons || [])];

          const idx = updatedButtons.findIndex(
            b =>
              (b.text || "").toLowerCase().trim() ===
              sourceHandle.toLowerCase().trim()
          );

          if (idx >= 0) {
            updatedButtons[idx] = {
              ...updatedButtons[idx],
              targetNodeId: params.target,
            };
          } else {
            const free = updatedButtons.findIndex(b => !b.targetNodeId);
            if (free >= 0)
              updatedButtons[free] = {
                ...updatedButtons[free],
                targetNodeId: params.target,
              };
          }

          return { ...node, data: { ...node.data, buttons: updatedButtons } };
        })
      );
    },
    [readonly, setEdges, setNodes]
  );

  // --- Keyboard UX
  useEffect(() => {
    const onKey = e => {
      if (readonly) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        setDirty(true);
        setNodes(nds => nds.filter(n => !n.selected));
        setEdges(eds => eds.filter(ed => !ed.selected));
      }
      if (e.key === "Escape") {
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        setEdges(eds => eds.map(ed => ({ ...ed, selected: false })));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readonly, setNodes, setEdges]);

  // --- Auto layout (dagre)
  const applyLayout = useCallback(
    (direction = "LR") => {
      const g = new dagre.graphlib.Graph();
      g.setGraph({
        rankdir: direction,
        nodesep: 50,
        ranksep: 90,
        marginx: 20,
        marginy: 20,
      });
      g.setDefaultEdgeLabel(() => ({}));

      nodes.forEach(n => {
        const width = n?.measured?.width || NODE_DEFAULT.width;
        const height = n?.measured?.height || NODE_DEFAULT.height;
        g.setNode(n.id, { width, height });
      });
      edges.forEach(e => g.setEdge(e.source, e.target));

      dagre.layout(g);

      const laidOut = nodes.map(n => {
        const { x, y } = g.node(n.id);
        const width = n?.measured?.width || NODE_DEFAULT.width;
        const height = n?.measured?.height || NODE_DEFAULT.height;
        return { ...n, position: { x: x - width / 2, y: y - height / 2 } };
      });

      setDirty(true);
      setNodes(laidOut);
      setTimeout(() => fitView({ padding: 0.25 }), 50);
    },
    [nodes, edges, setNodes, fitView]
  );

  // --- Build payload (draft by default; publish is separate)
  const buildPayload = () => {
    const transformedNodes = nodes
      .filter(n => n?.data?.templateName)
      .map(node => ({
        Id: node.id,
        TemplateName: node.data.templateName || "Untitled",
        TemplateType: node.data.templateType || "text_template",
        MessageBody: node.data.messageBody || "",
        PositionX: node.position?.x || 0,
        PositionY: node.position?.y || 0,
        TriggerButtonText: node.data.triggerButtonText || "",
        TriggerButtonType: node.data.triggerButtonType || "cta",
        RequiredTag: node.data.requiredTag || "",
        RequiredSource: node.data.requiredSource || "",
        UseProfileName: !!node.data.useProfileName,
        ProfileNameSlot:
          typeof node.data.profileNameSlot === "number" &&
          node.data.profileNameSlot > 0
            ? node.data.profileNameSlot
            : 1,
        Buttons: (node.data.buttons || [])
          .filter(btn => (btn.text || "").trim().length > 0)
          .map((btn, idx) => ({
            Text: (btn.text || "").trim(),
            Type: btn.type || "QUICK_REPLY",
            SubType: btn.subType || "",
            Value: btn.value || "",
            TargetNodeId: btn.targetNodeId || null,
            Index: typeof btn.index === "number" ? btn.index : idx,
          })),
      }));

    const transformedEdges = edges.map(edge => ({
      FromNodeId: edge.source,
      ToNodeId: edge.target,
      SourceHandle: edge.sourceHandle || "",
    }));

    return {
      FlowName: flowName || "Untitled",
      IsPublished: false, // always draft; publish is explicit
      Nodes: transformedNodes,
      Edges: transformedEdges,
    };
  };

  // --- Save Draft
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const payload = buildPayload();

      if (mode === "edit" && flowId) {
        const res = await updateVisualFlow(flowId, payload);
        if (res?.needsRepublish) setRepublishNeeded(true);
        toast.success("✅ Flow updated (draft)");
      } else {
        const res = await saveVisualFlow(payload); // create new draft
        if (res?.flowId) {
          navigate(`/app/cta-flow/flow-manager?tab=draft`);
          return;
        }
        toast.success("✅ Flow saved (draft)");
      }
      setDirty(false);
      navigate(`/app/cta-flow/flow-manager?tab=draft`);
    } catch (error) {
      console.error("❌ Save draft failed: ", error);
      if (error?.response?.status === 409) {
        const camps = error?.response?.data?.campaigns || [];
        setLockInfo({ locked: true, campaigns: camps });
        setForkModalOpen(true);
        setReadonly(true);
      } else {
        toast.error("❌ Failed to save draft");
      }
    } finally {
      setSaving(false);
    }
  };

  // --- Publish / Republish
  const handlePublish = async () => {
    try {
      setSaving(true);

      if (mode === "edit" && flowId) {
        const payload = buildPayload();
        await updateVisualFlow(flowId, payload);
        await publishFlow(flowId);
        setRepublishNeeded(false);
        setIsPublished(true);
        setDirty(false);
        toast.success("✅ Flow published");
        navigate("/app/cta-flow/flow-manager?tab=published");
        return;
      }

      // NEW flow: create as draft, get id, then publish that id
      const createPayload = { ...buildPayload(), IsPublished: false };
      const res = await saveVisualFlow(createPayload);
      const newId = res?.flowId;

      if (newId) {
        await publishFlow(newId);
        toast.success("✅ Flow created & published");
        navigate("/app/cta-flow/flow-manager?tab=published");
        return;
      }

      toast.success("✅ Flow created (but publish step uncertain)");
      navigate("/app/cta-flow/flow-manager?tab=published");
    } catch (error) {
      console.error("❌ Publish failed: ", error);
      if (error?.response?.status === 409) {
        const camps = error?.response?.data?.campaigns || [];
        setLockInfo({ locked: true, campaigns: camps });
        setForkModalOpen(true);
        setReadonly(true);
      } else {
        toast.error("❌ Failed to publish");
      }
    } finally {
      setSaving(false);
    }
  };

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "smart",
      animated: true,
      style: { stroke: "#9333ea" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
    }),
    []
  );

  return (
    <div className="p-6 relative bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* Page-level spinner overlay */}
      {(loading || saving) && (
        <div className="absolute inset-0 z-[60] bg-white/70 backdrop-blur-[1px] grid place-items-center">
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow border">
            <svg
              className="animate-spin h-5 w-5 text-emerald-600"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="text-sm text-gray-700">
              {loading ? "Loading..." : "Working..."}
            </span>
          </div>
        </div>
      )}

      {/* ===== Header: title on left, ALL actions to top-right ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Left: Title + Name */}
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            🧠 CTA Flow Visual Builder
          </h2>

          {/* Flow name input / badge inline with title */}
          {readonly ? (
            <span className="truncate max-w-[40ch] px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-sm font-medium">
              {flowName || "Untitled Flow"}
            </span>
          ) : (
            <input
              id="flowName"
              name="flowName"
              ref={flowNameRef}
              value={flowName}
              onChange={e => {
                setFlowName(e.target.value);
                setDirty(true);
              }}
              placeholder="Add flow name"
              className="truncate max-w-[40ch] border border-gray-300 px-3 py-1.5 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          )}
        </div>

        {/* Right: Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Back / Manage — keep both as small, neutral actions */}
          <button
            onClick={goBackToManager}
            className="px-3 py-2 rounded-md text-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            title={`Back to ${
              backTab === "published" ? "Published" : "Drafts"
            }`}
            disabled={saving}
          >
            ← Back to {backTab === "published" ? "Published" : "Drafts"}
          </button>

          <button
            onClick={() =>
              navigate(`/app/cta-flow/flow-manager?tab=${backTab}`)
            }
            className="px-3 py-2 rounded-md text-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            title="Manage all flows"
            disabled={saving}
          >
            ▤ Manage Flows
          </button>

          {/* Primary actions (hidden in readonly) */}
          {!readonly && (
            <>
              <button
                onClick={() => setShowPicker(true)}
                className="px-3 py-2 rounded-md text-sm bg-emerald-600 text-white shadow hover:bg-emerald-700"
                disabled={saving}
              >
                ➕ Add Step
              </button>

              <button
                onClick={handleSaveDraft}
                className="px-3 py-2 rounded-md text-sm bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
                disabled={saving}
              >
                💾 Save Draft
              </button>

              <button
                onClick={handlePublish}
                className="px-3 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                disabled={saving}
              >
                🚀 {isPublished ? "Republish" : "Publish"}
              </button>
            </>
          )}
        </div>
      </div>
      {/* 🔧 CHANGED: removed “➕ Add New Flow” from header; all buttons are now on the right */}

      {/* Republish banner (kept for clarity) */}
      {!readonly && mode === "edit" && republishNeeded && (
        <div className="mb-3 rounded-md border bg-amber-50 text-amber-800 px-3 py-2 text-sm flex items-center justify-between">
          <div>
            Changes saved as <span className="font-semibold">draft</span>. Click{" "}
            <span className="font-semibold">Republish</span> to make them live.
          </div>
          <button
            onClick={handlePublish}
            className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs"
            disabled={saving}
          >
            Republish
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="h-[70vh] border rounded-xl bg-gray-50 relative">
        {/* Minimap + tools */}
        <div className="absolute bottom-5 right-4 z-50 flex gap-2">
          <button
            onClick={() => setShowMiniMap(prev => !prev)}
            className="bg-emerald-600 text-white p-2 rounded-full shadow hover:bg-emerald-700"
            title={showMiniMap ? "Hide MiniMap" : "Show MiniMap"}
          >
            {showMiniMap ? <Minus size={15} /> : <Eye size={15} />}
          </button>

          <div className="flex items-center gap-2 bg-white/90 px-2 py-1 rounded-full border">
            <button
              onClick={() => fitView({ padding: 0.25 })}
              className="text-xs px-2 py-1 rounded hover:bg-gray-100 font-medium"
              title="Fit to screen"
            >
              Fit
            </button>
            <button
              onClick={() => zoomIn()}
              className="text-xs px-2 py-1 rounded hover:bg-gray-100"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => zoomOut()}
              className="text-xs px-2 py-1 rounded hover:bg-gray-100"
              title="Zoom Out"
            >
              −
            </button>

            {!readonly && (
              <>
                <button
                  onClick={() => applyLayout("LR")}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                  title="Auto-layout (Left→Right)"
                >
                  Auto TB
                </button>
                <button
                  onClick={() => applyLayout("TB")}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                  title="Auto-layout (Top→Bottom)"
                >
                  Auto LR
                </button>
              </>
            )}
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(e, edge) => {
            if (!readonly) {
              setDirty(true);
              setEdges(eds => eds.filter(ed => ed.id !== edge.id));
            }
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Strict}
          isValidConnection={isValidConnection}
          snapToGrid
          snapGrid={[GRID, GRID]}
          panOnScroll
          zoomOnPinch
          panOnDrag={[1, 2]}
          selectionOnDrag
          nodesDraggable={!readonly}
          nodesConnectable={!readonly}
          elementsSelectable={!readonly}
        >
          {showMiniMap && (
            <MiniMap
              nodeColor="#9333ea"
              nodeStrokeWidth={2}
              maskColor="rgba(255,255,255,0.6)"
            />
          )}
          <Controls />
          <Background variant="dots" gap={GRID} size={1} />
        </ReactFlow>
      </div>

      {/* 🔧 CHANGED: Footer actions removed (buttons now live in header) */}

      {/* Fork modal: when published & attached */}
      {forkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setForkModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Editing is blocked for this flow
                </h3>
                <p className="text-sm text-gray-600">
                  This flow is <span className="font-medium">published</span>{" "}
                  and attached to active campaign(s). To make changes, create a{" "}
                  <span className="font-medium">new draft version</span>.
                </p>
              </div>
            </div>

            <div className="max-h-60 overflow-auto rounded-lg border divide-y mb-4">
              {lockInfo.campaigns.map(c => (
                <div key={c.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                      {c.status || "—"}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                    <div>
                      Created:{" "}
                      <span className="font-medium text-gray-800">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleString("en-IN")
                          : "—"}
                      </span>
                    </div>
                    <div>
                      Created by:{" "}
                      <span className="font-medium text-gray-800">
                        {c.createdBy || "—"}
                      </span>
                    </div>
                    <div>
                      Scheduled:{" "}
                      <span className="font-medium text-gray-800">
                        {c.scheduledAt
                          ? new Date(c.scheduledAt).toLocaleString("en-IN")
                          : "—"}
                      </span>
                    </div>
                    <div>
                      First sent:{" "}
                      <span className="font-medium text-gray-800">
                        {c.firstSentAt
                          ? new Date(c.firstSentAt).toLocaleString("en-IN")
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {lockInfo.campaigns.length === 0 && (
                <div className="p-3 text-sm text-gray-600">
                  Could not load campaign details. You can still create a new
                  draft version.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                onClick={() => setForkModalOpen(false)}
              >
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!flowId) return;
                    const { flowId: newId } = await forkFlow(flowId);
                    setForkModalOpen(false);
                    toast.success("✅ New draft version created");
                    navigate(
                      `/app/cta-flow/visual-builder?id=${newId}&mode=edit`
                    );
                  } catch (e) {
                    console.error(e);
                    toast.error("❌ Failed to create draft copy");
                  }
                }}
                className="px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Create new draft version
              </button>
            </div>
          </div>
        </div>
      )}

      <TemplatePickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}

export default function CTAFlowVisualBuilder() {
  return (
    <ReactFlowProvider>
      <CTAFlowVisualBuilderInner />
    </ReactFlowProvider>
  );
}

// // src/pages/CTAFlowVisualBuilder/CTAFlowVisualBuilder.jsx
// import React, {
//   useCallback,
//   useState,
//   useEffect,
//   useMemo,
//   useRef,
// } from "react";
// import {
//   ReactFlow,
//   ReactFlowProvider,
//   Background,
//   Controls,
//   MiniMap,
//   useNodesState,
//   useEdgesState,
//   addEdge,
//   MarkerType,
//   ConnectionMode,
//   useReactFlow,
// } from "@xyflow/react";
// import "@xyflow/react/dist/style.css";
// import { Eye, Minus } from "lucide-react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import TemplatePickerModal from "./components/TemplatePickerModal";
// import FlowNodeBubble from "./components/FlowNodeBubble";
// import {
//   saveVisualFlow,
//   getVisualFlowById,
//   updateVisualFlow,
//   publishFlow,
//   forkFlow,
//   getFlowUsage,
// } from "./ctaFlowVisualApi";
// import { v4 as uuidv4 } from "uuid";
// import { toast } from "react-toastify";
// import dagre from "dagre";
// import SmartLabeledEdge from "./components/edges/SmartLabeledEdge";

// const GRID = 16;
// const NODE_DEFAULT = { width: 260, height: 140 };

// function CTAFlowVisualBuilderInner() {
//   const [nodes, setNodes, onNodesChange] = useNodesState([]);
//   const [edges, setEdges, onEdgesChange] = useEdgesState([]);
//   const nodesRef = useRef([]);
//   const [showPicker, setShowPicker] = useState(false);
//   const [flowName, setFlowName] = useState("");
//   const flowNameRef = useRef(null);
//   const [showMiniMap, setShowMiniMap] = useState(false);
//   const [readonly, setReadonly] = useState(false);

//   // policy state
//   const [isPublished, setIsPublished] = useState(false);
//   const [republishNeeded, setRepublishNeeded] = useState(false);
//   const [lockInfo, setLockInfo] = useState({ locked: false, campaigns: [] });
//   const [forkModalOpen, setForkModalOpen] = useState(false);

//   // async state
//   const [saving, setSaving] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const [dirty, setDirty] = useState(false);

//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
//   const { fitView, zoomIn, zoomOut } = useReactFlow();

//   const mode = searchParams.get("mode"); // 'edit' | 'view' | null
//   const flowId = searchParams.get("id");
//   const visualDebug = true;

//   // figure out source tab for Back button
//   const fromTab = (searchParams.get("from") || "draft").toLowerCase();
//   const backTab = fromTab === "published" ? "published" : "draft";

//   const goBackToManager = useCallback(() => {
//     if (!readonly && dirty) {
//       const ok = window.confirm("You have unsaved changes. Leave this page?");
//       if (!ok) return;
//     }
//     navigate(`/app/cta-flow/flow-manager?tab=${backTab}`);
//   }, [readonly, dirty, backTab, navigate]);

//   useEffect(() => {
//     nodesRef.current = [...nodes];
//   }, [nodes]);

//   // warn on unload if dirty
//   useEffect(() => {
//     const onBeforeUnload = e => {
//       if (!dirty) return;
//       e.preventDefault();
//       e.returnValue = "";
//     };
//     window.addEventListener("beforeunload", onBeforeUnload);
//     return () => window.removeEventListener("beforeunload", onBeforeUnload);
//   }, [dirty]);

//   // --- Node helpers
//   const handleDeleteNode = useCallback(
//     nodeId => {
//       if (readonly) return;
//       setDirty(true);
//       setNodes(nds => nds.filter(n => n.id !== nodeId));
//       setEdges(eds =>
//         eds.filter(e => e.source !== nodeId && e.target !== nodeId)
//       );
//     },
//     [readonly, setNodes, setEdges]
//   );

//   const handleNodeDataChange = useCallback(
//     (nodeId, newData) => {
//       setDirty(true);
//       setNodes(nds =>
//         nds.map(n =>
//           n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
//         )
//       );
//     },
//     [setNodes]
//   );

//   const nodeTypes = useMemo(
//     () => ({
//       customBubble: props => (
//         <FlowNodeBubble
//           {...props}
//           onDelete={handleDeleteNode}
//           onDataChange={newData => handleNodeDataChange(props.id, newData)}
//           readonly={readonly}
//           visualDebug={visualDebug}
//         />
//       ),
//     }),
//     [handleDeleteNode, readonly, visualDebug, handleNodeDataChange]
//   );

//   const edgeTypes = useMemo(() => ({ smart: SmartLabeledEdge }), []);

//   // --- Load / Bootstrap + policy checks
//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       if (mode === "edit" || mode === "view") {
//         try {
//           const data = await getVisualFlowById(flowId);

//           const builtNodes = (data.nodes || []).map((node, index) => ({
//             id: node.id,
//             type: "customBubble",
//             position: {
//               x: node.positionX ?? 120 + index * 120,
//               y: node.positionY ?? 150 + (index % 5) * 60,
//             },
//             data: {
//               templateName: node.templateName,
//               templateType: node.templateType,
//               messageBody: node.messageBody,
//               triggerButtonText: node.triggerButtonText || "",
//               triggerButtonType: node.triggerButtonType || "cta",
//               requiredTag: node.requiredTag || "",
//               requiredSource: node.requiredSource || "",
//               useProfileName: !!node.useProfileName,
//               profileNameSlot:
//                 typeof node.profileNameSlot === "number" &&
//                 node.profileNameSlot > 0
//                   ? node.profileNameSlot
//                   : 1,
//               buttons: (node.buttons || []).map((btn, i) => ({
//                 text: btn.text,
//                 type: btn.type,
//                 subType: btn.subType,
//                 value: btn.value,
//                 targetNodeId: btn.targetNodeId || null,
//                 index: typeof btn.index === "number" ? btn.index : i,
//               })),
//             },
//           }));

//           const builtEdges = (data.edges || []).map(edge => ({
//             id: `e-${edge.fromNodeId}-${edge.toNodeId}-${
//               edge.sourceHandle || "h"
//             }`,
//             source: edge.fromNodeId,
//             target: edge.toNodeId,
//             sourceHandle: edge.sourceHandle || null,
//             type: "smart",
//             animated: true,
//             style: { stroke: "#9333ea" },
//             markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
//             label: edge.sourceHandle || "",
//           }));

//           const nodesWithIncoming = new Set(builtEdges.map(e => e.target));
//           const nodesWithWarnings = builtNodes.map(node => ({
//             ...node,
//             data: {
//               ...node.data,
//               isUnreachable: false,
//               hasNoIncoming: !nodesWithIncoming.has(node.id),
//             },
//           }));

//           setNodes(nodesWithWarnings);
//           setEdges(builtEdges);
//           setFlowName(data.flowName || "Untitled Flow");
//           setIsPublished(!!data.isPublished);
//           setDirty(false);

//           // policy: if editing a published flow, check attachment
//           if (mode === "edit" && data.isPublished) {
//             try {
//               const usage = await getFlowUsage(flowId);
//               if (usage?.campaigns?.length > 0) {
//                 setLockInfo({ locked: true, campaigns: usage.campaigns });
//                 setForkModalOpen(true);
//                 setReadonly(true);
//               } else {
//                 setReadonly(false);
//               }
//             } catch {
//               setLockInfo({ locked: true, campaigns: [] });
//               setForkModalOpen(true);
//               setReadonly(true);
//             }
//           } else {
//             setReadonly(mode === "view");
//           }

//           // initial fit
//           setTimeout(() => fitView({ padding: 0.25 }), 80);
//         } catch {
//           toast.error("❌ Failed to load flow");
//         } finally {
//           setLoading(false);
//         }
//       } else {
//         // creating new flow
//         setNodes([]);
//         setEdges([]);
//         setFlowName("Untitled Flow");
//         setIsPublished(false);
//         setReadonly(false);
//         setDirty(false);
//         setLoading(false);
//         setTimeout(() => fitView({ padding: 0.25 }), 80);
//       }
//     };

//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [flowId, mode]);

//   // Auto-fit when viewing, and refit on window resize
//   useEffect(() => {
//     if (mode !== "view") return;
//     const t = setTimeout(() => fitView({ padding: 0.25 }), 80);
//     const onResize = () => fitView({ padding: 0.25 });
//     window.addEventListener("resize", onResize);
//     return () => {
//       clearTimeout(t);
//       window.removeEventListener("resize", onResize);
//     };
//   }, [mode, nodes.length, edges.length, fitView]);

//   // --- Add template
//   const handleTemplateSelect = ({ name, type, body, buttons = [] }) => {
//     if (readonly) return;
//     const id = uuidv4();
//     const newNode = {
//       id,
//       position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
//       type: "customBubble",
//       data: {
//         templateName: name || "Untitled",
//         templateType: type || "text_template",
//         messageBody: body || "Message body preview...",
//         triggerButtonText: buttons[0]?.text || "",
//         triggerButtonType: "cta",
//         useProfileName: false,
//         profileNameSlot: 1,
//         buttons: buttons.map((btn, idx) => ({
//           text: btn.text || "",
//           type: btn.type || "QUICK_REPLY",
//           subType: btn.subType || "",
//           value: btn.parameterValue || "",
//           targetNodeId: null,
//           index: idx,
//         })),
//       },
//     };
//     setDirty(true);
//     setNodes(nds => [...nds, newNode]);
//     setShowPicker(false);
//     toast.success(
//       `✅ Step added with ${type?.replace("_", " ") || "template"}`
//     );
//     setTimeout(() => fitView({ padding: 0.25 }), 50);
//   };

//   // --- Connection rules
//   const isValidConnection = useCallback(
//     params => {
//       if (!params?.source || !params?.sourceHandle) return false;
//       const duplicate = edges.some(
//         e =>
//           e.source === params.source && e.sourceHandle === params.sourceHandle
//       );
//       return !duplicate;
//     },
//     [edges]
//   );

//   const onConnect = useCallback(
//     params => {
//       if (readonly) return;
//       setDirty(true);
//       const label = params.sourceHandle || "";

//       setEdges(eds =>
//         addEdge(
//           {
//             ...params,
//             id: uuidv4(),
//             type: "smart",
//             animated: true,
//             style: { stroke: "#9333ea" },
//             markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
//             label,
//           },
//           eds
//         )
//       );

//       setNodes(nds =>
//         nds.map(node => {
//           if (node.id !== params.source) return node;
//           const sourceHandle = params.sourceHandle || "";
//           const updatedButtons = [...(node.data.buttons || [])];

//           const idx = updatedButtons.findIndex(
//             b =>
//               (b.text || "").toLowerCase().trim() ===
//               sourceHandle.toLowerCase().trim()
//           );

//           if (idx >= 0) {
//             updatedButtons[idx] = {
//               ...updatedButtons[idx],
//               targetNodeId: params.target,
//             };
//           } else {
//             const free = updatedButtons.findIndex(b => !b.targetNodeId);
//             if (free >= 0)
//               updatedButtons[free] = {
//                 ...updatedButtons[free],
//                 targetNodeId: params.target,
//               };
//           }

//           return { ...node, data: { ...node.data, buttons: updatedButtons } };
//         })
//       );
//     },
//     [readonly, setEdges, setNodes]
//   );

//   // --- Keyboard UX
//   useEffect(() => {
//     const onKey = e => {
//       if (readonly) return;
//       if (e.key === "Delete" || e.key === "Backspace") {
//         setDirty(true);
//         setNodes(nds => nds.filter(n => !n.selected));
//         setEdges(eds => eds.filter(ed => !ed.selected));
//       }
//       if (e.key === "Escape") {
//         setNodes(nds => nds.map(n => ({ ...n, selected: false })));
//         setEdges(eds => eds.map(ed => ({ ...ed, selected: false })));
//       }
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [readonly, setNodes, setEdges]);

//   // --- Auto layout (dagre)
//   const applyLayout = useCallback(
//     (direction = "LR") => {
//       const g = new dagre.graphlib.Graph();
//       g.setGraph({
//         rankdir: direction,
//         nodesep: 50,
//         ranksep: 90,
//         marginx: 20,
//         marginy: 20,
//       });
//       g.setDefaultEdgeLabel(() => ({}));

//       nodes.forEach(n => {
//         const width = n?.measured?.width || NODE_DEFAULT.width;
//         const height = n?.measured?.height || NODE_DEFAULT.height;
//         g.setNode(n.id, { width, height });
//       });
//       edges.forEach(e => g.setEdge(e.source, e.target));

//       dagre.layout(g);

//       const laidOut = nodes.map(n => {
//         const { x, y } = g.node(n.id);
//         const width = n?.measured?.width || NODE_DEFAULT.width;
//         const height = n?.measured?.height || NODE_DEFAULT.height;
//         return { ...n, position: { x: x - width / 2, y: y - height / 2 } };
//       });

//       setDirty(true);
//       setNodes(laidOut);
//       setTimeout(() => fitView({ padding: 0.25 }), 50);
//     },
//     [nodes, edges, setNodes, fitView]
//   );

//   // --- Build payload (draft by default; publish is separate)
//   const buildPayload = () => {
//     const transformedNodes = nodes
//       .filter(n => n?.data?.templateName)
//       .map(node => ({
//         Id: node.id,
//         TemplateName: node.data.templateName || "Untitled",
//         TemplateType: node.data.templateType || "text_template",
//         MessageBody: node.data.messageBody || "",
//         PositionX: node.position?.x || 0,
//         PositionY: node.position?.y || 0,
//         TriggerButtonText: node.data.triggerButtonText || "",
//         TriggerButtonType: node.data.triggerButtonType || "cta",
//         RequiredTag: node.data.requiredTag || "",
//         RequiredSource: node.data.requiredSource || "",
//         UseProfileName: !!node.data.useProfileName,
//         ProfileNameSlot:
//           typeof node.data.profileNameSlot === "number" &&
//           node.data.profileNameSlot > 0
//             ? node.data.profileNameSlot
//             : 1,
//         Buttons: (node.data.buttons || [])
//           .filter(btn => (btn.text || "").trim().length > 0)
//           .map((btn, idx) => ({
//             Text: (btn.text || "").trim(),
//             Type: btn.type || "QUICK_REPLY",
//             SubType: btn.subType || "",
//             Value: btn.value || "",
//             TargetNodeId: btn.targetNodeId || null,
//             Index: typeof btn.index === "number" ? btn.index : idx,
//           })),
//       }));

//     const transformedEdges = edges.map(edge => ({
//       FromNodeId: edge.source,
//       ToNodeId: edge.target,
//       SourceHandle: edge.sourceHandle || "",
//     }));

//     return {
//       FlowName: flowName || "Untitled",
//       IsPublished: false, // always draft; publish is explicit
//       Nodes: transformedNodes,
//       Edges: transformedEdges,
//     };
//   };

//   // --- Save Draft (then go to Drafts tab)
//   const handleSaveDraft = async () => {
//     try {
//       setSaving(true);
//       const payload = buildPayload();

//       if (mode === "edit" && flowId) {
//         const res = await updateVisualFlow(flowId, payload);
//         if (res?.needsRepublish) setRepublishNeeded(true);
//         toast.success("✅ Flow updated (draft)");
//       } else {
//         const res = await saveVisualFlow(payload); // create new draft
//         if (res?.flowId) {
//           // move the user to manager drafts list
//           navigate(`/app/cta-flow/flow-manager?tab=draft`);
//           return; // stop further state updates in this screen
//         }
//         toast.success("✅ Flow saved (draft)");
//       }
//       setDirty(false);
//       navigate(`/app/cta-flow/flow-manager?tab=draft`);
//     } catch (error) {
//       console.error("❌ Save draft failed: ", error);
//       if (error?.response?.status === 409) {
//         const camps = error?.response?.data?.campaigns || [];
//         setLockInfo({ locked: true, campaigns: camps });
//         setForkModalOpen(true);
//         setReadonly(true);
//       } else {
//         toast.error("❌ Failed to save draft");
//       }
//     } finally {
//       setSaving(false);
//     }
//   };

//   // --- Publish / Republish (on new → create then publish) then go to Published tab
//   const handlePublish = async () => {
//     try {
//       setSaving(true);

//       if (mode === "edit" && flowId) {
//         const payload = buildPayload();
//         await updateVisualFlow(flowId, payload);
//         await publishFlow(flowId);
//         setRepublishNeeded(false);
//         setIsPublished(true);
//         setDirty(false);
//         toast.success("✅ Flow published");
//         navigate("/app/cta-flow/flow-manager?tab=published");
//         return;
//       }

//       // NEW flow: create as draft, get id, then publish that id
//       const createPayload = { ...buildPayload(), IsPublished: false };
//       const res = await saveVisualFlow(createPayload);
//       const newId = res?.flowId;

//       if (newId) {
//         await publishFlow(newId);
//         toast.success("✅ Flow created & published");
//         navigate("/app/cta-flow/flow-manager?tab=published");
//         return;
//       }

//       // fallback
//       toast.success("✅ Flow created (but publish step uncertain)");
//       navigate("/app/cta-flow/flow-manager?tab=published");
//     } catch (error) {
//       console.error("❌ Publish failed: ", error);
//       if (error?.response?.status === 409) {
//         const camps = error?.response?.data?.campaigns || [];
//         setLockInfo({ locked: true, campaigns: camps });
//         setForkModalOpen(true);
//         setReadonly(true);
//       } else {
//         toast.error("❌ Failed to publish");
//       }
//     } finally {
//       setSaving(false);
//     }
//   };

//   const defaultEdgeOptions = useMemo(
//     () => ({
//       type: "smart",
//       animated: true,
//       style: { stroke: "#9333ea" },
//       markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
//     }),
//     []
//   );

//   return (
//     <div className="p-6 relative">
//       {/* Page-level spinner overlay */}
//       {(loading || saving) && (
//         <div className="absolute inset-0 z-[60] bg-white/70 backdrop-blur-[1px] grid place-items-center">
//           <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow border">
//             <svg
//               className="animate-spin h-5 w-5 text-purple-600"
//               viewBox="0 0 24 24"
//             >
//               <circle
//                 className="opacity-25"
//                 cx="12"
//                 cy="12"
//                 r="10"
//                 stroke="currentColor"
//                 strokeWidth="4"
//                 fill="none"
//               />
//               <path
//                 className="opacity-75"
//                 fill="currentColor"
//                 d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
//               />
//             </svg>
//             <span className="text-sm text-gray-700">
//               {loading ? "Loading..." : "Working..."}
//             </span>
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
//         <div className="flex items-center gap-2">
//           <button
//             onClick={goBackToManager}
//             className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md shadow-sm hover:bg-gray-50 text-sm"
//             title={`Back to ${
//               backTab === "published" ? "Published" : "Drafts"
//             }`}
//           >
//             ← Back to {backTab === "published" ? "Published" : "Drafts"}
//           </button>

//           <h2 className="text-2xl font-bold text-purple-700 ml-1">
//             🧠 CTA Flow Visual Builder
//           </h2>
//         </div>

//         <div className="flex items-center gap-2">
//           {readonly ? (
//             <div className="px-3 py-2 rounded-md bg-purple-50 text-purple-700 text-sm font-medium">
//               {flowName || "Untitled Flow"}
//             </div>
//           ) : (
//             <input
//               id="flowName"
//               name="flowName"
//               ref={flowNameRef}
//               value={flowName}
//               onChange={e => {
//                 setFlowName(e.target.value);
//                 setDirty(true);
//               }}
//               placeholder="Add flow name"
//               className="border border-gray-300 px-3 py-2 rounded-md shadow-sm text-sm"
//             />
//           )}

//           {/* Always available */}
//           <button
//             onClick={() => navigate(`/app/cta-flow/visual-builder`)}
//             className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 text-sm"
//             title="Create a new flow"
//             disabled={saving}
//           >
//             ➕ Add New Flow
//           </button>

//           {!readonly && (
//             <>
//               <button
//                 onClick={() => setShowPicker(true)}
//                 className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 text-sm"
//                 disabled={saving}
//               >
//                 ➕ Add Step
//               </button>
//               <button
//                 onClick={goBackToManager}
//                 className="bg-white border border-purple-600 text-purple-700 font-medium text-sm px-4 py-2 rounded-md shadow-sm hover:bg-purple-50"
//                 disabled={saving}
//               >
//                 ↩️ Manage All Flows
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Republish banner */}
//       {!readonly && mode === "edit" && republishNeeded && (
//         <div className="mb-3 rounded-md border bg-amber-50 text-amber-800 px-3 py-2 text-sm flex items-center justify-between">
//           <div>
//             Changes saved as <span className="font-semibold">draft</span>. Click{" "}
//             <span className="font-semibold">Republish</span> to make them live.
//           </div>
//           <button
//             onClick={handlePublish}
//             className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs"
//             disabled={saving}
//           >
//             Republish
//           </button>
//         </div>
//       )}

//       {/* Canvas */}
//       <div className="h-[70vh] border rounded-xl bg-gray-50 relative">
//         {/* Minimap + tools */}
//         <div className="absolute bottom-5 right-4 z-50 flex gap-2">
//           <button
//             onClick={() => setShowMiniMap(prev => !prev)}
//             className="bg-purple-600 text-white p-2 rounded-full shadow hover:bg-purple-700"
//             title={showMiniMap ? "Hide MiniMap" : "Show MiniMap"}
//           >
//             {showMiniMap ? <Minus size={15} /> : <Eye size={15} />}
//           </button>

//           <div className="flex items-center gap-2 bg-white/90 px-2 py-1 rounded-full border">
//             <button
//               onClick={() => fitView({ padding: 0.25 })}
//               className="text-xs px-2 py-1 rounded hover:bg-gray-100 font-medium"
//               title="Fit to screen"
//             >
//               Fit
//             </button>
//             <button
//               onClick={() => zoomIn()}
//               className="text-xs px-2 py-1 rounded hover:bg-gray-100"
//               title="Zoom In"
//             >
//               +
//             </button>
//             <button
//               onClick={() => zoomOut()}
//               className="text-xs px-2 py-1 rounded hover:bg-gray-100"
//               title="Zoom Out"
//             >
//               −
//             </button>

//             {!readonly && (
//               <>
//                 <button
//                   onClick={() => applyLayout("LR")}
//                   className="text-xs px-2 py-1 rounded hover:bg-gray-100"
//                   title="Auto-layout (Left→Right)"
//                 >
//                   Auto LR
//                 </button>
//                 <button
//                   onClick={() => applyLayout("TB")}
//                   className="text-xs px-2 py-1 rounded hover:bg-gray-100"
//                   title="Auto-layout (Top→Bottom)"
//                 >
//                   Auto TB
//                 </button>
//               </>
//             )}
//           </div>
//         </div>

//         <ReactFlow
//           nodes={nodes}
//           edges={edges}
//           onNodesChange={onNodesChange}
//           onEdgesChange={onEdgesChange}
//           onConnect={onConnect}
//           onEdgeClick={(e, edge) => {
//             if (!readonly) {
//               setDirty(true);
//               setEdges(eds => eds.filter(ed => ed.id !== edge.id));
//             }
//           }}
//           nodeTypes={nodeTypes}
//           edgeTypes={edgeTypes}
//           fitView
//           fitViewOptions={{ padding: 0.25 }}
//           defaultEdgeOptions={defaultEdgeOptions}
//           connectionMode={ConnectionMode.Strict}
//           isValidConnection={isValidConnection}
//           snapToGrid
//           snapGrid={[GRID, GRID]}
//           panOnScroll
//           zoomOnPinch
//           panOnDrag={[1, 2]}
//           selectionOnDrag
//           nodesDraggable={!readonly}
//           nodesConnectable={!readonly}
//           elementsSelectable={!readonly}
//         >
//           {showMiniMap && (
//             <MiniMap
//               nodeColor="#9333ea"
//               nodeStrokeWidth={2}
//               maskColor="rgba(255,255,255,0.6)"
//             />
//           )}
//           <Controls />
//           <Background variant="dots" gap={GRID} size={1} />
//         </ReactFlow>
//       </div>

//       {/* Footer actions */}
//       {!readonly && (
//         <div className="mt-6 flex flex-wrap gap-3">
//           <button
//             onClick={handleSaveDraft}
//             className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm disabled:opacity-50"
//             disabled={saving}
//           >
//             💾 Save Draft
//           </button>

//           <button
//             onClick={handlePublish}
//             className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm disabled:opacity-50"
//             disabled={saving}
//           >
//             🚀 {isPublished ? "Republish" : "Publish Flow"}
//           </button>
//         </div>
//       )}

//       {/* Fork modal: when published & attached */}
//       {forkModalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center">
//           <div
//             className="absolute inset-0 bg-black/40"
//             onClick={() => setForkModalOpen(false)}
//           />
//           <div
//             role="dialog"
//             aria-modal="true"
//             className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6"
//           >
//             <div className="flex items-start gap-3 mb-4">
//               <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
//                 ⚠️
//               </div>
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900">
//                   Editing is blocked for this flow
//                 </h3>
//                 <p className="text-sm text-gray-600">
//                   This flow is <span className="font-medium">published</span>{" "}
//                   and attached to active campaign(s). To make changes, create a{" "}
//                   <span className="font-medium">new draft version</span>.
//                 </p>
//               </div>
//             </div>

//             <div className="max-h-60 overflow-auto rounded-lg border divide-y mb-4">
//               {lockInfo.campaigns.map(c => (
//                 <div key={c.id} className="p-3 text-sm">
//                   <div className="flex items-center justify-between">
//                     <div className="font-semibold text-gray-900">{c.name}</div>
//                     <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
//                       {c.status || "—"}
//                     </span>
//                   </div>
//                   <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
//                     <div>
//                       Created:{" "}
//                       <span className="font-medium text-gray-800">
//                         {c.createdAt
//                           ? new Date(c.createdAt).toLocaleString("en-IN")
//                           : "—"}
//                       </span>
//                     </div>
//                     <div>
//                       Created by:{" "}
//                       <span className="font-medium text-gray-800">
//                         {c.createdBy || "—"}
//                       </span>
//                     </div>
//                     <div>
//                       Scheduled:{" "}
//                       <span className="font-medium text-gray-800">
//                         {c.scheduledAt
//                           ? new Date(c.scheduledAt).toLocaleString("en-IN")
//                           : "—"}
//                       </span>
//                     </div>
//                     <div>
//                       First sent:{" "}
//                       <span className="font-medium text-gray-800">
//                         {c.firstSentAt
//                           ? new Date(c.firstSentAt).toLocaleString("en-IN")
//                           : "—"}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//               {lockInfo.campaigns.length === 0 && (
//                 <div className="p-3 text-sm text-gray-600">
//                   Could not load campaign details. You can still create a new
//                   draft version.
//                 </div>
//               )}
//             </div>

//             <div className="flex justify-end gap-2">
//               <button
//                 className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
//                 onClick={() => setForkModalOpen(false)}
//               >
//                 Close
//               </button>
//               <button
//                 onClick={async () => {
//                   try {
//                     if (!flowId) return;
//                     const { flowId: newId } = await forkFlow(flowId);
//                     setForkModalOpen(false);
//                     toast.success("✅ New draft version created");
//                     navigate(
//                       `/app/cta-flow/visual-builder?id=${newId}&mode=edit`
//                     );
//                   } catch (e) {
//                     console.error(e);
//                     toast.error("❌ Failed to create draft copy");
//                   }
//                 }}
//                 className="px-3 py-2 text-sm rounded bg-purple-600 text-white hover:bg-purple-700"
//               >
//                 Create new draft version
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <TemplatePickerModal
//         open={showPicker}
//         onClose={() => setShowPicker(false)}
//         onSelect={handleTemplateSelect}
//       />
//     </div>
//   );
// }

// export default function CTAFlowVisualBuilder() {
//   return (
//     <ReactFlowProvider>
//       <CTAFlowVisualBuilderInner />
//     </ReactFlowProvider>
//   );
// }
