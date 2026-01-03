// 📄 src/api/templateBuilder/library.js
import axiosClient from "../axiosClient";

/**
 * Browse library
 * GET /api/template-builder/library/browse
 */
export async function browseLibrary(params = {}) {
  const { data } = await axiosClient.get("/template-builder/library/browse", {
    params,
  });
  return data;
}

/**
 * Get library item
 * GET /api/template-builder/library/items/{itemId}
 */
export async function getLibraryItem(itemId) {
  const { data } = await axiosClient.get(
    `/template-builder/library/items/${encodeURIComponent(itemId)}`
  );
  return data;
}

/**
 * List industries
 * GET /api/template-builder/library/industries
 */
export async function listIndustries() {
  const { data } = await axiosClient.get(
    "/template-builder/library/industries"
  );
  return data;
}
