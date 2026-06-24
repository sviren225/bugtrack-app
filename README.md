# BugTrack — Localhost App

A simple bug & issue tracker that runs locally on any laptop.
Data is saved to a JSON file on your computer.

---

## Requirements

- **Node.js** installed (free download: https://nodejs.org)
  - Download the "LTS" version → install it → done.

---

## How to Run

### First time setup:
1. Download / copy this `bugtrack-app` folder to your laptop.
2. Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux).
3. Navigate to the folder:
   ```
   cd path/to/bugtrack-app
   ```
4. Start the server:
   ```
   node server.js
   ```
5. Open your browser and go to:
   ```
   http://localhost:3000
   ```

### Every time after that:
Just run `node server.js` and open `http://localhost:3000`.

---

## Where is the data saved?

All issues are stored in:
```
bugtrack-app/
  data/
    issues.json   ← your data lives here
```

This is a plain text JSON file. You can back it up, copy it to another laptop,
or open it in any text editor.

---

## Share with your team (same network)

If your teammates are on the **same WiFi/network**, they can access your tracker too!

1. Find your laptop's local IP address:
   - Windows: open CMD and type `ipconfig` → look for "IPv4 Address"
   - Mac/Linux: open Terminal and type `ifconfig` or `ip a`

2. Tell your teammates to open:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.10:3000`

---

## Features

- ✅ Add new issues (client, title, description, reporter, date, status, remarks)
- ✅ Edit any issue
- ✅ Delete issues
- ✅ Filter by client or status
- ✅ Search across all fields
- ✅ Data saved permanently to `data/issues.json`
- ✅ Pre-loaded with your existing issues from the Excel file

---

## Folder Structure

```
bugtrack-app/
  server.js        ← the backend (Node.js)
  package.json     ← project info
  public/
    index.html     ← the frontend (runs in browser)
  data/
    issues.json    ← created automatically on first run
  README.md        ← this file
```
