import test from "node:test";
import assert from "node:assert/strict";

import { generateICS } from "../src/ics.js";
import { parseReservation } from "../src/parser.js";

test("exports a Vancouver exam as the same UTC instant in every local timezone", () => {
  const event = parseReservation({
    title: "CPSC 317 (2026W1): Quiz 1",
    dateText: "Sat, Oct 3, 4pm (PDT)",
    dateISO: "2026-10-03T23:00:00.000Z",
    timeZone: "Canada/Pacific",
    tooltipText: "2026-10-03 16:00:00 (Pacific Daylight Time)",
    location: "ORCA: ICCS 008",
    link: "reservation-3703025",
    rawText: ["50 min"],
  });

  const ics = generateICS([event]);

  assert.match(ics, /DTSTART:20261003T230000Z/);
  assert.match(ics, /DTEND:20261003T235000Z/);
  assert.doesNotMatch(ics, /DTSTART:20261003T200000Z/);
});
