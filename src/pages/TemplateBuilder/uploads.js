// 📄 src/api/templateBuilder/uploads.js
import axiosClient from "../axiosClient";

/**
 * POST /template-builder/uploads/header (multipart/form-data)
 * Form fields: DraftId, Language, MediaType, File (or SourceUrl)
 */
export async function uploadHeaderMedia({
  draftId,
  language = "en_US",
  mediaType = "IMAGE",
  file,
  sourceUrl,
  fileName,
}) {
  if (!draftId) {
    throw new Error("uploadHeaderMedia: draftId is required.");
  }

  const form = new FormData();
  form.append("DraftId", String(draftId));
  form.append("Language", language);
  form.append("MediaType", mediaType);

  if (file) form.append("File", file);
  if (sourceUrl) form.append("SourceUrl", sourceUrl);
  if (fileName) form.append("FileName", fileName);

  const { data } = await axiosClient.post(
    "/template-builder/uploads/header",
    form
  );
  return data;
}
