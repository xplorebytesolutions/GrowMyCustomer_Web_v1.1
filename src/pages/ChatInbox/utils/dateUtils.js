/** Small helper: datetime-local -> ISO string */
export function toIsoFromDatetimeLocal(datetimeLocal) {
  if (!datetimeLocal) return null;
  const d = new Date(datetimeLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

