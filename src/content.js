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

        // PrairieTest includes the canonical instant and source timezone in
        // data-format-date.
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

        // get location text
        const location = li.querySelector('[data-testid="location"]')?.textContent.trim();
        const link = li.querySelector('a')?.href;

        // The final unlabelled column contains duration and exam details.
        // Read duration only from this column so numbers in titles or locations
        // cannot affect the calculated end time.
        const reservationRow = li.querySelector('.row');
        const detailsContainer = [...(reservationRow?.children ?? [])]
          .find(column => !column.hasAttribute('data-testid'));
        const durationText = detailsContainer?.textContent.trim() ?? "";

        // Return a simple object for now; we'll parse it properly later.
        return {
          title,
          dateISO,
          timeZone,
          location,
          link,
          durationText,
        };
      })
      .filter(x => x.title)
  : [];
// save rawReservations with contextYear to local storage for later use in popup.js
chrome.storage.local.set({ rawReservations }, () => {
  console.log("rawReservations saved:", rawReservations);
});
