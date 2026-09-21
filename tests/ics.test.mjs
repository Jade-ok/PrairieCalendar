import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeICSText,
  formatICSDate,
  generateICS,
} from "../src/ics.js";

const validEvent = {
  id: "reservation-1",
  title: "Quiz, Part 1; final\\review",
  location: "ICCS 008, Basement; west\nEntrance B",
  startISO: "2026-10-03T23:00:00.000Z",
  endISO: "2026-10-03T23:50:00.000Z",
  notes: "Line 1\nLine 2",
};

test("escapeICSText escapes RFC 5545 text delimiters and newlines", () => {
  assert.equal(
    escapeICSText("A\\B, C; D\r\nE"),
    "A\\\\B\\, C\\; D\\nE",
  );
});

test("formatICSDate normalizes offset timestamps to UTC", () => {
  assert.equal(
    formatICSDate("2026-10-03T16:00:00-07:00"),
    "20261003T230000Z",
  );
  assert.throws(
    () => formatICSDate("2026-10-03T23:00:00"),
    /explicit UTC offset/,
  );
});

test("generateICS emits escaped text with CRLF line endings", () => {
  const ics = generateICS([validEvent]);

  assert.match(ics, /DTSTART:20261003T230000Z\r\n/);
  assert.match(ics, /DTEND:20261003T235000Z\r\n/);
  assert.ok(ics.includes("SUMMARY:Quiz\\, Part 1\\; final\\\\review\r\n"));
  assert.ok(
    ics.includes("LOCATION:ICCS 008\\, Basement\\; west\\nEntrance B\r\n"),
  );
  assert.ok(ics.includes("DESCRIPTION:Line 1\\nLine 2\r\n"));
  assert.doesNotMatch(ics, /(?<!\r)\n/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("generateICS rejects events without valid timestamps", () => {
  assert.throws(
    () => generateICS([{ ...validEvent, startISO: null }]),
    /without a valid start time/,
  );
  assert.throws(
    () => generateICS([{ ...validEvent, endISO: "not-a-date" }]),
    /with an invalid end time/,
  );
});

test("generateICS folds content lines at 75 UTF-8 bytes", () => {
  const ics = generateICS([
    {
      ...validEvent,
      title: "긴 시험 제목 ".repeat(12),
    },
  ]);

  for (const line of ics.split("\r\n").filter(Boolean)) {
    assert.ok(new TextEncoder().encode(line).length <= 75);
  }
  assert.match(ics, /\r\n /);
});
