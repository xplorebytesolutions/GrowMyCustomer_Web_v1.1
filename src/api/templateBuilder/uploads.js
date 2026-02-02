import axiosClient from "../../api/axiosClient";

/**
 * Upload header media (multipart/form-data)
 * POST /api/template-builder/uploads/header
 *
 * Body (form-data):
 * - DraftId (guid)
 * - Language (e.g. en_US)
 * - MediaType (IMAGE|VIDEO|DOCUMENT)
 * - File OR SourceUrl
 * - FileName (optional)
 */
export async function uploadHeaderMedia({
  draftId,
  language = "en_US",
  mediaType = "IMAGE",
  file,
  sourceUrl,
  fileName,
}) {
  const form = new FormData();
  form.append("DraftId", draftId);
  form.append("Language", language);
  form.append("MediaType", mediaType);

  if (file) form.append("File", file);
  if (sourceUrl) form.append("SourceUrl", sourceUrl);
  if (fileName) form.append("FileName", fileName);

  const { data } = await axiosClient.post(
    "/template-builder/uploads/header",
    form,
    { 
      headers: { "Content-Type": "multipart/form-data" },
      __silentToast: true 
    }
  );

  return data;
}

/**
 * Upload standalone media (Campaign Builder)
 * POST /api/template-builder/uploads/standalone
 */
export async function uploadStandaloneMedia({
  mediaType = "IMAGE",
  file,
  sourceUrl,
  fileName,
}) {
  const form = new FormData();
  form.append("MediaType", mediaType);

  if (file) form.append("File", file);
  if (sourceUrl) form.append("SourceUrl", sourceUrl);
  if (fileName) form.append("FileName", fileName);

  const { data } = await axiosClient.post(
    "/template-builder/uploads/standalone",
    form,
    { 
      headers: { "Content-Type": "multipart/form-data" },
      __silentToast: true 
    }
  );

  return data;
}

// // src/api/templateBuilder/uploads.js
// import axiosClient from "../../api/axiosClient";

// /**
//  * Upload header media (multipart/form-data)
//  * POST /api/template-builder/uploads/header?mediaType=IMAGE|VIDEO|DOCUMENT
//  * Form: file (IFormFile) OR sourceUrl
//  * @param {File} file
//  * @param {'IMAGE'|'VIDEO'|'DOCUMENT'} mediaType
//  * @returns {Promise<{handle:string}>}
//  */
// export async function uploadHeaderMedia(file, mediaType = "IMAGE") {
//   const form = new FormData();
//   form.append("file", file);
//   const { data } = await axiosClient.post(
//     `/api/template-builder/uploads/header`,
//     form,
//     {
//       params: { mediaType },
//       headers: { "Content-Type": "multipart/form-data" },
//     }
//   );
//   return data;
// }
