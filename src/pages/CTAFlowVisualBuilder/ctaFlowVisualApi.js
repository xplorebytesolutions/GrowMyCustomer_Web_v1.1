// 📄 File: xbytechat-ui/src/pages/CTAFlowVisualBuilder/ctaFlowVisualApi.js
import axiosClient from "../../api/axiosClient";

const toBool = v => v === true || v === "true" || v === 1;
const toPosInt = (v, def = 1) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

// ---- shared payload normalizer ----
function normalizePayload(payload) {
  const safeNodes = (payload.Nodes || []).map(node => ({
    Id: node.Id || "",
    TemplateName: node.TemplateName || "",
    TemplateType: node.TemplateType || "text_template",
    HeaderMediaUrl: node.HeaderMediaUrl || "",
    BodyParams: Array.isArray(node.BodyParams) ? node.BodyParams : [],
    UrlButtonParams: Array.isArray(node.UrlButtonParams) ? node.UrlButtonParams : [],
    MessageBody: node.MessageBody || "",
    PositionX: node.PositionX ?? 0,
    PositionY: node.PositionY ?? 0,
    TriggerButtonText: node.TriggerButtonText || "",
    TriggerButtonType: node.TriggerButtonType || "cta",
    UseProfileName: toBool(node.UseProfileName),
    ProfileNameSlot: toPosInt(node.ProfileNameSlot ?? 1, 1),
    Buttons: (node.Buttons || []).map((btn, idx) => ({
      Text: btn.Text || "",
      Type: btn.Type || "",
      SubType: btn.SubType || "",
      Value: btn.Value || "",
      Index: Number.isFinite(btn.Index) ? btn.Index : idx,
      TargetNodeId: btn.TargetNodeId || null,
    })),
  }));

  const safeEdges = (payload.Edges || []).map(e => ({
    FromNodeId: e.FromNodeId || "",
    ToNodeId: e.ToNodeId || "",
    SourceHandle: e.SourceHandle || "",
  }));

  return {
    FlowName: payload.FlowName || "Untitled",
    IsPublished: !!payload.IsPublished,
    Nodes: safeNodes,
    Edges: safeEdges,
  };
}

// ---- CREATE (by name) ----
export async function saveVisualFlow(payload) {
  const res = await axiosClient.post(
    "/cta-flow/save-visual",
    normalizePayload(payload)
  );
  return res.data;
}

// ---- LOAD BY ID ----
export async function getVisualFlowById(flowId) {
  if (!flowId) throw new Error("flowId is required");
  const res = await axiosClient.get(`/cta-flow/by-id/${flowId}`);
  return res.data;
}

// ---- USAGE (edit/delete gates) ----
export async function getFlowUsage(flowId) {
  if (!flowId) throw new Error("flowId is required");
  const { data } = await axiosClient.get(`/cta-flow/${flowId}/usage`);
  return data; // { canDelete, count, campaigns }
}

// ---- UPDATE BY ID ----
export async function updateVisualFlow(flowId, payload) {
  if (!flowId) throw new Error("flowId is required");
  const res = await axiosClient.put(
    `/cta-flow/${flowId}`,
    normalizePayload(payload)
  );
  return res.data; // { message, needsRepublish? }
}

// ---- PUBLISH ----
export async function publishFlow(flowId) {
  if (!flowId) throw new Error("flowId is required");
  const res = await axiosClient.post(`/cta-flow/${flowId}/publish`);
  return res.data;
}

// ---- FORK (create draft version) ----
export async function forkFlow(flowId) {
  if (!flowId) throw new Error("flowId is required");
  const res = await axiosClient.post(`/cta-flow/${flowId}/fork`);
  return res.data; // { flowId }
}

// ---- (Optional) DELETE helper for manager page ----
export async function deleteFlow(flowId) {
  if (!flowId) throw new Error("flowId is required");
  const res = await axiosClient.delete(`/cta-flow/${flowId}`);
  return res.data;
}

// // 📄 File: xbytechat-ui/src/pages/CTAFlowVisualBuilder/ctaFlowVisualApi.js
// import axiosClient from "../../api/axiosClient";

// const toBool = v => v === true || v === "true" || v === 1;
// const toPosInt = (v, def = 1) => {
//   const n = parseInt(v, 10);
//   return Number.isFinite(n) && n > 0 ? n : def;
// };

// // ---- CREATE / UPSERT BY NAME (existing) ----
// export async function saveVisualFlow(payload) {
//   const safeNodes = (payload.Nodes || []).map(node => ({
//     Id: node.Id || "",
//     TemplateName: node.TemplateName || "",
//     TemplateType: node.TemplateType || "text_template",
//     MessageBody: node.MessageBody || "",
//     PositionX: node.PositionX ?? 0,
//     PositionY: node.PositionY ?? 0,
//     TriggerButtonText: node.TriggerButtonText || "",
//     TriggerButtonType: node.TriggerButtonType || "cta",
//     UseProfileName: toBool(node.UseProfileName),
//     ProfileNameSlot: toPosInt(node.ProfileNameSlot ?? 1, 1),
//     Buttons: (node.Buttons || []).map((btn, idx) => ({
//       Text: btn.Text || "",
//       Type: btn.Type || "",
//       SubType: btn.SubType || "",
//       Value: btn.Value || "",
//       Index: Number.isFinite(btn.Index) ? btn.Index : idx,
//       TargetNodeId: btn.TargetNodeId || null,
//     })),
//   }));

//   const safeEdges = (payload.Edges || []).map(e => ({
//     FromNodeId: e.FromNodeId || "",
//     ToNodeId: e.ToNodeId || "",
//     SourceHandle: e.SourceHandle || "",
//   }));

//   const fixedPayload = {
//     FlowName: payload.FlowName || "Untitled",
//     IsPublished: !!payload.IsPublished,
//     Nodes: safeNodes,
//     Edges: safeEdges,
//   };

//   const res = await axiosClient.post("/cta-flow/save-visual", fixedPayload);
//   return res.data;
// }

// // ---- LOAD BY ID (existing consumer in builder) ----
// export async function getVisualFlowById(flowId) {
//   const res = await axiosClient.get(`/cta-flow/by-id/${flowId}`);
//   return res.data;
// }

// // ---- NEW: usage for delete/edit gates ----
// export async function getFlowUsage(flowId) {
//   const { data } = await axiosClient.get(`/cta-flow/${flowId}/usage`);
//   return data; // { canDelete: boolean, campaigns: [] }
// }

// // ---- NEW: update by id (two-state policy on backend) ----
// export async function updateVisualFlow(flowId, payload) {
//   const res = await axiosClient.put(`/cta-flow/${flowId}`, payload);
//   return res.data; // { message, needsRepublish? }
// }

// // ---- NEW: publish ----
// export async function publishFlow(flowId) {
//   const res = await axiosClient.post(`/cta-flow/${flowId}/publish`);
//   return res.data;
// }

// // ---- NEW: fork ----
// export async function forkFlow(flowId) {
//   const res = await axiosClient.post(`/cta-flow/${flowId}/fork`);
//   return res.data; // { flowId }
// }

// import axiosClient from "../../api/axiosClient";
// /**
//  * Coerce values coming from the UI into clean types for the API.
//  */
// const toBool = v => v === true || v === "true" || v === 1;
// const toPosInt = (v, def = 1) => {
//   const n = parseInt(v, 10);
//   return Number.isFinite(n) && n > 0 ? n : def;
// };

// /**
//  * Save a visual flow (nodes + edges).
//  * Includes UseProfileName/ProfileNameSlot so the runtime knows where to inject the WA profile name.
//  */
// export async function saveVisualFlow(payload) {
//   const safeNodes = (payload.Nodes || []).map(node => ({
//     Id: node.Id || "",
//     TemplateName: node.TemplateName || "",
//     TemplateType: node.TemplateType || "text_template",
//     MessageBody: node.MessageBody || "",
//     PositionX: node.PositionX ?? 0,
//     PositionY: node.PositionY ?? 0,
//     TriggerButtonText: node.TriggerButtonText || "",
//     TriggerButtonType: node.TriggerButtonType || "cta",

//     // 👇 NEW: persist the greeting controls per-step
//     UseProfileName: toBool(node.UseProfileName),
//     ProfileNameSlot: toPosInt(node.ProfileNameSlot ?? 1, 1),

//     // buttons with stable Index (used later to map clicks)
//     Buttons: (node.Buttons || []).map((btn, idx) => ({
//       Text: btn.Text || "",
//       Type: btn.Type || "",
//       SubType: btn.SubType || "",
//       Value: btn.Value || "",
//       TargetNodeId: btn.TargetNodeId || null,
//       Index: Number.isFinite(btn.Index) ? btn.Index : idx,
//     })),
//   }));

//   const safeEdges = (payload.Edges || []).map(e => ({
//     FromNodeId: e.FromNodeId || "",
//     ToNodeId: e.ToNodeId || "",
//     SourceHandle: e.SourceHandle || "", // button text
//   }));

//   const fixedPayload = {
//     FlowName: payload.FlowName || "Untitled",
//     IsPublished: !!payload.IsPublished,
//     Nodes: safeNodes,
//     Edges: safeEdges,
//   };

//   const res = await axiosClient.post("/cta-flow/save-visual", fixedPayload);
//   return res.data;
// }

// /**
//  * Load a visual flow by ID.
//  * The builder expects the response shape to include: { flowName, nodes: [...], edges: [...] }.
//  */
// export async function getVisualFlowById(flowId) {
//   const res = await axiosClient.get(`/cta-flow/by-id/${flowId}`);
//   return res.data;
// }
