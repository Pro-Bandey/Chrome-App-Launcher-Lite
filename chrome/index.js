"use strict";

(function () {
  // Prefer Local Storage over Sync to avoid strict 100KB Quota limits (especially for Base64 image icons)
  const extAPI = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : ((typeof browser !== "undefined" && browser.runtime) ? browser : null);
  const storageAPI = extAPI && extAPI.storage ? extAPI.storage.local : null;

  let launcherLinks = [];
  let launcherCategories = [];
  let launcherSettings = { iconShape: "square", ghToken: "", gistId: "" };

  let currentIndex = null;
  let editingIndex = null;
  let activeCategoryTab = "All";

  let keyboardFocusedIndex = -1;
  let activeCardNodes = [];
  let dragSourceIndex = null;

  // DOM Elements cache
  const grid = document.getElementById("calLinkGrid");
  const contextMenu = document.getElementById("calContextMenu");
  const searchBar = document.getElementById("calSearchBar");
  const sortSelect = document.getElementById("calSortSelect");
  const themeToggle = document.getElementById("calThemeToggle");

  const settingsPanel = document.getElementById("calSettingsPanel");
  const settingsBtn = document.getElementById("calSettingsBtn");
  const settingsCloseBtn = document.getElementById("calSettingsCloseBtn");

  const infoPanel = document.getElementById("calInfoPanel");
  const infoBtn = document.getElementById("calInfoBtn");
  const infoCloseBtn = document.getElementById("calInfoCloseBtn");

  const addBtn = document.getElementById("calAddBtn");
  const suggestedBtn = document.getElementById("calSuggestedBtn");
  const popupBox = document.getElementById("calPopupBox");
  const popupBoxTitle = document.getElementById("addLinkHeading");

  const linkTitleInput = document.getElementById("calLinkTitle");
  const linkUrlInput = document.getElementById("calLinkUrl");
  const linkCategoryInput = document.getElementById("calLinkCategory");
  const categoryDatalist = document.getElementById("categorySuggestions");
  const linkIconUrlInput = document.getElementById("calLinkIconUrl");
  const linkIconFileInput = document.getElementById("calLinkIconFile");

  const saveBtn = document.getElementById("calSaveBtn");
  const cancelBtn = document.getElementById("calCancelBtn");
  const suggestedDialog = document.getElementById("calSuggestedDialog");
  const topSitesList = document.getElementById("calTopSitesList");
  const suggestedCloseBtn = document.getElementById("calSuggestedCloseBtn");

  const newCatInput = document.getElementById("calNewCategoryInput");
  const addCatBtn = document.getElementById("calAddCategoryBtn");
  const shapeSelect = document.getElementById("calShapeSelect");

  const syncPushBtn = document.getElementById("calSyncPushBtn");
  const syncPullBtn = document.getElementById("calSyncPullBtn");
  const exportBtn = document.getElementById("calExportBtn");
  const importBtn = document.getElementById("calImportBtn");
  const importFile = document.getElementById("calImportFile");
  const resetBtn = document.getElementById("calResetBtn");

  const _modal = {
    backdrop: document.getElementById("confirmAndAlertBox"),
    titleEl: document.getElementById("confirmAndAlertBoxTitle"),
    msgEl: document.getElementById("confirmAndAlertBoxMessage"),
    okBtn: document.getElementById("confirmAndAlertBoxOk"),
    cancelBtn: document.getElementById("confirmAndAlertBoxCancel"),
    visible: false
  };

  function escapeHTML(str) {
    if (!str) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Auto-detect OS Theme preference on load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('darkTheme');
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('darkTheme');
    localStorage.setItem('theme', document.body.classList.contains('darkTheme') ? 'dark' : 'light');
  });

  // Watch for external background syncs (if applicable)
  if (storageAPI && extAPI.storage.onChanged) {
    extAPI.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.launcherLinks) launcherLinks = changes.launcherLinks.newValue || getDefaultLinks();
        if (changes.launcherCategories) launcherCategories = changes.launcherCategories.newValue || [];
        if (changes.launcherSettings) launcherSettings = changes.launcherSettings.newValue || launcherSettings;
        applySettings();
        renderTabs();
        renderGrid();
        renderCategorySettingsList();
      }
    });
  }

  // Batched Save Function to prevent API Flooding
  let saveTimeout = null;
  function saveAll() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(executeSaveAll, 500);
  }

  function executeSaveAll() {
    if (storageAPI) {
      storageAPI.set({ launcherLinks, launcherCategories, launcherSettings });
    } else {
      localStorage.setItem("launcherLinks", JSON.stringify(launcherLinks));
      localStorage.setItem("launcherCategories", JSON.stringify(launcherCategories));
      localStorage.setItem("launcherSettings", JSON.stringify(launcherSettings));
    }
  }

  function loadAll() {
    const defaultCats = ["Search", "Tools", "Work", "Social", "AI", "Dev", "Entertainment", "Shopping", "Information"];
    if (storageAPI) {
      storageAPI.get(["launcherLinks", "launcherCategories", "launcherSettings"], res => {
        launcherLinks = (res && res.launcherLinks && res.launcherLinks.length) ? res.launcherLinks : getDefaultLinks();
        launcherCategories = (res && res.launcherCategories) ? res.launcherCategories : defaultCats;
        launcherSettings = (res && res.launcherSettings) ? { ...launcherSettings, ...res.launcherSettings } : launcherSettings;
        sanitizeAndRender();
      });
    } else {
      try {
        const savedLinks = localStorage.getItem("launcherLinks");
        const savedCats = localStorage.getItem("launcherCategories");
        const savedSettings = localStorage.getItem("launcherSettings");
        launcherLinks = savedLinks ? JSON.parse(savedLinks) : getDefaultLinks();
        launcherCategories = savedCats ? JSON.parse(savedCats) : defaultCats;
        launcherSettings = savedSettings ? { ...launcherSettings, ...JSON.parse(savedSettings) } : launcherSettings;
      } catch (e) {
        launcherLinks = getDefaultLinks();
        launcherCategories = defaultCats;
      }
      sanitizeAndRender();
    }
  }

  function sanitizeAndRender() {
    launcherLinks.forEach(link => {
      if (!link.dateAdded) link.dateAdded = Date.now();
      if (link.clicks === undefined) link.clicks = 0;
    });
    applySettings();
    renderTabs();
    renderGrid();
    renderCategorySettingsList();
  }

  function applySettings() {
    const shape = launcherSettings.iconShape || "square";
    shapeSelect.value = shape;
    const capitalizedShape = shape.charAt(0).toUpperCase() + shape.slice(1);
    grid.className = `calLinkGrid shape${capitalizedShape}`;
    document.getElementById("calGhToken").value = launcherSettings.ghToken || "";
    document.getElementById("calGistId").value = launcherSettings.gistId || "";
  }

  function getDefaultLinks() {
    return [
      { "fallback": "GS", "name": "Google Search", "url": "https://www.google.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000000 },
      { "fallback": "YT", "name": "YouTube", "url": "https://www.youtube.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000010 },
      { "fallback": "GH", "name": "GitHub", "url": "https://github.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000020 },
      { "fallback": "GPT", "name": "ChatGPT", "url": "https://chatgpt.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000030 },
      { "fallback": "GML", "name": "Gmail", "url": "https://mail.google.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000040 },
      { "fallback": "RD", "name": "Reddit", "url": "https://www.reddit.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000050 },
      { "fallback": "BNG", "name": "Bing", "url": "https://www.bing.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000060 },
      { "fallback": "DDG", "name": "DuckDuckGo", "url": "https://duckduckgo.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000070 },
      { "fallback": "WKP", "name": "Wikipedia", "url": "https://wikipedia.org", "category": "Information", "clicks": 0, "dateAdded": 1717000000080 },
      { "fallback": "MDN", "name": "MDN Web Docs", "url": "https://developer.mozilla.org", "category": "Dev", "clicks": 0, "dateAdded": 1717000000090 },
      { "fallback": "SO", "name": "Stack Overflow", "url": "https://stackoverflow.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000100 },
      { "fallback": "NPM", "name": "NPM", "url": "https://www.npmjs.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000110 },
      { "fallback": "VSC", "name": "VS Code", "url": "https://code.visualstudio.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000120 },
      { "fallback": "CFG", "name": "CodePen", "url": "https://codepen.io", "category": "Dev", "clicks": 0, "dateAdded": 1717000000130 },
      { "fallback": "LNK", "name": "LinkedIn", "url": "https://www.linkedin.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000140 },
      { "fallback": "DRV", "name": "Google Drive", "url": "https://drive.google.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000150 },
      { "fallback": "DOC", "name": "Google Docs", "url": "https://docs.google.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000160 },
      { "fallback": "NOT", "name": "Notion", "url": "https://www.notion.so", "category": "Work", "clicks": 0, "dateAdded": 1717000000170 },
      { "fallback": "TRL", "name": "Trello", "url": "https://trello.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000180 },
      { "fallback": "SLK", "name": "Slack", "url": "https://slack.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000190 },
      { "fallback": "ZOM", "name": "Zoom", "url": "https://zoom.us", "category": "Work", "clicks": 0, "dateAdded": 1717000000200 },
      { "fallback": "CLD", "name": "Cloudflare", "url": "https://www.cloudflare.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000210 },
      { "fallback": "CNV", "name": "Canva", "url": "https://www.canva.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000220 },
      { "fallback": "FIG", "name": "Figma", "url": "https://www.figma.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000230 },
      { "fallback": "REM", "name": "Remove.bg", "url": "https://www.remove.bg", "category": "Tools", "clicks": 0, "dateAdded": 1717000000240 },
      { "fallback": "TMP", "name": "Temp Mail", "url": "https://temp-mail.org", "category": "Tools", "clicks": 0, "dateAdded": 1717000000250 },
      { "fallback": "FB", "name": "Facebook", "url": "https://facebook.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000260 },
      { "fallback": "X", "name": "X", "url": "https://x.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000270 },
      { "fallback": "IG", "name": "Instagram", "url": "https://instagram.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000280 },
      { "fallback": "WA", "name": "WhatsApp", "url": "https://web.whatsapp.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000290 },
      { "fallback": "TG", "name": "Telegram", "url": "https://web.telegram.org", "category": "Social", "clicks": 0, "dateAdded": 1717000000300 },
      { "fallback": "DIS", "name": "Discord", "url": "https://discord.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000310 },
      { "fallback": "PIN", "name": "Pinterest", "url": "https://www.pinterest.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000320 },
      { "fallback": "GMN", "name": "Gemini", "url": "https://gemini.google.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000330 },
      { "fallback": "CLD", "name": "Claude", "url": "https://claude.ai", "category": "AI", "clicks": 0, "dateAdded": 1717000000340 },
      { "fallback": "PRP", "name": "Perplexity", "url": "https://www.perplexity.ai", "category": "AI", "clicks": 0, "dateAdded": 1717000000350 },
      { "fallback": "HF", "name": "Hugging Face", "url": "https://huggingface.co", "category": "AI", "clicks": 0, "dateAdded": 1717000000360 },
      { "fallback": "AMZ", "name": "Amazon", "url": "https://www.amazon.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000370 },
      { "fallback": "EBY", "name": "eBay", "url": "https://www.ebay.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000380 },
      { "fallback": "ALI", "name": "AliExpress", "url": "https://www.aliexpress.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000390 },
      { "fallback": "DAR", "name": "Daraz", "url": "https://www.daraz.pk", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000400 },
      { "fallback": "NFL", "name": "Netflix", "url": "https://www.netflix.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000410 },
      { "fallback": "SPT", "name": "Spotify", "url": "https://spotify.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000420 },
      { "fallback": "PRM", "name": "Prime Video", "url": "https://www.primevideo.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000430 },
      { "fallback": "TWT", "name": "Twitch", "url": "https://www.twitch.tv", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000440 },
      { "fallback": "BBC", "name": "BBC News", "url": "https://www.bbc.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000450 },
      { "fallback": "CNN", "name": "CNN", "url": "https://www.cnn.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000460 },
      { "fallback": "QRA", "name": "Quora", "url": "https://www.quora.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000470 },
      { "fallback": "ARC", "name": "Archive.org", "url": "https://archive.org", "category": "Information", "clicks": 0, "dateAdded": 1717000000480 },
      { "fallback": "CAL", "name": "Calculator", "url": "https://www.desmos.com/scientific", "category": "Tools", "clicks": 0, "dateAdded": 1717000000490 },
      { "fallback": "CVT", "name": "Unit Converter", "url": "https://www.unitconverters.net", "category": "Tools", "clicks": 0, "dateAdded": 1717000000500 }
    ];
  }

  function renderTabs() {
    const tabsContainer = document.getElementById("calTabsContainer");
    tabsContainer.innerHTML = "";

    const allTabs = ["All", "General", ...launcherCategories];
    if (!allTabs.includes(activeCategoryTab)) activeCategoryTab = "All";

    const fragment = document.createDocumentFragment();
    allTabs.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "categoryTab" + (activeCategoryTab === cat ? " active" : "");
      btn.innerText = cat;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", activeCategoryTab === cat ? "true" : "false");
      btn.addEventListener("click", () => {
        activeCategoryTab = cat;
        renderTabs();
        renderGrid();
      });
      fragment.appendChild(btn);
    });
    tabsContainer.appendChild(fragment);

    categoryDatalist.innerHTML = "";
    launcherCategories.forEach(cat => {
      categoryDatalist.innerHTML += `<option value="${escapeHTML(cat)}">`;
    });
  }

  function getDeterministicColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 45%)`;
  }

  function generateFallback(name) {
    const clean = name.trim();
    if (!clean) return "??";
    const parts = clean.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.substring(0, 3).toUpperCase();
  }

  function renderGrid() {
    let focusGlobalIdx = null;
    let wasFocused = false;

    if (keyboardFocusedIndex >= 0 && activeCardNodes[keyboardFocusedIndex]) {
      focusGlobalIdx = activeCardNodes[keyboardFocusedIndex].dataset.index;
      wasFocused = (document.activeElement === activeCardNodes[keyboardFocusedIndex]);
    }

    grid.innerHTML = "";
    const searchTerm = searchBar.value.toLowerCase();
    const sortVal = sortSelect.value;

    let filtered = launcherLinks.filter(link => {
      const matchesSearch = link.name.toLowerCase().includes(searchTerm);
      let matchesCategory = false;

      if (activeCategoryTab === "All") matchesCategory = true;
      else if (activeCategoryTab === "General") matchesCategory = !link.category || link.category.trim() === "" || link.category === "General";
      else matchesCategory = link.category === activeCategoryTab;

      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      switch (sortVal) {
        case "name": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "newest": return (b.dateAdded || 0) - (a.dateAdded || 0);
        case "oldest": return (a.dateAdded || 0) - (b.dateAdded || 0);
        case "most-visited": return (b.clicks || 0) - (a.clicks || 0);
        case "least-visited": return (a.clicks || 0) - (b.clicks || 0);
        default: return 0;
      }
    });

    const fragment = document.createDocumentFragment();

    filtered.forEach(link => {
      const idx = launcherLinks.indexOf(link);
      const card = document.createElement("a");
      card.className = "card" + (link.isPinned ? " pinned" : "");
      card.href = escapeHTML(link.url);
      card.tabIndex = 0;
      card.draggable = true;
      card.setAttribute("role", "gridcell");
      card.dataset.index = idx;

      const safeName = escapeHTML(link.name);
      const safeCategory = escapeHTML(link.category);
      card.title = `${safeName}` + (link.category ? ` (${safeCategory})` : "") + ` | Visited: ${link.clicks || 0}`;

      const fallback = escapeHTML(link.fallback || generateFallback(link.name));
      const bg = getDeterministicColor(link.name);

      card.innerHTML = `
        <div class="icon" style="background:${bg};color:#fff;"></div>
        <div class="name">${safeName}</div>
        <button class="menuBtn" aria-label="Menu" tabindex="-1">⋮</button>
      `;

      fragment.appendChild(card);
      loadFavicon(card.querySelector('.icon'), link, fallback);
    });

    grid.appendChild(fragment);
    activeCardNodes = Array.from(grid.querySelectorAll('.card'));

    // Re-focus seamlessly
    if (focusGlobalIdx !== null) {
      const reMapIndex = activeCardNodes.findIndex(node => node.dataset.index === focusGlobalIdx);
      if (reMapIndex !== -1) {
        keyboardFocusedIndex = reMapIndex;
        updateKeyboardFocusState();
        if (wasFocused) activeCardNodes[keyboardFocusedIndex].focus();
      } else keyboardFocusedIndex = -1;
    } else {
      keyboardFocusedIndex = -1;
    }
  }

  // --- O(1) EVENT DELEGATION FOR THE GRID --- //

  grid.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const idx = parseInt(card.dataset.index, 10);

    if (e.target.closest('.menuBtn')) {
      e.stopPropagation();
      e.preventDefault();
      currentIndex = idx;
      showContextMenu(e.pageX, e.pageY);
    } else {
      e.preventDefault();
      openLink(idx, false);
    }
  });

  grid.addEventListener("contextmenu", e => {
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    currentIndex = parseInt(card.dataset.index, 10);
    showContextMenu(e.pageX, e.pageY);
  });

  grid.addEventListener("focusin", e => {
    const card = e.target.closest('.card');
    if (!card) return;
    keyboardFocusedIndex = activeCardNodes.indexOf(card);
    updateKeyboardFocusState();
  });

  // --- DRAG AND DROP CAPABILITIES (Internal + External) --- //

  grid.addEventListener('dragstart', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    dragSourceIndex = parseInt(card.dataset.index, 10);
    e.dataTransfer.effectAllowed = 'move';
    card.style.opacity = '0.4';
  });

  grid.addEventListener('dragend', e => {
    const card = e.target.closest('.card');
    if (card) card.style.opacity = '1';
    dragSourceIndex = null;
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault(); // Permit drop
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    const urlData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL');
    const textData = e.dataTransfer.getData('text/plain');
    const targetCard = e.target.closest('.card');

    // 1. Internal Grid Reordering
    if (dragSourceIndex !== null && targetCard) {
      const dropTargetIndex = parseInt(targetCard.dataset.index, 10);
      if (dragSourceIndex !== dropTargetIndex) {
        const [movedLink] = launcherLinks.splice(dragSourceIndex, 1);
        launcherLinks.splice(dropTargetIndex, 0, movedLink);
        saveAll();
        renderGrid();
      }
      return;
    }

    // 2. External URL dropping to create a new link
    if (urlData) {
      handleDroppedLink(urlData, textData);
    }
  });

  function openLink(index, newTab = false) {
    if (index < 0 || index >= launcherLinks.length) return;
    const link = launcherLinks[index];
    link.clicks = (link.clicks || 0) + 1;
    saveAll();

    if (extAPI && extAPI.tabs) {
      if (newTab) {
        extAPI.tabs.create({ url: link.url });
      } else {
        extAPI.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
          if (tabs && tabs.length > 0) extAPI.tabs.update(tabs[0].id, { url: link.url });
          else extAPI.tabs.create({ url: link.url });
        });
      }
    } else {
      window.open(link.url, newTab ? "_blank" : "_self");
    }
  }

  function openIncognito(index) {
    const url = launcherLinks[index].url;
    if (extAPI && extAPI.windows) extAPI.windows.create({ url: url, incognito: true });
    else showAlert("Incognito navigation is unavailable in the current workspace.", "System Warning");
  }

  function loadFavicon(iconContainer, link, fallbackText) {
    if (link.icon) {
      iconContainer.innerHTML = `<img src="${escapeHTML(link.icon)}" alt="icon" loading="lazy">`;
      iconContainer.style.background = 'transparent';
      return;
    }

    iconContainer.innerText = fallbackText;

    try {
      const hostname = new URL(link.url).hostname;
      const sources = [];

      if (extAPI && extAPI.runtime && extAPI.runtime.id) {
        sources.push(() => `chrome-extension://${extAPI.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(link.url)}&size=64`);
      }
      sources.push(() => `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`);
      sources.push(() => `https://icons.duckduckgo.com/ip2/${hostname}.ico`);

      let i = 0;
      function tryNext() {
        if (i >= sources.length) return;
        const img = new Image();
        img.onload = () => {
          iconContainer.innerHTML = "";
          iconContainer.style.background = "transparent";
          iconContainer.appendChild(img);
          link.icon = img.src;
          saveAll(); // Batched safely via debounce timer
        };
        img.onerror = () => { i++; tryNext(); };
        try { img.src = sources[i](); } catch (err) { i++; tryNext(); }
      }
      tryNext();
    } catch (e) { }
  }

  async function handleDroppedLink(url, text) {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = "https://" + cleanUrl;
    let title = text ? text.trim() : "";
    if (!title) {
      try { title = new URL(cleanUrl).hostname.replace('www.', ''); } catch (err) { title = "Web Shortcut"; }
    }

    openModal(false);
    linkTitleInput.value = title;
    linkUrlInput.value = cleanUrl;
    linkCategoryInput.value = (activeCategoryTab === "All" || activeCategoryTab === "General") ? "" : activeCategoryTab;
  }

  function showContextMenu(x, y) {
    contextMenu.style.display = "flex";
    if (x + contextMenu.offsetWidth > window.innerWidth) x = window.innerWidth - contextMenu.offsetWidth - 5;
    if (y + contextMenu.offsetHeight > window.innerHeight) y = window.innerHeight - contextMenu.offsetHeight - 5;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
  }

  document.addEventListener("click", () => { contextMenu.style.display = "none"; });

  contextMenu.addEventListener("click", async e => {
    if (currentIndex === null) return;
    const target = e.target.closest('[data-action]') || e.target;
    const action = target.dataset.action;

    if (action === "calOpen") openLink(currentIndex, false);
    else if (action === "calNewTab") openLink(currentIndex, true);
    else if (action === "calIncognito") openIncognito(currentIndex);
    else if (action === "calPin") {
      launcherLinks[currentIndex].isPinned = !launcherLinks[currentIndex].isPinned;
      saveAll();
      renderGrid();
    }
    else if (action === "calEdit") { editingIndex = currentIndex; openModal(true); }
    else if (action === "calDelete") {
      const confirmed = await showConfirm(`Are you sure you want to delete "${escapeHTML(launcherLinks[currentIndex].name)}"?`, "Delete Link");
      if (confirmed) {
        launcherLinks.splice(currentIndex, 1);
        saveAll();
        renderGrid();
      }
    }
  });

  settingsBtn.addEventListener("click", () => settingsPanel.classList.add("open"));
  settingsCloseBtn.addEventListener("click", () => settingsPanel.classList.remove("open"));
  infoBtn.addEventListener("click", () => infoPanel.classList.add("open"));
  infoCloseBtn.addEventListener("click", () => infoPanel.classList.remove("open"));

  addCatBtn.addEventListener("click", () => {
    const name = newCatInput.value.trim();
    if (name && !launcherCategories.includes(name)) {
      launcherCategories.push(name);
      newCatInput.value = "";
      saveAll();
      renderTabs();
      renderCategorySettingsList();
    } else {
      showAlert('Please type a unique category name in the input field.', 'Category Management');
    }
  });

  function renderCategorySettingsList() {
    const container = document.getElementById("calCategoriesList");
    container.innerHTML = "";
    launcherCategories.forEach((cat, index) => {
      const item = document.createElement("div");
      item.className = "settingsListItem";
      item.innerHTML = `<span>${escapeHTML(cat)}</span><button class="deleteCatBtn" data-index="${index}">&times;</button>`;
      item.querySelector(".deleteCatBtn").addEventListener("click", () => deleteCategory(index));
      container.appendChild(item);
    });
  }

  async function deleteCategory(index) {
    const catName = launcherCategories[index];
    const confirmed = await showConfirm(`Are you sure you want to remove the Category: "${escapeHTML(catName)}"? Existing shortcuts inside will default back to "General".`, "Delete Category");
    if (confirmed) {
      launcherLinks.forEach(l => { if (l.category === catName) l.category = ""; });
      launcherCategories.splice(index, 1);
      saveAll();
      renderTabs();
      renderGrid();
      renderCategorySettingsList();
    }
  }

  shapeSelect.addEventListener("change", () => {
    launcherSettings.iconShape = shapeSelect.value;
    saveAll();
    applySettings();
  });

  syncPushBtn.addEventListener("click", async () => {
    const token = document.getElementById("calGhToken").value.trim();
    let gistId = document.getElementById("calGistId").value.trim();
    if (!token) {
      await showAlert("GitHub Personal Access Token is required to execute Cloud Sync.", "Access Denied");
      return;
    }

    launcherSettings.ghToken = token;
    saveAll();

    const payload = {
      description: "App Launcher Lite Settings Synchronization Backup",
      public: false,
      files: {
        "app-launcher-lite.json": {
          content: JSON.stringify({ launcherLinks, launcherCategories, launcherSettings }, null, 2)
        }
      }
    };

    try {
      let url = "https://api.github.com/gists";
      let method = "POST";
      if (gistId) {
        url = `https://api.github.com/gists/${gistId}`;
        method = "PATCH";
      }
      const res = await fetch(url, {
        method,
        headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("API Connection Error: " + res.statusText);
      const responseData = await res.json();
      if (!gistId && responseData.id) {
        gistId = responseData.id;
        document.getElementById("calGistId").value = gistId;
        launcherSettings.gistId = gistId;
        saveAll();
      }
      await showAlert("Configuration successfully backed up to GitHub Cloud!", "Cloud Sync");
    } catch (err) {
      await showAlert("Cloud push synchronization failed: " + err.message, "Sync Error");
    }
  });

  syncPullBtn.addEventListener("click", async () => {
    const token = document.getElementById("calGhToken").value.trim();
    const gistId = document.getElementById("calGistId").value.trim();
    if (!token || !gistId) {
      await showAlert("Both personal API Token and Gist ID are required to pull backup data.", "Sync Error");
      return;
    }

    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { "Authorization": `token ${token}` }
      });
      if (!res.ok) throw new Error("API Connection Error: " + res.statusText);
      const responseData = await res.json();
      const content = responseData.files["app-launcher-lite.json"]?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.launcherLinks) {
          launcherLinks = parsed.launcherLinks;
          launcherCategories = parsed.launcherCategories || launcherCategories;
          launcherSettings = { ...launcherSettings, ...parsed.launcherSettings };
          saveAll();
          sanitizeAndRender();
          await showAlert("Cloud database downloaded successfully!", "Cloud Pull Sync");
        }
      } else {
        await showAlert("The correct backup structure could not be retrieved inside the parsed Gist ID.", "Format Error");
      }
    } catch (err) {
      await showAlert("Cloud synchronization pull failed: " + err.message, "Sync Error");
    }
  });

  exportBtn.onclick = () => {
    const a = document.createElement("a");
    const backupObj = { launcherLinks, launcherCategories, launcherSettings };
    a.href = URL.createObjectURL(new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" }));
    a.download = "launcherSettingsBackup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  importBtn.onclick = () => importFile.click();
  importFile.onchange = e => {
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.launcherLinks) {
          launcherLinks = data.launcherLinks;
          launcherCategories = data.launcherCategories || launcherCategories;
          launcherSettings = data.launcherSettings || launcherSettings;
          saveAll();
          sanitizeAndRender();
        } else if (Array.isArray(data)) {
          launcherLinks = data;
          saveAll();
          sanitizeAndRender();
        }
      } catch (err) {
        await showAlert("Failed parsing the configuration structure of the uploaded import file.", "Import Failed");
      }
    };
    if (e.target.files[0]) reader.readAsText(e.target.files[0]);
    e.target.value = '';
  };

  resetBtn.onclick = async () => {
    const confirmed = await showConfirm("Reset application layouts? Local configurations will revert to default settings.", "Reset Layout");
    if (confirmed) {
      if (storageAPI) storageAPI.clear(() => window.location.reload());
      else { localStorage.clear(); window.location.reload(); }
    }
  };

  function openModal(edit = false) {
    popupBox.style.display = "flex";
    if (edit && editingIndex !== null) {
      popupBoxTitle.textContent = "Edit Shortcut";
      const l = launcherLinks[editingIndex];
      linkTitleInput.value = l.name;
      linkUrlInput.value = l.url;
      linkCategoryInput.value = l.category || '';
      linkIconUrlInput.value = l.icon && l.icon.startsWith('http') ? l.icon : '';
    } else {
      popupBoxTitle.textContent = "Add Shortcut";
      linkTitleInput.value = "";
      linkUrlInput.value = "";
      linkCategoryInput.value = "";
      linkIconUrlInput.value = "";
      editingIndex = null;
    }
    linkIconFileInput.value = '';
    linkTitleInput.focus();
  }

  function closeModal() { popupBox.style.display = "none"; }
  cancelBtn.addEventListener("click", closeModal);

  saveBtn.addEventListener("click", async () => {
    const name = linkTitleInput.value.trim();
    const cat = linkCategoryInput.value.trim();
    const iconUrl = linkIconUrlInput.value.trim();
    let url = linkUrlInput.value.trim();

    if (!name || !url) {
      await showAlert("Both shortcut Name and web target URL are required parameters.", "Error");
      return;
    }
    url = /^https?:\/\//i.test(url) ? url : "https://" + url;

    const commitShortcut = (iconData = null) => {
      const activeDataAdded = (editingIndex !== null) ? (launcherLinks[editingIndex].dateAdded || Date.now()) : Date.now();
      const activeClicks = (editingIndex !== null) ? (launcherLinks[editingIndex].clicks || 0) : 0;
      const isPinned = (editingIndex !== null) ? !!launcherLinks[editingIndex].isPinned : false;

      const updatedNode = {
        name,
        url,
        category: cat,
        fallback: generateFallback(name),
        icon: iconData || iconUrl || null,
        clicks: activeClicks,
        dateAdded: activeDataAdded,
        isPinned: isPinned
      };

      if (editingIndex !== null) launcherLinks[editingIndex] = updatedNode;
      else launcherLinks.push(updatedNode);

      editingIndex = null;
      saveAll();
      sanitizeAndRender();
      closeModal();
    };

    const iconFile = linkIconFileInput.files[0];
    if (iconFile) {
      if (iconFile.size > 50000) {
        await showAlert("Uploaded image size exceeds limits. Please select a file <= 50KB to preserve memory allocations.", "File Limit");
        return;
      }
      const reader = new FileReader();
      reader.onload = e => commitShortcut(e.target.result);
      reader.readAsDataURL(iconFile);
    } else {
      commitShortcut();
    }
  });

  suggestedBtn.addEventListener("click", () => {
    suggestedDialog.style.display = 'flex';
    topSitesList.innerHTML = "Retrieving browser index logs...";
    if (extAPI && extAPI.topSites) {
      extAPI.topSites.get(sites => {
        topSitesList.innerHTML = "";
        if (!sites || sites.length === 0) {
          topSitesList.innerHTML = "<p>No active standard browser browsing logs found in your local user profile.</p>";
          return;
        }
        sites.slice(0, 15).forEach(site => {
          const item = document.createElement("div");
          item.className = "topSiteItem";
          item.innerHTML = `
            <div class="topSiteInfo">
              <span class="topSiteTitle">${escapeHTML(site.title || "Untitled Location")}</span>
              <span class="topSiteUrl">${escapeHTML(site.url)}</span>
            </div>
            <button class="addTopSiteBtn" title="Add to Launcher">+</button>
          `;
          item.querySelector('.addTopSiteBtn').addEventListener("click", () => {
            launcherLinks.push({
              name: site.title || "Website",
              url: site.url,
              category: "Top Sites",
              fallback: generateFallback(site.title || "Website"),
              clicks: 0,
              dateAdded: Date.now(),
              isPinned: false
            });
            saveAll();
            sanitizeAndRender();
            item.style.opacity = '0.5';
            item.querySelector('button').disabled = true;
            item.querySelector('button').innerText = "✓";
          });
          topSitesList.appendChild(item);
        });
      });
    } else {
      topSitesList.innerHTML = "<p>Standard web API is active. To enable top-site integration, please install App Launcher Lite as a dedicated extension.</p>";
    }
  });

  suggestedCloseBtn.addEventListener('click', () => suggestedDialog.style.display = 'none');

  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  searchBar.addEventListener('input', debounce(renderGrid, 150));
  addBtn.onclick = () => openModal(false);
  sortSelect.addEventListener('change', renderGrid);

  // High-performance Column detection without layout thrashing
  function getGridColumns() {
    if (activeCardNodes.length <= 1) return 1;
    const firstTop = activeCardNodes[0].offsetTop;
    let cols = 1;
    for (let i = 1; i < activeCardNodes.length; i++) {
      if (activeCardNodes[i].offsetTop === firstTop) cols++;
      else break;
    }
    return cols;
  }

  function updateKeyboardFocusState() {
    activeCardNodes.forEach((node, idx) => {
      if (idx === keyboardFocusedIndex) {
        node.classList.add('keyboard-focused');
        node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        node.classList.remove('keyboard-focused');
      }
    });
  }

  document.addEventListener('keydown', async e => {
    const isInputFocused = document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.isContentEditable;

    if (e.key === 'Escape') {
      closeModal();
      suggestedDialog.style.display = 'none';
      settingsPanel.classList.remove("open");
      infoPanel.classList.remove("open");
      if (contextMenu.style.display === "flex") contextMenu.style.display = "none";
      return;
    }

    if (isInputFocused) {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchBar.focus();
        searchBar.select();
      }
      return;
    }

    if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      const allTabs = ["All", "General", ...launcherCategories];
      if (tabIndex < allTabs.length) {
        activeCategoryTab = allTabs[tabIndex];
        renderTabs();
        renderGrid();
      }
      return;
    }

    if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'f')) {
      e.preventDefault();
      searchBar.focus();
      searchBar.select();
      return;
    }

    if (e.key === ',' || (e.ctrlKey && e.key === ',')) {
      e.preventDefault();
      settingsPanel.classList.toggle("open");
      return;
    }

    if (e.key === '?') {
      e.preventDefault();
      infoPanel.classList.toggle("open");
      return;
    }

    if (e.key.toLowerCase() === 'n' || (e.ctrlKey && e.key.toLowerCase() === 'i')) {
      e.preventDefault();
      openModal(false);
      return;
    }

    if (activeCardNodes.length > 0) {
      const columns = getGridColumns();

      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        if (keyboardFocusedIndex === -1) keyboardFocusedIndex = 0;
        else {
          if (e.key === 'ArrowRight') keyboardFocusedIndex = Math.min(activeCardNodes.length - 1, keyboardFocusedIndex + 1);
          else if (e.key === 'ArrowLeft') keyboardFocusedIndex = Math.max(0, keyboardFocusedIndex - 1);
          else if (e.key === 'ArrowDown') keyboardFocusedIndex = Math.min(activeCardNodes.length - 1, keyboardFocusedIndex + columns);
          else if (e.key === 'ArrowUp') keyboardFocusedIndex = Math.max(0, keyboardFocusedIndex - columns);
        }
        activeCardNodes[keyboardFocusedIndex].focus();
      }

      if (keyboardFocusedIndex >= 0 && keyboardFocusedIndex < activeCardNodes.length) {
        const targetNode = activeCardNodes[keyboardFocusedIndex];
        const globalIdx = parseInt(targetNode.dataset.index, 10);

        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) openLink(globalIdx, true);
          else if (e.ctrlKey || e.metaKey) openIncognito(globalIdx);
          else openLink(globalIdx, false);
        }

        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          launcherLinks[globalIdx].isPinned = !launcherLinks[globalIdx].isPinned;
          saveAll();
          renderGrid();
        }

        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          editingIndex = globalIdx;
          openModal(true);
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const confirmed = await showConfirm(`Are you sure you want to delete "${escapeHTML(launcherLinks[globalIdx].name)}"?`, "Delete Link");
          if (confirmed) {
            launcherLinks.splice(globalIdx, 1);
            saveAll();
            renderGrid();
          }
        }
      }
    }
  });

  function _showModal(title, msg, options = { showCancel: true, okText: "OK", cancelText: "Cancel" }) {
    return new Promise(resolve => {
      if (!_modal.backdrop) return resolve(window.confirm(msg));

      function cleanup() {
        _modal.okBtn.removeEventListener("click", onOk);
        _modal.cancelBtn.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKeyDown);
        _modal.backdrop.classList.add("hidden");
        _modal.backdrop.setAttribute("aria-hidden", "true");
        _modal.visible = false;
      }

      function onOk() { cleanup(); resolve(true); }
      function onCancel() { cleanup(); resolve(false); }
      function onKeyDown(e) {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && document.activeElement !== _modal.cancelBtn) onOk();
      }

      _modal.titleEl.textContent = title || "";
      _modal.msgEl.innerHTML = msg || "";
      _modal.okBtn.textContent = options.okText || "OK";
      _modal.cancelBtn.textContent = options.cancelText || "Cancel";
      _modal.cancelBtn.style.display = options.showCancel ? "" : "none";

      _modal.backdrop.classList.remove("hidden");
      _modal.backdrop.setAttribute("aria-hidden", "false");
      _modal.visible = true;
      _modal.okBtn.focus();

      _modal.okBtn.addEventListener("click", onOk);
      _modal.cancelBtn.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKeyDown);
    });
  }

  function showConfirm(msg, title = "Confirm") { return _showModal(title, msg, { showCancel: true, okText: "Yes", cancelText: "No" }); }
  function showAlert(msg, title = "Alert") { return _showModal(title, msg, { showCancel: false, okText: "OK" }); }

  loadAll();
})();