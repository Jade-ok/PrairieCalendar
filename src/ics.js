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

function validateEvent(event) {
  let start;
  try {
    formatICSDate(event?.startISO);
    start = new Date(event.startISO);
  } catch {
    throw new Error(
      `Cannot export "${event?.title || "Untitled event"}" without a valid start time.`,
    );
  }

  if (event.endISO) {
    let end;
    try {
      formatICSDate(event.endISO);
      end = new Date(event.endISO);
    } catch {
      throw new Error(
        `Cannot export "${event.title || "Untitled event"}" with an invalid end time.`,
      );
    }

    if (end <= start) {
      throw new Error(
        `Cannot export "${event.title || "Untitled event"}" with an invalid end time.`,
      );
    }
  }
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
    validateEvent(event);

    const uid = event.id || `${Date.now()}-${index}@prairiecalendar`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeICSText(uid)}`,
      `DTSTAMP:${generatedAt}`,
      `DTSTART:${formatICSDate(event.startISO)}`,
    );

    if (event.endISO) {
      lines.push(`DTEND:${formatICSDate(event.endISO)}`);
    }

    lines.push(
      `SUMMARY:${escapeICSText(event.title)}`,
      `LOCATION:${escapeICSText(event.location)}`,
      `DESCRIPTION:${escapeICSText(event.notes)}`,
      "END:VEVENT",
    );
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
