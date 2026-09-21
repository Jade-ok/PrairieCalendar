import { buildCalendarDescription } from "./calendar_event.js";

const CRLF = "\r\n";
const textEncoder = new TextEncoder();

export function escapeICSText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function formatICSDate(isoString) {
  if (typeof isoString !== "string" || isoString.trim() === "") {
    throw new Error("Calendar events require a valid date and time.");
  }

  const normalizedISO = isoString.trim();
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalizedISO)) {
    throw new Error("Calendar event times require an explicit UTC offset.");
  }

  const date = new Date(normalizedISO);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Calendar events require a valid date and time.");
  }

  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function foldICSLine(line) {
  const segments = [];
  let segment = "";

  for (const character of line) {
    if (textEncoder.encode(segment + character).length > 75) {
      segments.push(segment);
      segment = ` ${character}`;
    } else {
      segment += character;
    }
  }

  segments.push(segment);
  return segments.join(CRLF);
}

function formatICSURI(value) {
  return String(value ?? "").trim().replace(/[\r\n]/g, "");
}

function validateEvent(event) {
  const title = event?.title || "Untitled event";
  let formattedStart;
  try {
    formattedStart = formatICSDate(event?.startISO);
  } catch (error) {
    throw new Error(
      `Cannot export "${title}": ${error.message}`,
      { cause: error },
    );
  }

  let formattedEnd = null;
  if (event.endISO) {
    try {
      formattedEnd = formatICSDate(event.endISO);
    } catch (error) {
      throw new Error(
        `Cannot export "${title}" with an invalid end time: ${error.message}`,
        { cause: error },
      );
    }

    const start = new Date(event.startISO);
    const end = new Date(event.endISO);
    if (end <= start) {
      throw new Error(
        `Cannot export "${title}" with an invalid end time.`,
      );
    }
  }

  return { formattedStart, formattedEnd };
}

export function generateICS(events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("Select at least one valid event to export.");
  }

  const generatedAt = formatICSDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PrairieCalendar//EN",
    "CALSCALE:GREGORIAN",
  ];

  events.forEach((event, index) => {
    const { formattedStart, formattedEnd } = validateEvent(event);

    const uid = event.id || `${Date.now()}-${index}@prairiecalendar`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeICSText(uid)}`,
      `DTSTAMP:${generatedAt}`,
      `DTSTART:${formattedStart}`,
    );

    if (formattedEnd) {
      lines.push(`DTEND:${formattedEnd}`);
    }

    const description = buildCalendarDescription(event);
    lines.push(
      `SUMMARY:${escapeICSText(event.title)}`,
      `LOCATION:${escapeICSText(event.location)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
    );

    const eventURL = formatICSURI(event.url);
    if (eventURL) lines.push(`URL:${eventURL}`);

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return `${lines.map(foldICSLine).join(CRLF)}${CRLF}`;
}

export function downloadICSFile(icsString, filename = "PrairieTest_Exams.ics") {
  const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  const objectURL = URL.createObjectURL(blob);

  link.href = objectURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectURL);
}
