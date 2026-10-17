# Work Time Tracker

A progressive web app (PWA) for tracking attendance, calculating work hours, expected salary, and deductions. Supports PDF/CSV export and offline usage.

🔗 **Live Demo:** [work-time-tracker-ibrahim.vercel.app](https://work-time-tracker-ibrahim.vercel.app/)

## Features

- Check In / Check Out tracking
- Monthly work hours calculation
- Expected salary estimation
- Salary deductions tracking
- Net salary calculation
- Shift records management
- Work reports with PDF/CSV export
- Custom settings
- Works offline (PWA with Service Worker)

## Tech Stack

- HTML5, CSS3 (compiled from SCSS)
- Vanilla JavaScript (ES modules)
- PWA with service worker and manifest
- IndexedDB for data persistence (localStorage fallback)
- Responsive design

## Project Structure

```
.
├── index.html                          # Redirects to the dashboard page
├── manifest.json                       # PWA manifest
├── service-worker.js                   # Offline caching
├── assets/icons/                       # App icons
├── styles/                             # Shared SCSS source
│   ├── abstracts/                      # Variables, mixins, functions
│   ├── base/                           # Reset, theme, typography, elements
│   ├── layout/                         # App container, page header, navigation
│   ├── components/                     # Buttons, cards, forms, modals, ...
│   └── main.scss                       # Shared entry point
├── css/main.css                        # Compiled shared styles
├── scripts/                            # Shared ES modules
│   ├── site-config.js
│   ├── storage-manager.js
│   ├── ui-manager.js
│   ├── wheel-time-picker.js
│   ├── salary-manager.js
│   ├── deductions-manager.js
│   ├── attendance-manager.js
│   ├── report-manager.js
│   ├── service-worker-registration.js
│   └── app-bootstrap.js
├── components/                         # Shared UI components
│   ├── shared/svg-icons.js
│   ├── page-header/page-header.js
│   └── bottom-navigation/bottom-navigation.js
└── pages/                              # One folder per page
    ├── dashboard/
    │   ├── dashboard-page.html
    │   ├── dashboard-page.js
    │   └── styles/dashboard-page.scss (+ .css)
    ├── reports/
    ├── settings/
    ├── more-apps/
    └── offline/
```

## Setup

Install dependencies (only needed to build the SCSS):

```bash
npm install
```

Build the CSS once:

```bash
npm run build:css
```

Rebuild the CSS automatically while editing SCSS:

```bash
npm run watch:css
```

## Running Locally

Because the app uses ES modules and a service worker, it must be served over HTTP (opening the files directly with `file://` will not work).

```bash
npm run serve
```

Then open <http://localhost:5173/> in your browser. The root URL redirects to the dashboard page.

For the best experience, use Chrome or Edge and install it as a PWA.
