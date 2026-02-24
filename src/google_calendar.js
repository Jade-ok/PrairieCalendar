function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (!chrome.runtime.lastError && token) {
        resolve(token);
        return;
      }
      chrome.identity.getAuthToken({ interactive: true }, (token2) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token2);
        }
      });
    });
  });
}

async function isDuplicate(token, event) {
  const startTime = new Date(event.startISO);
  const params = new URLSearchParams();
  params.set("timeMin", new Date(startTime.getTime() - 60000).toISOString());
  params.set("timeMax", new Date(startTime.getTime() + 60000).toISOString());
  params.set("singleEvents", "true");
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.items ?? []).some(
    (item) => item.summary === event.title && item.location === event.location
  );
}

async function createCalendarEvent(token, event) {
  if (await isDuplicate(token, event)) return { skipped: true };

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: event.title,
    location: event.location,
    description: event.url || event.notes || "",
    start: { dateTime: event.startISO, timeZone },
    end: { dateTime: event.endISO, timeZone },

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
  const token = await getAuthToken();
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
