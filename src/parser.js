// src/parser.js

// Extracts the 4-digit year from the data-bs-title string
export function extractYearFromTooltip(tooltipStr, fallbackYear = new Date().getFullYear()) {
    if (!tooltipStr) 
    return fallbackYear;
    
    const match = tooltipStr.match(/^(\d{4})/);
    return match ? Number(match[1]) : fallbackYear;
  }

// Convert text like:
// "Mon, Feb 23, 1pm (PST)"
// into a JavaScript Date object in the local timezone.
// The year is provided separately (derived from the title).
export function parseDateText(dateText, year) {
  if (!dateText) return null;

  // Remove weekday and timezone abbreviation
  // Example:
  // "Mon, Feb 23, 1pm (PST)" → "Feb 23, 1pm"
  const cleaned = dateText
    .replace(/^[A-Za-z]{3},\s*/, "")
    .replace(/\s*\([A-Z]{3,4}\)\s*$/, "");

  // Match: "Feb 23, 1pm" or "Feb 23, 1:30pm"
  const match = cleaned.match(
    /^([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i
  );
  if (!match) return null;

  const [, monthStr, dayStr, hourStr, minuteStr, ampmRaw] = match;

  const day = Number(dayStr);
  let hour = Number(hourStr);
  const minute = minuteStr ? Number(minuteStr) : 0;
  const ampm = ampmRaw.toLowerCase();

  // Convert 12-hour time to 24-hour time
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  // Convert month name to JS month index (0–11)
  const monthNames = [
    "jan","feb","mar","apr","may","jun",
    "jul","aug","sep","oct","nov","dec"
  ];
  const monthIndex = monthNames.indexOf(monthStr.slice(0, 3).toLowerCase());
  if (monthIndex < 0) return null;

  // Create Date in the browser's local timezone
  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

// Extract duration from raw text array.
// Supports formats like:
//   "50 min"
//   "2 h 10 min"
export function parseDurationMinutes(rawTextArr) {
  const text = (rawTextArr || []).join(" ");

  const hourMatch = text.match(/(\d+)\s*h/i);
  const minMatch = text.match(/(\d+)\s*min/i);

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
//   const year = yearFromTitle(raw.title);
  const exactYear = extractYearFromTooltip(raw.tooltipText);
  const start = parseDateText(raw.dateText, exactYear);

  const durationMin =
    parseDurationMinutes(raw.rawText) ?? defaultDurationMin;

  const end = start
    ? new Date(start.getTime() + durationMin * 60 * 1000)
    : null;

    // (For future reference - might be used in the 'notes' section in ics file.)
    // To clean up the repetitive part in the ics file
    // 1. Trim whitespace, 2. Remove empty lines, 3. Use Set to kill duplicates
  const cleanedTextArray = [...new Set(
    (raw.rawText || [])
      .map(text => text.trim())
      .filter(text => text.length > 0)
  )];

  return {
    id: raw.link ?? "",
    title: raw.title ?? "",
    location: raw.location ?? "",
    url: raw.link ?? "",
    startISO: start ? start.toISOString() : null,
    endISO: end ? end.toISOString() : null,
    notes: "",
  };
}