// Local helper: format dates nicely
export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

// Local helper: first letter avatar
export function getInitial(name, phone) {
  const src = name || phone || "?";
  return src.trim()[0]?.toUpperCase() ?? "?";
}

// Day label for separators (Today / Yesterday / 12 Dec 2025)
export function formatDayLabel(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const todayKey = today.toDateString();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  const key = date.toDateString();

  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

