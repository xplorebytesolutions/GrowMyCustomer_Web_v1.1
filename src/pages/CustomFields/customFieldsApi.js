import axiosClient from "../../api/axiosClient";

const DEFAULT_ENTITY_TYPE = "Contact";

const pickFirst = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
};

const safeTrim = value => String(value || "").trim();

const normalizeEntityType = value => {
  const trimmed = safeTrim(value);
  return trimmed || DEFAULT_ENTITY_TYPE;
};

// OptionsJson is stored as a JSON string; invalid JSON should become empty list.
export const parseOptionsJson = raw => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const options =
      parsed?.options ??
      parsed?.Options ??
      parsed?.values ??
      parsed?.Values ??
      parsed;
    if (!Array.isArray(options)) return [];
    return options
      .map(opt => safeTrim(opt))
      .filter(opt => opt.length > 0);
  } catch {
    return [];
  }
};

export const buildOptionsPayload = options => ({
  options: Array.isArray(options)
    ? options.map(opt => safeTrim(opt)).filter(opt => opt.length > 0)
    : [],
});

// ValueJson is a JSON string like {"value": ...}; on parse failure, keep raw.
export const parseValueJson = raw => {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    if (raw && typeof raw === "object" && "value" in raw) return raw.value;
    return raw;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "value" in parsed) {
      return parsed.value;
    }
    return parsed;
  } catch {
    return raw;
  }
};

export const normalizeDefinition = def => {
  const optionsJson = pickFirst(def?.optionsJson, def?.OptionsJson);
  const options = parseOptionsJson(optionsJson ?? def?.options ?? def?.Options);

  return {
    id: pickFirst(
      def?.id,
      def?.fieldId,
      def?.FieldId,
      def?.definitionId,
      def?.DefinitionId,
      def?.customFieldDefinitionId
    ),
    entityType: pickFirst(def?.entityType, def?.EntityType, DEFAULT_ENTITY_TYPE),
    key: pickFirst(def?.key, def?.Key, ""),
    label: pickFirst(def?.label, def?.Label, ""),
    dataType: pickFirst(def?.dataType, def?.DataType, ""),
    options,
    isRequired: Boolean(pickFirst(def?.isRequired, def?.IsRequired, false)),
    isActive: pickFirst(def?.isActive, def?.IsActive, true) !== false,
    sortOrder: Number(pickFirst(def?.sortOrder, def?.SortOrder, 0)) || 0,
  };
};

const normalizeDefinitions = raw => {
  const list = Array.isArray(raw) ? raw : [];
  return list.map(normalizeDefinition).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label);
  });
};

const normalizeSchemaWithValues = payload => {
  const root = payload?.data ?? payload ?? {};

  const defs =
    root.definitions ??
    root.Definitions ??
    root.schema ??
    root.Schema ??
    root.fields ??
    root.Fields ??
    [];

  const values =
    root.values ??
    root.Values ??
    root.fieldValues ??
    root.FieldValues ??
    [];

  const definitions = normalizeDefinitions(defs);
  const valuesMap = {};

  if (Array.isArray(values)) {
    values.forEach(item => {
      const fieldId = pickFirst(
        item?.fieldId,
        item?.FieldId,
        item?.definitionId,
        item?.DefinitionId
      );
      if (!fieldId) return;
      const valueJson = pickFirst(item?.valueJson, item?.ValueJson, item?.json);
      const value = parseValueJson(valueJson ?? item?.value ?? item?.Value);
      valuesMap[fieldId] = value;
    });
  }

  return { definitions, valuesMap };
};

export const getCustomFieldDefinitions = async ({
  entityType = DEFAULT_ENTITY_TYPE,
  includeInactive = false,
} = {}) => {
  const normalizedEntityType = normalizeEntityType(entityType);
  const res = await axiosClient.get("/customfields/definitions", {
    params: { entityType: normalizedEntityType, includeInactive },
  });

  const raw = res?.data?.data ?? res?.data ?? [];
  return normalizeDefinitions(raw);
};

export const createCustomFieldDefinition = async payload =>
  axiosClient.post("/customfields/definitions", payload);

export const updateCustomFieldDefinition = async (fieldId, payload) =>
  axiosClient.put(`/customfields/definitions/${fieldId}`, payload);

export const deleteCustomFieldDefinition = async fieldId =>
  axiosClient.delete(`/customfields/definitions/${fieldId}`);

export const getSchemaWithValues = async ({
  entityType = DEFAULT_ENTITY_TYPE,
  entityId,
} = {}) => {
  const normalizedEntityType = normalizeEntityType(entityType);
  const res = await axiosClient.get("/customfields/schema-with-values", {
    params: { entityType: normalizedEntityType, entityId },
  });
  return normalizeSchemaWithValues(res?.data);
};

export const upsertCustomFieldValues = async payload =>
  axiosClient.put("/customfields/values", payload);

export const CUSTOM_FIELD_DATA_TYPES = [
  "Text",
  "Number",
  "Date",
  "Boolean",
  "SingleSelect",
  "MultiSelect",
];
