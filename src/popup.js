// // Minimal popup logic (safe)
// // No tab access, no content script injection, no messaging yet.

// document.addEventListener("DOMContentLoaded", () => {
//   const status = document.getElementById("status");
//   const downloadBtn = document.getElementById("download-btn");

//   status.textContent = "Popup loaded successfully.";

//   downloadBtn.addEventListener("click", () => {
//     alert("Not implemented yet.");
//   });
// });



// src/popup.js
// This popup reads raw reservations from storage,
// parses them into structured event objects,
// and saves the parsed results back into storage.

import { parseReservation } from "./parser.js";

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  const downloadBtn = document.getElementById("download-btn");

  // Initial status message
  status.textContent = "Popup loaded successfully.";

  downloadBtn.addEventListener("click", async () => {
    // Step 1: Retrieve raw reservations from chrome storage
    const { rawReservations = [] } =
      await chrome.storage.local.get("rawReservations");

    if (rawReservations.length === 0) {
      status.textContent = "No raw reservations found.";
      console.log("No rawReservations found in storage.");
      return;
    }

    // Step 2: Parse each raw reservation into a structured object
    const parsedReservations = rawReservations.map((r) =>
      parseReservation(r)
    );

    console.log("Parsed reservations:", parsedReservations);

    // Step 3: Save parsed results back into storage for later use (e.g., ICS generation)
    await chrome.storage.local.set({ parsedReservations });

    status.textContent = `Parsed ${parsedReservations.length} reservations. Check console.`;
  });
});