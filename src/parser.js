// src/parser.js

// Parse PrairieTest's canonical ISO timestamp. Because the timestamp contains
// a UTC offset (normally "Z"), it represents the same instant in every browser
// timezone.
export function parseAbsoluteDate(dateISO) {
  if (typeof dateISO !== "string") return null;

  const normalizedDateISO = dateISO.trim();
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalizedDateISO);
  if (!hasExplicitOffset) return null;

  const date = new Date(normalizedDateISO);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Extract duration from the reservation details column.
// Supports formats like:
//   "50 min"
//   "2 h 10 min"
export function parseDurationMinutes(durationText) {
  if (typeof durationText !== "string") return null;

  const hourMatch = durationText.match(
    /\b(\d+)\s*(?:h|hr|hrs|hour|hours)\b/i,
  );
  const minMatch = durationText.match(
    /\b(\d+)\s*(?:m|min|mins|minute|minutes)\b/i,
  );

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minMatch ? Number(minMatch[1]) : 0;

  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

// Convert raw reservation object into a structured event object.
// - Calculates correct academic year from title
// - Parses start time
// - Calculates end time using duration
// - Returns ISO timestamps (UTC format)
export function parseReservation(raw, defaultDurationMin = 60) {
  const start = parseAbsoluteDate(raw.dateISO);

  // A missing duration falls back to defaultDurationMin, which silently moves
  // the end time. Flag it so the popup can tell the user to check that exam
  // rather than trusting an invented end time.
  const parsedDurationMin = parseDurationMinutes(raw.durationText);
  const durationMin = parsedDurationMin ?? defaultDurationMin;

  const end = start
    ? new Date(start.getTime() + durationMin * 60 * 1000)
    : null;

  return {
    id: raw.link ?? "",
    title: raw.title ?? "",
    location: raw.location ?? "",
    url: raw.link ?? "",
    startISO: start ? start.toISOString() : null,
    endISO: end ? end.toISOString() : null,
    timeZone: raw.timeZone ?? "",
    notes: "",
    endTimeEstimated: parsedDurationMin === null,
  };
}
