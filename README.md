# Waterline

A minimal, private logbook desktop app — built with Electron from the "Waterline" design.

Entries are stored locally as a JSON file in your Mac's Application Support
folder (`~/Library/Application Support/Waterline/entries.json`), not in the
browser, so they survive app updates and reinstalls.

## Run it (development)

Requires [Node.js](https://nodejs.org) (18+) installed on your Mac.

```
cd waterline-app
npm install
npm start
```

This opens the app in a window. Any changes you make to the entries persist
to disk automatically.

## Build a standalone .app for your MacBook

```
cd waterline-app
npm install
npm run dist
```

This produces an unsigned `Waterline.app` (and a `.dmg`) in `dist/`. Since it
isn't code-signed with an Apple Developer certificate, macOS Gatekeeper will
block it on first launch. To open it anyway:

1. Drag `Waterline.app` from `dist/` into `/Applications`.
2. Right-click (or Control-click) the app and choose **Open**.
3. Click **Open** in the dialog that appears. You only need to do this once —
   after that it launches normally, including from Launchpad/Spotlight.

## Notes

- This project must be built on macOS — `npm run dist` uses tools (codesign,
  hdiutil for the .dmg) that only exist on macOS.
- The app launches with an empty logbook. Use **+ New entry** in the header to
  write your first one.
- Fonts (Newsreader, IBM Plex Sans, IBM Plex Mono) are bundled locally, so the
  app works fully offline.
