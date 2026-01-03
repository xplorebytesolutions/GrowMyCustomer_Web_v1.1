// 📄 File: src/pages/TemplateBuilder/components/draftValidation.js

function countVars(bodyText = "") {
  const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
  // Count unique placeholders ({{1}} repeated should not inflate count)
  return new Set(matches).size;
}

export function validateDraft(draft) {
  const errors = {};

  if (!draft?.name?.trim()) errors.name = "Template name is required.";
  if (!draft?.language?.trim()) errors.language = "Language is required.";
  if (!draft?.category?.trim()) errors.category = "Category is required.";

  const headerType = (draft?.headerType || "NONE").toUpperCase();
  if (
    headerType === "IMAGE" &&
    !draft?.headerMediaId &&
    !draft?.headerMediaUrl
  ) {
    errors.header = "Header image is required for IMAGE header type.";
  }

  if (!draft?.bodyText?.trim()) errors.bodyText = "Body text is required.";

  const btns = Array.isArray(draft?.buttons) ? draft.buttons : [];
  if (btns.length > 3) errors.buttons = "Max 3 buttons allowed.";
  btns.slice(0, 3).forEach((b, i) => {
    if (!b?.text?.trim())
      errors[`button_${i}`] = `Button ${i + 1} text is required.`;
    if (!b?.type?.trim())
      errors[`buttonType_${i}`] = `Button ${i + 1} type is required.`;
    if ((b?.type || "").toUpperCase() !== "QUICK_REPLY" && !b?.value?.trim()) {
      errors[`buttonValue_${i}`] = `Button ${i + 1} value is required.`;
    }
  });

  // Helpful UX: show placeholder count for user awareness
  errors.__varsCount = countVars(draft?.bodyText || "");

  return errors;
}
