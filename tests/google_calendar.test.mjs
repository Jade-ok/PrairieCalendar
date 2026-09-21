import test from "node:test";
import assert from "node:assert/strict";

import {
  exportEventsWithToken,
  fetchExistingCalendarEvents,
  isDuplicateCalendarEvent,
} from "../src/google_calendar.js";

const events = [
  {
    title: "CPSC 317: Quiz 1",
    location: "ICCS 008",
    url: "https://us.prairietest.com/reservation/1",
    notes: "Bring student ID",
    startISO: "2026-10-03T23:00:00.000Z",
    endISO: "2026-10-03T23:50:00.000Z",
    timeZone: "Canada/Pacific",
  },
  {
    title: "MATH 100: Midterm",
    location: "OSBO A",
    url: "https://us.prairietest.com/reservation/2",
    notes: "",
    startISO: "2026-10-10T20:00:00.000Z",
    endISO: "2026-10-10T21:00:00.000Z",
    timeZone: "Canada/Pacific",
  },
];

test("fetchExistingCalendarEvents checks the full export range in one request", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(new URL(url));
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  });

  await fetchExistingCalendarEvents("token", events);

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].searchParams.get("timeMin"),
    "2026-10-03T22:59:00.000Z",
  );
  assert.equal(
    requests[0].searchParams.get("timeMax"),
    "2026-10-10T20:01:00.000Z",
  );
});

test("fetchExistingCalendarEvents reports lookup failures instead of creating duplicates", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response(
      JSON.stringify({ error: { message: "Calendar API unavailable" } }),
      { status: 503 },
    ),
  );

  await assert.rejects(
    fetchExistingCalendarEvents("token", events),
    /Failed to check Google Calendar: Calendar API unavailable/,
  );
});

test("isDuplicateCalendarEvent matches title, location, and start time", () => {
  const existing = [{
    summary: events[0].title,
    location: events[0].location,
    start: { dateTime: "2026-10-03T16:00:00-07:00" },
  }];

  assert.equal(isDuplicateCalendarEvent(existing, events[0]), true);
  assert.equal(isDuplicateCalendarEvent(existing, events[1]), false);
});

test("Google export reuses one duplicate lookup and sends the shared description", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options = {}) => {
    requests.push({ url: String(url), options });

    if (!options.method) {
      return new Response(JSON.stringify({
        items: [{
          summary: events[0].title,
          location: events[0].location,
          start: { dateTime: events[0].startISO },
        }],
      }), { status: 200 });
    }

    const body = JSON.parse(options.body);
    return new Response(JSON.stringify({
      ...body,
      start: { dateTime: body.start.dateTime },
    }), { status: 200 });
  });

  const result = await exportEventsWithToken("token", events);

  assert.deepEqual(result, { success: 1, failed: 0, skipped: 1 });
  assert.equal(requests.length, 2);
  assert.equal(requests.filter(({ options }) => !options.method).length, 1);

  const created = JSON.parse(requests[1].options.body);
  assert.equal(
    created.description,
    "https://us.prairietest.com/reservation/2",
  );
});
