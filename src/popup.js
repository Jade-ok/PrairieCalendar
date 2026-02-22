// src/popup.js
// This popup reads raw reservations from storage,
// parses them into structured event objects,
// and saves the parsed results back into storage.

import { parseReservation } from "./parser.js";
import { generateICS, downloadICSFile } from "./ics.js";

document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const downloadBtn = document.getElementById("download-btn");
  const listContainer = document.getElementById("reservation-list"); // Grab our new container
  // Grab the select/deselect all buttons
  const selectAllBtn = document.getElementById("select-all-btn");
  const deselectAllBtn = document.getElementById("deselect-all-btn");

  status.textContent = "Loading reservations...";

  // 1. Fetch the raw data as soon as the popup opens
  const { rawReservations = [] } =
    await chrome.storage.local.get("rawReservations");

  if (rawReservations.length === 0) {
    status.textContent = "No raw reservations found.";
    return;
  }

  // 2. Parse the data
  const parsedReservations = rawReservations.map((r) => parseReservation(r));
  status.textContent = `Found ${parsedReservations.length} reservations.`;

  // 3. Render the checkboxes
  // We loop through each parsed reservation and create HTML elements for it
  parsedReservations.forEach((reservation) => {
    // Create a container for this specific row
    const row = document.createElement("div");
    row.style.marginBottom = "8px"; // Add a little spacing

    // Create the actual checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = reservation.id; // As requested, value is the URL/ID
    checkbox.id = reservation.id; // Give it an ID so the label can attach to it
    checkbox.checked = false; // Let's uncheck them all by default!

    // Create a label so the user knows what they are checking
    const label = document.createElement("label");
    label.htmlFor = reservation.id; // Connects the label to the checkbox
    // Format the text: "Title - Start Time"
    label.textContent = ` ${reservation.title} - ${new Date(reservation.startISO).toLocaleString()}`;
    label.style.fontSize = "12px";

    // Put the checkbox and label into our row
    row.appendChild(checkbox);
    row.appendChild(label);

    // Put the row into our main container on the HTML page
    listContainer.appendChild(row);
  });

  // functionality of the select/deselect all buttons
  selectAllBtn?.addEventListener("click", () => {
    document
      .querySelectorAll('#reservation-list input[type="checkbox"]')
      .forEach((cb) => (cb.checked = true));
  });

  deselectAllBtn?.addEventListener("click", () => {
    document
      .querySelectorAll('#reservation-list input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
  });

  // Wiring functionality of the download button
  // Listen for the user to click the download button
  downloadBtn.addEventListener("click", () => {
    // 1. Find all checkboxes that are currently checked
    // querySelectorAll is a super powerful way to find elements using CSS selectors!
    const checkedBoxes = document.querySelectorAll(
      '#reservation-list input[type="checkbox"]:checked',
    );

    // 2. Extract their values (which we set to the reservation IDs earlier)
    // Array.from() turns the NodeList from querySelectorAll into a regular JavaScript array
    const selectedIds = Array.from(checkedBoxes).map(
      (checkbox) => checkbox.value,
    );

    // 3. Do a quick "sanity check"
    if (selectedIds.length === 0) {
      status.textContent = "Please select at least one exam!";
      return; // Stop running the function if nothing is selected
    }

    // 4. Filter the parsedReservations array to only include the ones the user selected
    const selectedEvents = parsedReservations.filter((reservation) =>
      selectedIds.includes(reservation.id),
    );

    status.textContent = `Preparing ${selectedEvents.length} events for download...`;
    console.log("Filtered events ready for ICS:", selectedEvents);

    // 5. Pass the filtered events to our ICS generator (we will build the logic for this next!)
    const icsString = generateICS(selectedEvents);

    // Trigger the download!
    downloadICSFile(icsString);

    status.textContent = "Download complete!";
  });
});
