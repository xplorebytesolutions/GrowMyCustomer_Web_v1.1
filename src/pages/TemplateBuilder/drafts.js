import axiosClient from "../../api/axiosClient";

// Draft CRUD (under /drafts)
export async function createDraft(payload) {
  const { data } = await axiosClient.post("/template-builder/drafts", payload);
  return data;
}

export async function listDrafts() {
  const { data } = await axiosClient.get("/template-builder/drafts");
  return data;
}

export async function getDraft(draftId) {
  const { data } = await axiosClient.get(
    `/template-builder/drafts/${encodeURIComponent(draftId)}`
  );
  return data;
}

/**
 * Backend: POST /api/template-builder/drafts/{draftId}/variants
 */
export async function upsertVariant(draftId, payload) {
  const { data } = await axiosClient.post(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/variants`,
    payload
  );
  return data;
}

/**
 * Backend: GET /api/template-builder/drafts/{draftId}/status
 */
export async function getStatus(draftId) {
  const { data } = await axiosClient.get(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/status`
  );
  return data;
}

/**
 * Backend: GET /api/template-builder/preview?draftId=...&language=...
 */
export async function getPreview(draftId, language = "en_US") {
  const { data } = await axiosClient.get("/template-builder/preview", {
    params: { draftId, language },
  });
  return data;
}

// Non-/drafts routes (as per backend)
export async function validateAll(draftId) {
  const { data } = await axiosClient.post(
    `/template-builder/${encodeURIComponent(draftId)}/validate-all`
  );
  return data;
}

export async function submitDraft(draftId) {
  const { data } = await axiosClient.post(
    `/template-builder/${encodeURIComponent(draftId)}/submit`
  );
  return data;
}

export async function nameCheck(draftId, language = "en_US") {
  const { data } = await axiosClient.get(
    `/template-builder/${encodeURIComponent(draftId)}/name-check`,
    { params: { language } }
  );
  return data;
}

export async function duplicateDraft(draftId, key) {
  const { data } = await axiosClient.post(
    `/template-builder/drafts/${encodeURIComponent(draftId)}/duplicate`,
    { key }
  );
  return data;
}

export async function deleteDraft(draftId) {
  const { data } = await axiosClient.delete(
    `/template-builder/drafts/${encodeURIComponent(draftId)}`
  );
  return data;
}

export async function deleteApprovedTemplate(name, language = "en_US") {
  const { data } = await axiosClient.delete(
    `/template-builder/templates/${encodeURIComponent(name)}`,
    { params: { language } }
  );
  return data;
}
