Here is the updated `README.md` reflecting the new capabilities, the clean camelCase code architecture, performance improvements, and interface updates.

---

# 🚀Chrome App Launcher Lite

A minimalist, highly performant browser extension designed to catalog, organize, and launch your daily web shortcuts through a clean, sharp-cornered interface.

Optimized for seamless cross-browser performance (Chrome, Firefox, Edge, and other Chromium-based platforms), this workspace companion lets you build a personalized hub of deep-linked shortcuts.

---

## ✨ Features

### 🎨 Minimalist Sharp-Cornered UI & Customizations

- **Sharp Aesthetic:** Designed with clean, crisp edges (no default border radii) to preserve a unique structured layout.
- **Icon Shape Adaptability:** Toggle shortcut containers dynamically between **Sharp Square** or **Classic Circle** profiles under the settings panel.
- **Unified Theme Integration:** Full support for dark and light theme controls that propagate automatically across all views, drawers, and modal boxes.

### 📁 Dynamic Categories & Tab Taxonomy

- **Responsive Category Bar:** Automatically structures interactive tab elements based on the categories assigned to your shortcuts.
- **Unassigned Organization:** Shortcuts lacking a label automatically route to the **General** tab, while the **All** tab maps your complete catalog.
- **Category Manager:** Add new categories or delete obsolete ones from the settings sidebar. Deleting a category gracefully returns its active shortcuts back to the "General" index without data loss.

### ⚡ Performance & Engine Optimizations

- **DocumentFragment Rendering:** Minimizes expensive DOM reflows and browser layout processes, ensuring rapid load times even with massive collections.
- **Debounced Filtering:** The dynamic lookup search utilizes an input debounce interval to prevent rapid, repetitive database queries during typing.
- **Favicon Cache Layer:** Resolves external site icons through public proxies (Google and DuckDuckGo API engines) and caches them directly into your database. Once loaded, cached icon states serve instantly without relying on active network fetching.

### ☁️ Cloud Sync & Data Portability

- **GitHub Gist Synchronization:** Back up and synchronize your layout across multiple browsers using private GitHub Gists. Configure Gist Cloud access securely via a Personal Access Token (PAT) and pull/push data instantly.
- **JSON Import/Export Engine:** Download your localized configuration snapshot as a structured JSON backup (`launcherSettingsBackup.json`) or restore from one at any time.

### 🖱 Context Menu & Custom Dialogue Overlays

- **Context Actions:** Right-click a card or interact with its menu button (⋮) to launch inside your active tab, open in a new tab, open in a private incognito window, pin to the top of the category list, edit properties, or delete.
- **Asynchronous Overlays:** Replaces native browser confirmation alerts with customized, asynchronous modal dialogue overlays. These modules support keyboard accessibility (`Enter` to confirm, `Escape` to close) and adhere to the strict sharp-cornered theme.

### 📥 External Drag-and-Drop Ingestion

- **Direct Drop Ingestion:** Drag any URL from an external app or your browser address bar and drop it directly onto the shortcut grid. The launcher parses the link metadata and launches the edit drawer pre-filled.
- _Note: Internal card drag reordering has been removed to maximize DOM rendering speeds and system efficiency._

---

## ⌨️ Global Keyboard Shortcuts

To streamline your workflow, the following key bindings are active globally across the interface:

- <kbd>/</kbd> or <kbd>Ctrl</kbd> + <kbd>F</kbd> — Shift focus directly to the Search input.
- <kbd>Escape</kbd> — Gracefully dismiss active settings, info panels, popup modules, or suggested sites overlays.
- <kbd>Enter</kbd> — Submit form variables or confirm choice inside alert overlays.

---

## 🔒 Security & Standards

- **Protocol Enforcement:** Form validations sanitize coordinates to enforce safe web standard protocols (`http://` and `https://` only).
- **Zero Inline Execution:** Eliminates external script dependencies to ensure safe sandbox executions.
- **Personal Data Sovereignty:** Synchronization keys and Personal Access Tokens are localized inside your chosen extension workspace container (or `localStorage` fallback context) in plaintext, ensuring data remains inside your administrative control.
