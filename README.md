# 🚀 Chrome App Launcher Lite

On FireFox It Called **Browser App Launcher Lite**

A lightweight, customizable Extension that lets you create and manage a beautiful grid of website shortcuts — similar to a mini app launcher.

Chrome App Launcher Lite allows you to:

- Quickly access your favorite websites
- Add, edit, and delete shortcuts
- Open links in current tab, new tab, or incognito
- Automatically fetch favicons
- Export and import your launcher configuration

---

## ✨ Features

### 📦 Default App Collection

Preloaded with popular platforms including:

- **Google Services** – Google, Gmail, Google Drive, Google Docs, YouTube
- **Social Media** – Facebook, Instagram, LinkedIn, Reddit
- **AI & Development** – OpenAI (ChatGPT), GitHub, Stack Overflow
- **Productivity & Tools** – Notion, Trello, Slack

You can fully customize this list.

---

### 🎨 Smart Icon System

- Automatically loads website favicons from:
  - Google Favicon Service
  - DuckDuckGo Icons
  - Clearbit Logos

- If favicon fails → generates:
  - A dynamic colored background
  - A smart fallback text icon (e.g., "GH" for GitHub)

---

### 🖱 Context Menu Actions

Right-click or use the menu button (⋮) on any shortcut:

- Open in current tab
- Open in new tab
- Open in incognito window
- Edit shortcut
- Delete shortcut (with confirmation dialog)

---

### ➕ Add / Edit Shortcuts

- Validates URL format
- Automatically adds `https://` if missing
- Restricts to `http/https` protocols only
- Generates fallback initials automatically

---

### 📁 Import / Export

- Export shortcuts as `launcherLinks.json`
- Import your saved configuration anytime
- Perfect for backup or transferring between browsers

---

## 🔒 Security Considerations

- URL validation using `new URL()`
- Restricts to `http` and `https`
- No inline external scripts
- Controlled incognito window creation

---
