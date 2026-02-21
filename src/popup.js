// src/popup.js
// This popup reads raw reservations from storage,
// parses them into structured event objects,
// and saves the parsed results back into storage.

import { parseReservation } from "./parser.js";
document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const downloadBtn = document.getElementById("download-btn");
  const listContainer = document.getElementById("reservation-list"); // Grab our new container

  status.textContent = "Loading reservations...";

  // 1. Fetch the raw data as soon as the popup opens
  const { rawReservations = [] } = await chrome.storage.local.get("rawReservations");

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
    checkbox.id = reservation.id;    // Give it an ID so the label can attach to it
    checkbox.checked = true;         // Let's check them all by default!

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

  // We will handle the download button click later!
    downloadBtn.addEventListener("click", () => {
    console.log("Download button clicked! We need to wire this up next.");
  });
});