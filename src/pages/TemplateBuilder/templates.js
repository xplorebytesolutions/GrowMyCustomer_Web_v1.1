import axiosClient from "../../api/axiosClient";

/**
 * DELETE /api/template-builder/templates/{name}?language=
 */
export async function deleteApprovedTemplate(name, language = "en_US") {
  const { data } = await axiosClient.delete(
    `/template-builder/templates/${encodeURIComponent(name)}`,
    { params: { language } }
  );
  return data;
}

/**
 * If you have an endpoint like GET /api/whatsapp-templates, keep it here.
 */
export async function listApprovedTemplates(params = {}) {
  const { data } = await axiosClient.get("/whatsapp-templates", { params });
  return data;
}
