// src/parser.js

// Convert date text like:
// "Mon, Feb 23, 1pm (PST)" or "Tue, Mar 3, 7pm (PST)"
// into a JS Date (best-effort).
// NOTE: This is a simple parser. We'll refine timezone later.
export function parseDateText(dateText, defaultYear = new Date().getFullYear()) {
  if (!dateText) return null;

  // Remove day-of-week and timezone: "Mon, Feb 23, 1pm (PST)" -> "Feb 23, 1pm"
  const cleaned = dateText
    .replace(/^[A-Za-z]{3},\s*/, "")      // "Mon, "
    .replace(/\s*\((PST|PDT)\)\s*$/, ""); // " (PST)" or " (PDT)"

  // Split "Feb 23, 1pm"
  const m = cleaned.match(/^([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m) return null;

  const [, monStr, dayStr, hourStr, minStr, ampmRaw] = m;
  const day = Number(dayStr);
  let hour = Number(hourStr);
  const minute = minStr ? Number(minStr) : 0;
  const ampm = ampmRaw.toLowerCase();

  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  // JS month index
  const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monIdx = monthNames.indexOf(monStr.slice(0,3).toLowerCase());
  if (monIdx < 0) return null;

  // Create a Date in local timezone (good enough for now)
  return new Date(defaultYear, monIdx, day, hour, minute, 0, 0);
}

// Parse duration from rawText, e.g. "50 min" or "2 h 10 min"
export function parseDurationMinutes(rawTextArr) {
  const text = (rawTextArr || []).join(" ");
  const h = text.match(/(\d+)\s*h/i);
  const m = text.match(/(\d+)\s*min/i);

  const hours = h ? Number(h[1]) : 0;
  const mins = m ? Number(m[1]) : 0;

  const total = hours * 60 + mins;
  return total > 0 ? total : null;
}

// Main: convert raw reservation -> parsed reservation
export function parseReservation(raw, defaultDurationMin = 60) {
  const start = parseDateText(raw.dateText);
  const durationMin = parseDurationMinutes(raw.rawText) ?? defaultDurationMin;

  const end = start ? new Date(start.getTime() + durationMin * 60 * 1000) : null;

  return {
    title: raw.title ?? "",
    location: raw.location ?? "",
    url: raw.link ?? "",
    startISO: start ? start.toISOString() : null,
    endISO: end ? end.toISOString() : null,
    notes: (raw.rawText || []).join("\n"),
  };
}