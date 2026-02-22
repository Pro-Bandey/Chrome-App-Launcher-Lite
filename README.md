# 🚀 Chrome App Launcher Lite

A lightweight, customizable Chrome Extension that lets you create and manage a beautiful grid of website shortcuts — similar to a mini app launcher.

Chrome App Launcher Lite allows you to:

* Quickly access your favorite websites
* Add, edit, and delete shortcuts
* Open links in current tab, new tab, or incognito
* Automatically fetch favicons
* Export and import your launcher configuration

---

## ✨ Features

### 📦 Default App Collection

Preloaded with popular platforms including:

* **Google Services** – Google, Gmail, Google Drive, Google Docs, YouTube
* **Social Media** – Facebook, Instagram, LinkedIn, Reddit
* **AI & Development** – OpenAI (ChatGPT), GitHub, Stack Overflow
* **Productivity & Tools** – Notion, Trello, Slack

You can fully customize this list.

---

### 🎨 Smart Icon System

* Automatically loads website favicons from:

  * Google Favicon Service
  * DuckDuckGo Icons
  * Clearbit Logos
* If favicon fails → generates:

  * A dynamic colored background
  * A smart fallback text icon (e.g., "GH" for GitHub)

---

### 🖱 Context Menu Actions

Right-click or use the menu button (⋮) on any shortcut:

* Open in current tab
* Open in new tab
* Open in incognito window
* Edit shortcut
* Delete shortcut (with confirmation dialog)

---

### ➕ Add / Edit Shortcuts

* Validates URL format
* Automatically adds `https://` if missing
* Restricts to `http/https` protocols only
* Generates fallback initials automatically

---

### 📁 Import / Export

* Export shortcuts as `launcherLinks.json`
* Import your saved configuration anytime
* Perfect for backup or transferring between browsers

---

### 💾 Storage Support

* Uses `chrome.storage.local` when running as extension
* Falls back to `localStorage` when running in a normal browser environment

---

## 🧠 How It Works

### Core Architecture

The script is wrapped in an IIFE:

```javascript
(function () {
   ...
})();
```

This prevents global namespace pollution.

### Main Data Structure

```javascript
launcherLinks = [
  {
    name: "Google",
    url: "https://google.com",
    fallback: "GOO"
  }
]
```

Each shortcut object contains:

* `name`
* `url`
* `fallback` (icon text)

---

### Rendering Flow

1. Load links from storage
2. Generate cards dynamically
3. Fetch favicon
4. Apply fallback if needed
5. Save updated state

---

## 🔒 Security Considerations

* URL validation using `new URL()`
* Restricts to `http` and `https`
* No inline external scripts
* Controlled incognito window creation (Chrome only)

---

## 🛠 Installation (Developer Mode)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select your project folder


---

## 📊 Strengths of the Project

* Clean modular structure
* Well-separated functionality
* Smart favicon fallback system
* Chrome extension compatible
* Lightweight (no external dependencies)
* Good user validation

---

## ⚠ Potential Improvements in Code

1. Import JSON should validate structure before replacing state
2. `renderGrid()` calls `saveLauncherLinks()` every render (can be optimized)
3. Could debounce favicon loading
4. Add error handling for malformed import files
5. Consider using event delegation for better performance

---

## 🏷 License

MIT License (Recommended)

---

## 👨‍💻 Author

**Pro-Bandey**
Lightweight Web Shortcut Manager for Chrome

---
