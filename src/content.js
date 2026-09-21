// content.js
// Content script placeholder for PrairieCalendar.
// Will later extract PrairieTest exam reservations from the page DOM.


// const contextYear = new Date().getFullYear();

// Select the first exam reservation card.
// This card contains the list of upcoming exam reservations.
const examCard = document.querySelector("div.card.mt-4");

// If the card exists, extract each <li> item inside it.
// If not, return an empty array (safe fallback).
const rawReservations = examCard
  ? [...examCard.querySelectorAll("ul.list-group.list-group-flush li.list-group-item")]
      .map(li => {
        // Get exam title from the link
        const title = li.querySelector('a')?.textContent.trim();
        const dateContainer = li.querySelector('[data-testid="date"]');

        // Keep the visible date text as a fallback for older PrairieTest markup.
        const dateText = dateContainer?.textContent.trim();

        // PrairieTest includes the canonical instant and source timezone in
        // data-format-date. Prefer that data over reparsing the displayed time,
        // which may otherwise be interpreted in the browser's local timezone.
        const formattedDateElement = dateContainer?.matches('[data-format-date]')
          ? dateContainer
          : dateContainer?.querySelector('[data-format-date]');
        const serializedDateData = formattedDateElement?.getAttribute('data-format-date');

        let dateISO = "";
        let timeZone = "";
        if (serializedDateData) {
          try {
            const dateData = JSON.parse(serializedDateData);
            dateISO = typeof dateData.date === "string" ? dateData.date : "";
            timeZone = typeof dateData.timezone === "string" ? dateData.timezone : "";
          } catch (error) {
            console.warn("Could not parse PrairieTest date metadata:", error);
          }
        }

        // Get the tooltip text from the tooltip
        const tooltipText = li.querySelector('[data-bs-title]')?.getAttribute('data-bs-title') || "";
       
        // get location text
        const location = li.querySelector('[data-testid="location"]')?.textContent.trim();
        const link = li.querySelector('a')?.href;
       
        // Collect all visible text inside this reservation item
        const rawText = [...li.querySelectorAll("div, span")]
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0);

        // Return a simple object for now; we'll parse it properly later.
        return {
          title,
          dateText,
          dateISO,
          timeZone,
          tooltipText,
          location,
          link,
          rawText,
        };
      })
      .filter(x => x.title)
  : [];
// save rawReservations with contextYear to local storage for later use in popup.js
chrome.storage.local.set({ rawReservations }, () => {
  console.log("rawReservations saved:", rawReservations);
});
