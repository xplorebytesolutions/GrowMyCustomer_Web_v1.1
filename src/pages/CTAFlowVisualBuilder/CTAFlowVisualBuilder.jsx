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
import "./ctaFlowReactFlowOverrides.css";
import { Eye, Minus, Workflow } from "lucide-react";
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
const HANDLE_PREFIX = "btn-";

const normalizeButtonText = v => String(v || "").trim().toLowerCase();

const handleIdForButton = (_btn, fallbackIndex) =>
  `${HANDLE_PREFIX}${fallbackIndex}`;

const buttonTextForHandle = (buttons, handleId) => {
  const list = Array.isArray(buttons) ? buttons : [];
  const hid = String(handleId || "");
  const found = list.find((b, i) => handleIdForButton(b, i) === hid);
  return (found?.text || "").toString().trim();
};
const NODE_DEFAULT = { width: 260, height: 140 };

function CTAFlowVisualBuilderInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const [showPicker, setShowPicker] = useState(false);
  const [flowName, setFlowName] = useState("");
  const flowNameRef = useRef(null);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [readonly, setReadonly] = useState(false);

  // policy state
  const [isPublished, setIsPublished] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
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

  // Persist unsaved builder state so users don't lose work on tab discard / route refresh.
  // We scope to business + flowId (or 'new') and keep it in sessionStorage (per-session).
  const businessId = useMemo(() => {
    return (
      localStorage.getItem("businessId") ||
      localStorage.getItem("sa_selectedBusinessId") ||
      ""
    );
  }, []);

  const draftCacheKey = useMemo(() => {
    const bizPart = businessId ? `biz.${businessId}` : "biz.unknown";
    const flowPart = flowId ? `flow.${flowId}` : "new";
    return `ctaFlow.visualBuilder.draft.${bizPart}.${flowPart}`;
  }, [businessId, flowId]);

  const draftRestoreAttemptedRef = useRef(false);
  const draftSaveDebounceRef = useRef(null);

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

  useEffect(() => {
    edgesRef.current = [...edges];
  }, [edges]);

  // Restore cached draft for new flows (or when state is empty after reload).
  useEffect(() => {
    if (draftRestoreAttemptedRef.current) return;
    draftRestoreAttemptedRef.current = true;

    // For edit flows, we prefer the server source of truth. Only restore for new flows.
    if (flowId) return;

    // Only restore into a "fresh" canvas.
    if (nodes.length || edges.length || (flowName || "").trim().length) return;

    try {
      const raw = sessionStorage.getItem(draftCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) return;

      const nextNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const nextEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
      const nextName = typeof parsed.flowName === "string" ? parsed.flowName : "";

      if (!nextNodes.length && !nextEdges.length && !nextName.trim().length) return;

      setNodes(nextNodes);
      setEdges(nextEdges);
      setFlowName(nextName);
      setDirty(true);
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftCacheKey]);

  const persistDraft = useCallback(
    ({ immediate = false } = {}) => {
      try {
        const payload = {
          v: 1,
          flowId: flowId || null,
          mode: mode || null,
          flowName: flowName || "",
          nodes: nodesRef.current || [],
          edges: edgesRef.current || [],
          savedAt: new Date().toISOString(),
        };

        if (!immediate) {
          if (draftSaveDebounceRef.current) {
            clearTimeout(draftSaveDebounceRef.current);
          }
          draftSaveDebounceRef.current = setTimeout(() => {
            try {
              sessionStorage.setItem(draftCacheKey, JSON.stringify(payload));
            } catch {
              // no-op
            }
          }, 250);
          return;
        }

        sessionStorage.setItem(draftCacheKey, JSON.stringify(payload));
      } catch {
        // no-op
      }
    },
    [draftCacheKey, flowId, mode, flowName]
  );

  useEffect(() => {
    // Save in background whenever user changes something.
    // (Even if not dirty yet, saving is harmless and keeps UX resilient.)
    persistDraft();
    return () => {
      if (draftSaveDebounceRef.current) clearTimeout(draftSaveDebounceRef.current);
    };
  }, [persistDraft, nodes, edges]);

  useEffect(() => {
    // Flush cache when tab is being hidden; helps with Chrome tab discard.
    const onVis = () => {
      if (document.visibilityState === "hidden") persistDraft({ immediate: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [persistDraft]);

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
              headerMediaUrl: node.headerMediaUrl || "",
              messageBody: node.messageBody,
              bodyParams: Array.isArray(node.bodyParams) ? node.bodyParams : [],
              urlButtonParams: Array.isArray(node.urlButtonParams)
                ? node.urlButtonParams
                : [],
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

          const builtNodesById = new Map(builtNodes.map(n => [n.id, n]));
          const builtEdges = (data.edges || []).map(edge => {
            const rawLabel = String(edge.sourceHandle || "");
            const fromNode = builtNodesById.get(edge.fromNodeId);
            const btns = fromNode?.data?.buttons || [];
            const matchIdx = btns.findIndex(
              b => normalizeButtonText(b?.text) === normalizeButtonText(rawLabel)
            );
            const sourceHandle =
              matchIdx >= 0 ? handleIdForButton(btns[matchIdx], matchIdx) : null;

            return {
              id: `e-${edge.fromNodeId}-${edge.toNodeId}-${rawLabel || "h"}`,
              source: edge.fromNodeId,
              target: edge.toNodeId,
              sourceHandle,
              type: "smart",
              animated: true,
              style: { stroke: "#059669" },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
              label: rawLabel,
            };
          });

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
        headerMediaUrl: "",
        messageBody: body || "Message body preview...",
        bodyParams: [],
        urlButtonParams: ["", "", ""],
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
          index: typeof btn.index === "number" ? btn.index : idx,
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

  // --- Add multiple templates (multi-select in picker)
  const handleTemplatesSelectMany = payloads => {
    if (readonly) return;
    const items = Array.isArray(payloads) ? payloads.filter(Boolean) : [];
    if (items.length === 0) return;

    const snap = v => Math.round(v / GRID) * GRID;
    const existing = Array.isArray(nodesRef.current) ? nodesRef.current : [];
    const xs = existing.map(n => n?.position?.x ?? 0);
    const ys = existing.map(n => n?.position?.y ?? 0);

    const maxX = xs.length ? Math.max(...xs) : 0;
    const minY = ys.length ? Math.min(...ys) : 0;
    const startX = snap((existing.length ? maxX : 120) + NODE_DEFAULT.width + 80);
    const startY = snap(existing.length ? minY : 120);

    const cols = Math.min(2, items.length);
    const gapX = snap(NODE_DEFAULT.width + 80);
    const gapY = snap(NODE_DEFAULT.height + 80);

    const newNodes = items.map((p, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const id = uuidv4();

      const buttons = Array.isArray(p.buttons) ? p.buttons : [];
      return {
        id,
        position: { x: startX + col * gapX, y: startY + row * gapY },
        type: "customBubble",
        data: {
          templateName: p.name || "Untitled",
          templateType: p.type || "text_template",
          headerMediaUrl: "",
          messageBody: p.body || "Message body preview...",
          bodyParams: [],
          urlButtonParams: ["", "", ""],
          triggerButtonText: buttons[0]?.text || "",
          triggerButtonType: "cta",
          useProfileName: false,
          profileNameSlot: 1,
          buttons: buttons.map((btn, i) => ({
            text: btn.text || "",
            type: btn.type || "QUICK_REPLY",
            subType: btn.subType || "",
            value: btn.parameterValue || "",
            targetNodeId: null,
            index: typeof btn.index === "number" ? btn.index : i,
          })),
        },
      };
    });

    setDirty(true);
    setNodes(nds => [...nds, ...newNodes]);
    setShowPicker(false);
    toast.success(`Added ${newNodes.length} step(s)`);
    setTimeout(() => fitView({ padding: 0.25 }), 80);
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
      const sourceNode = nodesRef.current.find(n => n.id === params.source);
      const label =
        buttonTextForHandle(sourceNode?.data?.buttons, params.sourceHandle) ||
        "";

      setEdges(eds =>
        addEdge(
          {
            ...params,
            id: uuidv4(),
            type: "smart",
            animated: true,
            style: { stroke: "#059669" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
            label,
          },
          eds
        )
      );

      setNodes(nds =>
        nds.map(node => {
          if (node.id !== params.source) return node;
          const updatedButtons = [...(node.data.buttons || [])];

          const idx = updatedButtons.findIndex(
            (b, i) => handleIdForButton(b, i) === String(params.sourceHandle || "")
          );

          if (idx >= 0)
            updatedButtons[idx] = { ...updatedButtons[idx], targetNodeId: params.target };

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
        HeaderMediaUrl: (node.data.headerMediaUrl || "").trim(),
        BodyParams: Array.isArray(node.data.bodyParams) ? node.data.bodyParams : [],
        UrlButtonParams: Array.isArray(node.data.urlButtonParams) ? node.data.urlButtonParams : [],
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

    const nodesById = new Map(nodes.map(n => [n.id, n]));
    const transformedEdges = edges.map(edge => {
      const fromNode = nodesById.get(edge.source);
      const fallbackLabel = buttonTextForHandle(
        fromNode?.data?.buttons,
        edge.sourceHandle
      );
      return {
        FromNodeId: edge.source,
        ToNodeId: edge.target,
        // Backend wiring expects SourceHandle == button text.
        SourceHandle: String(edge.label || fallbackLabel || ""),
      };
    });

    return {
      FlowName: flowName || "Untitled",
      IsPublished: false, // always draft; publish is explicit
      Nodes: transformedNodes,
      Edges: transformedEdges,
    };
  };

  const requiresHeaderMediaUrl = templateType => {
    const t = String(templateType || "").trim().toLowerCase();
    return t === "image_template" || t === "video_template" || t === "document_template";
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

  const getMediaHeaderIssues = currentNodes => {
    const list = Array.isArray(currentNodes) ? currentNodes : [];
    return list
      .filter(n => !!n?.data?.templateName)
      .filter(n => requiresHeaderMediaUrl(n?.data?.templateType))
      .map(n => {
        const url = (n?.data?.headerMediaUrl || "").trim();
        if (!url) {
          return {
            nodeId: n.id,
            templateName: n.data.templateName,
            reason: "Missing header media URL",
          };
        }
        if (!isValidHttpsUrl(url)) {
          return {
            nodeId: n.id,
            templateName: n.data.templateName,
            reason: "Header media URL must be a valid https:// URL",
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const countBodyPlaceholdersFlexible = body => {
    if (!body) return 0;
    const s = String(body);
    const positional = s.match(/\{\{\s*\d+\s*\}\}/g) || [];
    const named = s.match(/\{\{\s*\}\}/g) || [];
    return positional.length + named.length;
  };

  const getBodyParamIssues = currentNodes => {
    const list = Array.isArray(currentNodes) ? currentNodes : [];
    const issues = [];

    for (const n of list) {
      if (!n?.data?.templateName) continue;
      const placeholderCount = countBodyPlaceholdersFlexible(n?.data?.messageBody);
      if (placeholderCount <= 0) continue;

      const params = Array.isArray(n?.data?.bodyParams) ? n.data.bodyParams : [];
      const useProfile = !!n?.data?.useProfileName;
      const slot = typeof n?.data?.profileNameSlot === "number" ? n.data.profileNameSlot : 1;

      for (let i = 1; i <= placeholderCount; i++) {
        if (useProfile && slot === i) continue;
        const v = (params[i - 1] || "").toString().trim();
        if (!v.length) {
          issues.push({
            nodeId: n.id,
            templateName: n.data.templateName,
            index: i,
            reason: `Missing body value for {{${i}}}`,
          });
          break; // first issue per node is enough for UX
        }
      }
    }

    return issues;
  };

  const isDynamicUrlButton = btn => {
    const type = String(btn?.type || "").trim().toUpperCase();
    const subType = String(btn?.subType || "").trim().toLowerCase();
    const mask = String(btn?.value || "").trim();
    const isUrl = type === "URL" || subType === "url";
    const isDynamic = mask.includes("{{");
    return isUrl && isDynamic;
  };

  const getUrlButtonParamIssues = currentNodes => {
    const list = Array.isArray(currentNodes) ? currentNodes : [];
    const issues = [];

    for (const n of list) {
      if (!n?.data?.templateName) continue;

      const params = Array.isArray(n?.data?.urlButtonParams)
        ? n.data.urlButtonParams
        : [];

      const btns = Array.isArray(n?.data?.buttons) ? n.data.buttons : [];
      const dyn = btns.filter(isDynamicUrlButton);
      if (!dyn.length) continue;

      for (const b of dyn) {
        const idx = typeof b.index === "number" ? b.index : 0;
        const v = (params[idx] || "").toString().trim();
        if (!v.length) {
          issues.push({
            nodeId: n.id,
            templateName: n.data.templateName,
            buttonIndex: idx + 1,
            buttonText: b.text || "",
            reason: `Missing dynamic URL param for button ${idx + 1}`,
          });
          break; // first issue per node is enough for UX
        }
      }
    }

    return issues;
  };

  // --- Save Draft
  const handleSaveDraft = async () => {
    try {
      setSaving(true);

      const issues = getMediaHeaderIssues(nodesRef.current);
      if (issues.length) {
        toast.warn(
          `Some steps need a valid https Header Media URL before publish. First: ${issues[0].templateName} (${issues[0].reason})`
        );
      }

      const bodyIssues = getBodyParamIssues(nodesRef.current);
      if (bodyIssues.length) {
        toast.warn(
          `Some steps need body variable values before publish. First: ${bodyIssues[0].templateName} (${bodyIssues[0].reason})`
        );
      }

      const urlIssues = getUrlButtonParamIssues(nodesRef.current);
      if (urlIssues.length) {
        toast.warn(
          `Some steps need dynamic URL button values before publish. First: ${urlIssues[0].templateName} (${urlIssues[0].reason})`
        );
      }

      const payload = buildPayload();

      if (mode === "edit" && flowId) {
        const res = await updateVisualFlow(flowId, payload);
        if (res?.needsRepublish) setRepublishNeeded(true);
        toast.success("✅ Flow updated (draft)");
      } else {
        const res = await saveVisualFlow(payload); // create new draft
        if (res?.flowId) {
          try {
            sessionStorage.removeItem(draftCacheKey);
          } catch {
            // no-op
          }
          navigate(`/app/cta-flow/flow-manager?tab=draft`);
          return;
        }
        toast.success("✅ Flow saved (draft)");
      }
      setDirty(false);
      try {
        sessionStorage.removeItem(draftCacheKey);
      } catch {
        // no-op
      }
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
      const issues = getMediaHeaderIssues(nodesRef.current);
      if (issues.length) {
        toast.error(
          `Cannot publish: ${issues[0].templateName} (${issues[0].reason}). Set the Header Media URL on that step.`
        );
        return;
      }

      const bodyIssues = getBodyParamIssues(nodesRef.current);
      if (bodyIssues.length) {
        toast.error(
          `Cannot publish: ${bodyIssues[0].templateName} (${bodyIssues[0].reason}). Fill body variables on that step.`
        );
        return;
      }

      const urlIssues = getUrlButtonParamIssues(nodesRef.current);
      if (urlIssues.length) {
        toast.error(
          `Cannot publish: ${urlIssues[0].templateName} (${urlIssues[0].reason}). Fill the dynamic URL button value on that step.`
        );
        return;
      }

      setSaving(true);

      if (mode === "edit" && flowId) {
        const payload = buildPayload();
        await updateVisualFlow(flowId, payload);
        await publishFlow(flowId);
        setRepublishNeeded(false);
        setIsPublished(true);
        setDirty(false);
        try {
          sessionStorage.removeItem(draftCacheKey);
        } catch {
          // no-op
        }
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
        try {
          sessionStorage.removeItem(draftCacheKey);
        } catch {
          // no-op
        }
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
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "❌ Failed to publish";
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "smart",
      animated: true,
      style: { stroke: "#059669" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Workflow className="text-emerald-600" size={24} />
            CTA Flow Visual Builder
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
          className={`cta-flow-reactflow${isConnecting ? " cta-connecting" : ""}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={() => setIsConnecting(true)}
          onConnectEnd={() => setIsConnecting(false)}
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
          connectOnClick={false}
          connectionRadius={12}
          nodeDragThreshold={4}
          zoomOnScroll
          zoomOnPinch
          panOnDrag={[0, 1]}
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
        onSelectMany={handleTemplatesSelectMany}
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
// import { Eye, Minus, Workflow } from "lucide-react";
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
