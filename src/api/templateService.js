import axiosClient from "./axiosClient";

/**
 * Robust template fetcher that tries multiple known endpoints to avoid 404s
 * as the backend naming evolves.
 */
export const fetchTemplates = async businessId => {
  const paths = [
    "/whatsapp/templates",
    `/WhatsAppTemplateFetcher/${businessId}`,
    "/whatsapp-templates",
  ];

  let lastErr;

  for (const path of paths) {
    try {
      const response = await axiosClient.get(path, {
        params: { businessId },
        __silent: true,
      });

      const raw = response.data;
      if (!raw) continue;

      // Try various common data shapes
      const list =
        raw.templates ||
        raw.Templates ||
        raw.items ||
        raw.Items ||
        (Array.isArray(raw) ? raw : null);

      if (Array.isArray(list)) {
        return list;
      }
      
      // If success flag is present but list isn't found in common places, and it's not an array, keep trying or throw format error if no more paths.
      if (raw.success && Array.isArray(raw.templates)) return raw.templates;

    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr ?? new Error("No template fetching endpoint responded.");
};
