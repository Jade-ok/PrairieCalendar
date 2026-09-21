export function buildCalendarDescription(event) {
  const parts = [event?.notes, event?.url]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return [...new Set(parts)].join("\n\n");
}
