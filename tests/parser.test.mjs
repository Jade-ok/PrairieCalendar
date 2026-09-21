import test from "node:test";
import assert from "node:assert/strict";

import {
  parseAbsoluteDate,
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
    rawText: ["60 min"],
  });

  assert.equal(event.startISO, "2026-03-23T23:00:00.000Z");
  assert.equal(event.endISO, "2026-03-24T00:00:00.000Z");
  assert.equal(event.timeZone, "Canada/Pacific");
});

test("parseReservation retains visible-text fallback for legacy stored data", () => {
  const event = parseReservation({
    title: "Legacy Exam",
    dateText: "Mon, Mar 23, 4pm (PDT)",
    tooltipText: "2026-03-23 16:00:00 (Pacific Daylight Time)",
    rawText: ["60 min"],
  });

  assert.notEqual(event.startISO, null);
});
