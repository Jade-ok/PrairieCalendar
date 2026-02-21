// Minimal popup logic (safe)
// No tab access, no content script injection, no messaging yet.

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  const downloadBtn = document.getElementById("download-btn");

  status.textContent = "Popup loaded successfully.";

  downloadBtn.addEventListener("click", () => {
    alert("Not implemented yet.");
  });
});