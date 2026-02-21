# PrairieCalendar

Chrome extension that extracts PrairieTest exam schedules
and allows users to export them to their calendar.

---

## Core Goals

### 1. Generate iCalendar (.ics) file
- Extract exam schedule from PrairieTest
- Convert into a valid iCalendar file
- Allow user to download selected schedules

### 2. (Optional Extension) Google Calendar Support
- Provide option to export to Google Calendar
- Allow user to choose:
  - iCalendar (.ics)
  - Google Calendar

⚠ Google Calendar integration may require authentication and API usage.

---

## Functional Requirements

- Parse exam schedule data from PrairieTest webpage
- Display full list of reservations in popup
- Allow users to select specific events (checkbox UI)
- Export only selected events
- Avoid duplicate calendar entries

---

## Planned Flow

PrairieTest Page  
→ content.js extracts raw schedule data  
→ parser.js standardizes data format  
→ popup.js renders selectable list  
→ user selects events  
→ ics.js generates file (or Google Calendar export)

---

## Technical Considerations

### Authentication (If Google Calendar is supported)
- Google OAuth may be required
- API access needed
- No database planned at this stage

### Database?
Currently:
- No database required
- All processing done locally inside the extension

Future possibility:
- If account-based sync is added, database may be needed
- Privacy and security must be carefully considered


---

## Branch Strategy

- `main`: always stable and loadable
- Feature branches:
  - feature/parser
  - feature/checkbox-ui
  - feature/ics-generation

Only merge to main after manual testing.

---

## Development

Load locally:

1. Chrome → `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked → select project folder
4. Reload after changes