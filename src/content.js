// content.js
// Content script placeholder for PrairieCalendar.
// Will later extract PrairieTest exam reservations from the page DOM.

// user's local year
const contextYear = new Date().getFullYear();

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
        // Get date text (Mon, Feb 23, 1pm (PST))
        const dateText = li.querySelector('[data-testid="date"]')?.textContent.trim();
       
        // get location text
        const location = li.querySelector('[data-testid="location"]')?.textContent.trim();
        const link = li.querySelector('a')?.href;
       
        // Collect all visible text inside this reservation item
        const rawText = [...li.querySelectorAll("div, span")]
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0);
        // Return a simple object for now; we'll parse it properly later.
        return { title, dateText, location, link, rawText };
      })
      .filter(x => x.title)
  : [];
// save rawReservations with contextYear to local storage for later use in popup.js
chrome.storage.local.set({ rawReservations, contextYear }, () => {
  console.log("rawReservations saved:", rawReservations);
  console.log("contextYear saved:", contextYear);
});
