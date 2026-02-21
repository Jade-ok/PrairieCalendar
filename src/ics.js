// ics.js
// TODO: Generate an .ics string from selected events.

export function generateICS(events) {
  // 1. Start with the required calendar header
  let icsString = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PrairieCalendar//EN\n";

  // 2. Loop through each event and append its details to the string
  events.forEach(event => {
    icsString += "BEGIN:VEVENT\n";
    icsString += `UID:${event.id || Date.now()}\n`;
    
    // DTSTAMP is a required field showing when the file was generated
    icsString += `DTSTAMP:${formatICSDate(new Date().toISOString())}\n`; 
    
    icsString += `DTSTART:${formatICSDate(event.startISO)}\n`;
    if (event.endISO) {
      icsString += `DTEND:${formatICSDate(event.endISO)}\n`;
    }
    
    icsString += `SUMMARY:${event.title}\n`;
    icsString += `LOCATION:${event.location}\n`;
    
    // iCal requires actual newlines inside descriptions to be escaped as "\n"
    const safeNotes = (event.notes || "").replace(/\n/g, "\\n");
    icsString += `DESCRIPTION:${safeNotes}\n`;
    
    icsString += "END:VEVENT\n";
  });

  // 3. Add the required calendar footer
  icsString += "END:VCALENDAR";

  return icsString;
}

// Helper function to format our ISO strings into iCal's strict format
function formatICSDate(isoString) {
    if (!isoString) return "";
    // This takes "2026-02-23T21:50:00.000Z" and turns it into "20260223T215000Z"
    return isoString.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }


  // Function to force the browser to download the text as a file
export function downloadICSFile(icsString, filename = "PrairieTest_Exams.ics") {
    // A "Blob" is just a way to hold raw data in JavaScript
    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    
    // Create a temporary, invisible HTML link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // Attach the link to the page, click it programmatically, and then remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }