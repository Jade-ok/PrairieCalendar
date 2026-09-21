import test from "node:test";
import assert from "node:assert/strict";

import {
  parseAbsoluteDate,
  parseDurationMinutes,
  parseReservation,
} from "../src/parser.js";

test("parseAbsoluteDate preserves PrairieTest's canonical instant", () => {
  const date = parseAbsoluteDate("2026-03-23T23:00:00.000Z");

  assert.equal(date?.toISOString(), "2026-03-23T23:00:00.000Z");
});

test("parseAbsoluteDate rejects missing and invalid values", () => {
  assert.equal(parseAbsoluteDate(""), null);
  assert.equal(parseAbsoluteDate("not-a-date"), null);
  assert.equal(parseAbsoluteDate("2026-03-23T23:00:00"), null);
});

test("parseReservation prefers the canonical timestamp over displayed text", () => {
  const event = parseReservation({
    title: "UBC Exam",
    dateText: "Mon, Mar 23, 4pm (PDT)",
    dateISO: "2026-03-23T23:00:00.000Z",
    timeZone: "Canada/Pacific",
    tooltipText: "2026-03-23 16:00:00 (Pacific Daylight Time)",
    location: "UBC",
    link: "reservation-1",
    durationText: "60 min, In-person, No accommodations",
  });

  assert.equal(event.startISO, "2026-03-23T23:00:00.000Z");
  assert.equal(event.endISO, "2026-03-24T00:00:00.000Z");
  assert.equal(event.timeZone, "Canada/Pacific");
});

test("parseReservation rejects legacy data without a canonical timestamp", () => {
  const event = parseReservation({
    title: "Legacy Exam",
    dateText: "Mon, Mar 23, 4pm (PDT)",
    tooltipText: "2026-03-23 16:00:00 (Pacific Daylight Time)",
    durationText: "60 min",
  });

  assert.equal(event.startISO, null);
  assert.equal(event.endISO, null);
});

test("parseDurationMinutes supports minute and hour durations", () => {
  assert.equal(parseDurationMinutes("50 min, In-person"), 50);
  assert.equal(parseDurationMinutes("2 h 10 min, In-person"), 130);
  assert.equal(parseDurationMinutes("1 hour 5 minutes"), 65);
});

test("parseReservation ignores duration-like text outside the details column", () => {
  const event = parseReservation({
    title: "MATH 100: 2 hr midterm review",
    dateISO: "2026-10-03T23:00:00.000Z",
    location: "Room 3h Annex",
    durationText: "50 min, In-person, No accommodations",
    rawText: ["MATH 100: 2 hr midterm review", "Room 3h Annex", "50 min"],
  });

  assert.equal(event.endISO, "2026-10-03T23:50:00.000Z");
});

test("parseReservation flags an end time that fell back to the default", () => {
  const raw = {
    title: "CPSC 213 (2025W2): Final Exam",
    dateISO: "2026-10-03T23:00:00.000Z",
    location: "ICCS X251",
    link: "reservation-1",
  };

  const readable = parseReservation({
    ...raw,
    durationText: "2 h 10 min, In-person",
  });
  assert.equal(readable.endTimeEstimated, false);
  assert.equal(readable.endISO, "2026-10-04T01:10:00.000Z");

  // The details column is missing or restructured, so the 60-minute default
  // invents an end time that the popup must not present as confirmed.
  const unreadable = parseReservation({ ...raw, durationText: "" });
  assert.equal(unreadable.endTimeEstimated, true);
  assert.equal(unreadable.endISO, "2026-10-04T00:00:00.000Z");
});
