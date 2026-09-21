import test from "node:test";
import assert from "node:assert/strict";

import {
  exportEventsWithToken,
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

test("isDuplicateCalendarEvent asks only about the minute around the exam", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(new URL(url));
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  });

  await isDuplicateCalendarEvent("token", events[0]);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get("timeMin"), "2026-10-03T22:59:00.000Z");
  assert.equal(requests[0].searchParams.get("timeMax"), "2026-10-03T23:01:00.000Z");
});

test("isDuplicateCalendarEvent reports lookup failures instead of answering no", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response(
      JSON.stringify({ error: { message: "Calendar API unavailable" } }),
      { status: 503 },
    ),
  );

  await assert.rejects(
    isDuplicateCalendarEvent("token", events[0]),
    /Failed to check Google Calendar: Calendar API unavailable/,
  );
});

test("isDuplicateCalendarEvent matches title, location, and start time", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response(JSON.stringify({
      items: [{
        summary: events[0].title,
        location: events[0].location,
        start: { dateTime: "2026-10-03T16:00:00-07:00" },
      }],
    }), { status: 200 }),
  );

  assert.equal(await isDuplicateCalendarEvent("token", events[0]), true);
  assert.equal(await isDuplicateCalendarEvent("token", events[1]), false);
});

test("Google export skips duplicates and sends the shared description", async (t) => {
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

  assert.deepEqual(result, { success: 1, failed: 0, skipped: 1, unchecked: 0 });
  // One lookup per exam, plus one creation for the exam that was not a duplicate.
  assert.equal(requests.filter(({ options }) => !options.method).length, 2);

  const created = JSON.parse(
    requests.find(({ options }) => options.method === "POST").options.body,
  );
  assert.equal(
    created.description,
    "https://us.prairietest.com/reservation/2",
  );
});

test("a failed duplicate lookup still adds the exam and reports it", async (t) => {
  const posts = [];
  t.mock.method(globalThis, "fetch", async (url, options = {}) => {
    if (options.method === "POST") {
      posts.push(JSON.parse(options.body));
      return new Response(JSON.stringify({}), { status: 200 });
    }
    // The lookup is down; the create still works.
    return new Response(
      JSON.stringify({ error: { message: "Calendar API unavailable" } }),
      { status: 503 },
    );
  });

  const result = await exportEventsWithToken("token", events);

  // Missing an exam is worse than a second copy, so both are created.
  assert.deepEqual(result, { success: 2, failed: 0, skipped: 0, unchecked: 2 });
  assert.equal(posts.length, 2);
});
