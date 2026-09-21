import { buildCalendarDescription } from "./calendar_event.js";

const WEBFLOW_OAUTH_CLIENT_ID =
  "958094905068-rv830auvkppner94h8e7irdg7s2njcie.apps.googleusercontent.com";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

async function isBraveBrowser() {
  return !!(navigator.brave && (await navigator.brave.isBrave?.()));
}

function isGoogleChromeBrowser() {
  const brands = navigator.userAgentData?.brands ?? [];
  if (brands.length > 0) {
    return brands.some((brand) => brand.brand === "Google Chrome");
  }

  const userAgent = navigator.userAgent;
  return (
    /\bChrome\//.test(userAgent) &&
    !/\b(Arc|Brave|Edg|OPR|Opera|Vivaldi)\//.test(userAgent)
  );
}

async function getAuthTokenViaWebAuthFlow() {
  const redirectUri = chrome.identity.getRedirectURL();

  const authUrl =
    `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${WEBFLOW_OAUTH_CLIENT_ID}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(GOOGLE_CALENDAR_SCOPE)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        const url = new URL(redirectUrl);
        const params = new URLSearchParams(url.hash.substring(1));
        const token = params.get("access_token");

        if (token) {
          resolve(token);
        } else {
          reject(new Error("Access token not found in redirect URL"));
        }
      }
    );
  });
}

function getAuthTokenViaChromeIdentity() {
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

async function getAuthToken() {
  if (await isBraveBrowser()) {
    return getAuthTokenViaWebAuthFlow();
  }

  if (isGoogleChromeBrowser()) {
    return getAuthTokenViaChromeIdentity();
  }

  return getAuthTokenViaWebAuthFlow();
}

async function readGoogleError(res, fallbackMessage) {
  try {
    const data = await res.json();
    return data.error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function fetchExistingCalendarEvents(token, events) {
  if (events.length === 0) return [];

  const startTimes = events.map((event) => new Date(event.startISO).getTime());
  if (startTimes.some(Number.isNaN)) {
    throw new Error("Cannot check Google Calendar with an invalid start time.");
  }

  const params = new URLSearchParams();
  params.set("timeMin", new Date(Math.min(...startTimes) - 60000).toISOString());
  params.set("timeMax", new Date(Math.max(...startTimes) + 60000).toISOString());
  params.set("singleEvents", "true");
  params.set("maxResults", "2500");

  const existingEvents = [];
  let pageToken = null;

  do {
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      const message = await readGoogleError(
        res,
        "Failed to check Google Calendar for existing events.",
      );
      throw new Error(`Failed to check Google Calendar: ${message}`);
    }

    const data = await res.json();
    existingEvents.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  return existingEvents;
}

export function isDuplicateCalendarEvent(existingEvents, event) {
  const eventStart = new Date(event.startISO).getTime();

  return existingEvents.some((item) => {
    const existingStart = new Date(
      item.start?.dateTime ?? item.start?.date,
    ).getTime();

    return (
      item.summary === event.title &&
      item.location === event.location &&
      Number.isFinite(existingStart) &&
      Math.abs(existingStart - eventStart) <= 60000
    );
  });
}

async function createCalendarEvent(token, event) {
  const timeZone =
    event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: event.title,
    location: event.location,
    description: buildCalendarDescription(event),
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
    throw new Error(await readGoogleError(res, "Failed to create event"));
  }
  return res.json();
}

export async function exportEventsWithToken(token, events, onProgress) {
  const existingEvents = await fetchExistingCalendarEvents(token, events);
  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < events.length; i++) {
    try {
      if (isDuplicateCalendarEvent(existingEvents, events[i])) {
        skipped++;
        onProgress?.(i + 1, events.length);
        continue;
      }

      const result = await createCalendarEvent(token, events[i]);
      existingEvents.push(result);
      success++;
    } catch {
      failed++;
    }
    onProgress?.(i + 1, events.length);
  }
  return { success, failed, skipped };
}

export async function exportToGoogleCalendar(events, onProgress) {
  const token = await getAuthToken();
  return exportEventsWithToken(token, events, onProgress);
}
