// src/popup.js

import { parseReservation } from "./parser.js";
import { generateICS, downloadICSFile } from "./ics.js";
import { exportToGoogleCalendar } from "./google_calendar.js";

document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const downloadBtn = document.getElementById("download-btn");
  const listContainer = document.getElementById("reservation-list");
  const selectAllBtn = document.getElementById("select-all-btn");
  const deselectAllBtn = document.getElementById("deselect-all-btn");
  const exportGoogleBtn = document.getElementById("export-google-btn");

  status.textContent = "Loading reservations...";

  const { rawReservations = [] } =
    await chrome.storage.local.get("rawReservations");

  if (rawReservations.length === 0) {
    status.textContent = "No raw reservations found.";
    return;
  }

  const parsedReservations = rawReservations.map((r) => parseReservation(r));
  status.textContent = `You've got ${parsedReservations.length} schedules lined up!`;

  // Render checkboxes
  parsedReservations.forEach((reservation) => {
    const row = document.createElement("div");
    row.className = "reservation";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = reservation.id;
    checkbox.id = reservation.id;
    checkbox.checked = false;

    const label = document.createElement("label");
    label.htmlFor = reservation.id;
    label.className = "res-label";

    const titleDiv = document.createElement("div");
    titleDiv.className = "res-title";
    titleDiv.textContent = reservation.title;

    const timeDiv = document.createElement("div");
    timeDiv.className = "res-time";
    timeDiv.textContent = new Date(reservation.startISO).toLocaleString();

    label.appendChild(titleDiv);
    label.appendChild(timeDiv);

    row.appendChild(checkbox);
    row.appendChild(label);

    listContainer.appendChild(row);
  });

  // ✅ Drag-to-scroll (REGISTER ONCE, OUTSIDE forEach)
  let isDown = false;
  let startY = 0;
  let startScrollTop = 0;

  listContainer.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isDown = true;
    startY = e.clientY;
    startScrollTop = listContainer.scrollTop;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    const dy = e.clientY - startY;
    listContainer.scrollTop = startScrollTop - dy;
  });

  window.addEventListener("mouseup", () => {
    isDown = false;
  });

  // Select / Deselect all
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

  // Download ICS
  downloadBtn.addEventListener("click", () => {
    const checkedBoxes = document.querySelectorAll(
      '#reservation-list input[type="checkbox"]:checked',
    );

    const selectedIds = Array.from(checkedBoxes).map(
      (checkbox) => checkbox.value,
    );

    if (selectedIds.length === 0) {
      status.textContent = "Please select at least one exam!";
      return;
    }

    const selectedEvents = parsedReservations.filter((reservation) =>
      selectedIds.includes(reservation.id),
    );

    status.textContent = `Preparing ${selectedEvents.length} events for download...`;

    const icsString = generateICS(selectedEvents);
    downloadICSFile(icsString);

    status.textContent = "Download complete!";
  });

  // Export to Google Calendar
  exportGoogleBtn?.addEventListener("click", async () => {
    const checkedBoxes = document.querySelectorAll(
      '#reservation-list input[type="checkbox"]:checked',
    );

    const selectedIds = Array.from(checkedBoxes).map(
      (checkbox) => checkbox.value,
    );

    if (selectedIds.length === 0) {
      status.textContent = "Please select at least one exam!";
      return;
    }

    const selectedEvents = parsedReservations.filter((reservation) =>
      selectedIds.includes(reservation.id),
    );

    status.textContent = `Exporting 0/${selectedEvents.length}...`;

    try {
      const result = await exportToGoogleCalendar(
        selectedEvents,
        (done, total) => {
          status.textContent = `Exporting ${done}/${total}...`;
        },
      );

      if (result.failed === 0 && result.skipped === 0) {
        status.textContent = `Added ${result.success} events to Google Calendar!`;
      } else if (result.failed === 0) {
        status.textContent = `${result.success} added, ${result.skipped} already in calendar.`;
      } else {
        status.textContent = `${result.success} added, ${result.skipped} already in calendar, ${result.failed} failed.`;
      }
    } catch (err) {
      status.textContent = `Google export failed: ${err.message}`;
    }
  });
});
