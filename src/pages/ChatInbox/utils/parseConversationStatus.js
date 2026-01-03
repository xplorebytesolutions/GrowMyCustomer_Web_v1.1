export function parseConversationStatus(status) {
  const raw = String(status ?? "")
    .trim()
    .toLowerCase();
  if (raw === "pending") return "Pending";
  if (raw === "closed") return "Closed";
  return "Open"; // safest default
}
