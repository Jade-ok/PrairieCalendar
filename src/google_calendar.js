function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

function makeUID(event) {
  return `${event.title}::${event.startISO}::${event.location}`;
}

async function findEventByUID(token, uid) {
  const params = new URLSearchParams({
    privateExtendedProperty: `uid=${uid}`,
    maxResults: 1,
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.length > 0 ? data.items[0] : null;
}

async function createCalendarEvent(token, event) {
  const uid = makeUID(event);
  const existing = await findEventByUID(token, uid);
  if (existing) return { skipped: true };

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: event.title,
    location: event.location,
    description: event.url || event.notes || "",
    start: { dateTime: event.startISO, timeZone },
    end: { dateTime: event.endISO, timeZone },
    extendedProperties: { private: { uid } },
  };
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create event");
  }
  return res.json();
}

export async function exportToGoogleCalendar(events, onProgress) {
  const token = await getAuthToken(true);
  let success = 0, failed = 0, skipped = 0;
  for (let i = 0; i < events.length; i++) {
    try {
      const result = await createCalendarEvent(token, events[i]);
      result.skipped ? skipped++ : success++;
    } catch {
      failed++;
    }
    onProgress?.(i + 1, events.length);
  }
  return { success, failed, skipped };
}
