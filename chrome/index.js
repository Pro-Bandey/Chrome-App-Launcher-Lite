(function () {
  const extAPI = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : ((typeof browser !== "undefined" && browser.runtime) ? browser : null);
  const storageAPI = extAPI && extAPI.storage ? (extAPI.storage.sync || extAPI.storage.local) : null;

  // App States
  let launcherLinks = [];
  let launcherCategories = [];
  let launcherSettings = { iconShape: "rounded", ghToken: "", gistId: "" };

  let currentIndex = null;
  let editingIndex = null;
  let draggedItem = null;
  let activeCategoryTab = "All";

  // Elements
  const grid = document.getElementById("cal-link-grid");
  const contextMenu = document.getElementById("cal-contextMenu");
  const searchBar = document.getElementById("cal-search-bar");
  const sortSelect = document.getElementById("cal-sort-select");
  const themeToggle = document.getElementById("cal-theme-toggle");

  // Side Panels & Buttons
  const settingsPanel = document.getElementById("cal-settings-panel");
  const settingsBtn = document.getElementById("cal-settings-btn");
  const settingsCloseBtn = document.getElementById("cal-settings-close-btn");

  const infoPanel = document.getElementById("cal-info-panel");
  const infoBtn = document.getElementById("cal-info-btn");
  const infoCloseBtn = document.getElementById("cal-info-close-btn");

  // Popups & Modal inputs
  const addBtn = document.getElementById("cal-add-btn");
  const suggestedBtn = document.getElementById("cal-suggested-btn");
  const popupBox = document.getElementById("cal-popupBox");
  const popupBoxTitle = document.getElementById("add-link-heading");
  const linkTitleInput = document.getElementById("cal-link-Tittle");
  const linkUrlInput = document.getElementById("cal-link-Url");
  const linkCategoryInput = document.getElementById("cal-link-Category");
  const categoryDatalist = document.getElementById("category-suggestions");
  const linkIconUrlInput = document.getElementById("cal-link-Icon-Url");
  const linkIconFileInput = document.getElementById("cal-link-Icon-File");
  const saveBtn = document.getElementById("cal-save-btn");
  const cancelBtn = document.getElementById("cal-cancel-btn");
  const suggestedDialog = document.getElementById("cal-suggested-dialog");
  const topSitesList = document.getElementById("call-top-sites-list");
  const suggestedCloseBtn = document.getElementById("cal-suggested-close-btn");

  // Settings Panel Inputs
  const newCatInput = document.getElementById("cal-new-category-input");
  const addCatBtn = document.getElementById("cal-add-category-btn");
  const shapeSelect = document.getElementById("cal-shape-select");
  const syncPushBtn = document.getElementById("cal-sync-push-btn");
  const syncPullBtn = document.getElementById("cal-sync-pull-btn");
  const exportBtn = document.getElementById("cal-export-btn");
  const importBtn = document.getElementById("cal-import-btn");
  const importFile = document.getElementById("cal-import-file");
  const resetBtn = document.getElementById("cal-reset-btn");

  // Initialize Storage Engine Sync Listeners
  if (storageAPI && extAPI.storage.onChanged) {
    extAPI.storage.onChanged.addListener((changes, area) => {
      if ((area === 'sync' || area === 'local')) {
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

  // Database Access Layer
  function saveAll() {
    if (storageAPI) {
      storageAPI.set({ launcherLinks, launcherCategories, launcherSettings }, () => {
        if (extAPI.runtime.lastError) {
          extAPI.storage.local.set({ launcherLinks, launcherCategories, launcherSettings });
        }
      });
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
      const savedLinks = localStorage.getItem("launcherLinks");
      const savedCats = localStorage.getItem("launcherCategories");
      const savedSettings = localStorage.getItem("launcherSettings");
      launcherLinks = savedLinks ? JSON.parse(savedLinks) : getDefaultLinks();
      launcherCategories = savedCats ? JSON.parse(savedCats) : defaultCats;
      launcherSettings = savedSettings ? { ...launcherSettings, ...JSON.parse(savedSettings) } : launcherSettings;
      sanitizeAndRender();
    }
  }

  function sanitizeAndRender() {
    // Fill legacy schema gaps
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
    const shape = launcherSettings.iconShape || "rounded";
    shapeSelect.value = shape;
    grid.className = `cal-link-grid shape-${shape}`;
    document.getElementById("cal-gh-token").value = launcherSettings.ghToken || "";
    document.getElementById("cal-gist-id").value = launcherSettings.gistId || "";
  }

  function getDefaultLinks() {
    return [
      { "fallback": "GS", "name": "Google Search", "url": "https://www.google.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000000 },
      { "fallback": "Bi", "name": "Bing", "url": "https://www.bing.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000001 },
      { "fallback": "GMA", "name": "Gmail", "url": "https://mail.google.com", "category": "Work", "icon": "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico", "clicks": 0, "dateAdded": 1717000000002 },
      { "fallback": "X", "name": "X (Twitter)", "url": "https://x.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000003 },
      { "fallback": "GPT", "name": "ChatGPT", "url": "https://chat.openai.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000004 },
      { "fallback": "GH", "name": "GitHub", "url": "https://github.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000005 },
      { "fallback": "YT", "name": "YouTube", "url": "https://www.youtube.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000006 },

      { "fallback": "FB", "name": "Facebook", "url": "https://www.facebook.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000007 },
      { "fallback": "IG", "name": "Instagram", "url": "https://www.instagram.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000008 },
      { "fallback": "LI", "name": "LinkedIn", "url": "https://www.linkedin.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000009 },
      { "fallback": "RD", "name": "Reddit", "url": "https://www.reddit.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000010 },
      { "fallback": "WK", "name": "Wikipedia", "url": "https://www.wikipedia.org", "category": "Knowledge", "clicks": 0, "dateAdded": 1717000000011 },
      { "fallback": "AMZ", "name": "Amazon", "url": "https://www.amazon.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000012 },
      { "fallback": "NFLX", "name": "Netflix", "url": "https://www.netflix.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000013 },
      { "fallback": "SPT", "name": "Spotify", "url": "https://www.spotify.com", "category": "Music", "clicks": 0, "dateAdded": 1717000000014 },
      { "fallback": "WA", "name": "WhatsApp Web", "url": "https://web.whatsapp.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000015 },
      { "fallback": "GDR", "name": "Google Drive", "url": "https://drive.google.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000016 },
      { "fallback": "GMAP", "name": "Google Maps", "url": "https://maps.google.com", "category": "Utility", "clicks": 0, "dateAdded": 1717000000017 },
      { "fallback": "GTR", "name": "Google Translate", "url": "https://translate.google.com", "category": "Utility", "clicks": 0, "dateAdded": 1717000000018 },
      { "fallback": "OUT", "name": "Outlook", "url": "https://outlook.live.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000019 },
      { "fallback": "MS", "name": "Microsoft", "url": "https://www.microsoft.com", "category": "Tech", "clicks": 0, "dateAdded": 1717000000020 },
      { "fallback": "APPL", "name": "Apple", "url": "https://www.apple.com", "category": "Tech", "clicks": 0, "dateAdded": 1717000000021 },
      { "fallback": "AWS", "name": "Amazon Web Services", "url": "https://aws.amazon.com", "category": "Cloud", "clicks": 0, "dateAdded": 1717000000022 },
      { "fallback": "SO", "name": "Stack Overflow", "url": "https://stackoverflow.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000023 },
      { "fallback": "MED", "name": "Medium", "url": "https://medium.com", "category": "Reading", "clicks": 0, "dateAdded": 1717000000024 },
      { "fallback": "DC", "name": "Discord", "url": "https://discord.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000025 },
      { "fallback": "SLK", "name": "Slack", "url": "https://slack.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000026 },
      { "fallback": "ZM", "name": "Zoom", "url": "https://zoom.us", "category": "Work", "clicks": 0, "dateAdded": 1717000000027 },
      { "fallback": "CAN", "name": "Canva", "url": "https://www.canva.com", "category": "Design", "clicks": 0, "dateAdded": 1717000000028 },
      { "fallback": "NOT", "name": "Notion", "url": "https://www.notion.so", "category": "Productivity", "clicks": 0, "dateAdded": 1717000000029 },
      { "fallback": "DBX", "name": "Dropbox", "url": "https://www.dropbox.com", "category": "Storage", "clicks": 0, "dateAdded": 1717000000030 },
      { "fallback": "PP", "name": "PayPal", "url": "https://www.paypal.com", "category": "Finance", "clicks": 0, "dateAdded": 1717000000031 },
      { "fallback": "STRP", "name": "Stripe", "url": "https://stripe.com", "category": "Finance", "clicks": 0, "dateAdded": 1717000000032 },
      { "fallback": "SHP", "name": "Shopify", "url": "https://www.shopify.com", "category": "Ecommerce", "clicks": 0, "dateAdded": 1717000000033 },
      { "fallback": "WP", "name": "WordPress", "url": "https://wordpress.com", "category": "Web", "clicks": 0, "dateAdded": 1717000000034 },
      { "fallback": "CF", "name": "Cloudflare", "url": "https://www.cloudflare.com", "category": "DevOps", "clicks": 0, "dateAdded": 1717000000035 },
      { "fallback": "OA", "name": "OpenAI", "url": "https://openai.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000036 },
      { "fallback": "NPM", "name": "npm", "url": "https://www.npmjs.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000037 },
      { "fallback": "NODE", "name": "Node.js", "url": "https://nodejs.org", "category": "Dev", "clicks": 0, "dateAdded": 1717000000038 },
      { "fallback": "PY", "name": "Python", "url": "https://www.python.org", "category": "Dev", "clicks": 0, "dateAdded": 1717000000039 },
      { "fallback": "MDN", "name": "MDN Web Docs", "url": "https://developer.mozilla.org", "category": "Dev", "clicks": 0, "dateAdded": 1717000000040 },
      { "fallback": "W3", "name": "W3Schools", "url": "https://www.w3schools.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000041 },
      { "fallback": "CC", "name": "Codecademy", "url": "https://www.codecademy.com", "category": "Learning", "clicks": 0, "dateAdded": 1717000000042 },
      { "fallback": "CRS", "name": "Coursera", "url": "https://www.coursera.org", "category": "Learning", "clicks": 0, "dateAdded": 1717000000043 },
      { "fallback": "UDM", "name": "Udemy", "url": "https://www.udemy.com", "category": "Learning", "clicks": 0, "dateAdded": 1717000000044 },
      { "fallback": "LC", "name": "LeetCode", "url": "https://leetcode.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000045 },
      { "fallback": "HR", "name": "HackerRank", "url": "https://www.hackerrank.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000046 },
      { "fallback": "FIG", "name": "Figma", "url": "https://www.figma.com", "category": "Design", "clicks": 0, "dateAdded": 1717000000047 },
      { "fallback": "JIRA", "name": "Jira", "url": "https://www.atlassian.com/software/jira", "category": "Work", "clicks": 0, "dateAdded": 1717000000048 },
      { "fallback": "TR", "name": "Trello", "url": "https://trello.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000049 },
      { "fallback": "AE", "name": "AliExpress", "url": "https://www.aliexpress.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000050 },
      { "fallback": "EB", "name": "eBay", "url": "https://www.ebay.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000051 },
      { "fallback": "WM", "name": "Walmart", "url": "https://www.walmart.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000052 },
      { "fallback": "BKNG", "name": "Booking.com", "url": "https://www.booking.com", "category": "Travel", "clicks": 0, "dateAdded": 1717000000053 },
      { "fallback": "AIR", "name": "Airbnb", "url": "https://www.airbnb.com", "category": "Travel", "clicks": 0, "dateAdded": 1717000000054 },
      { "fallback": "TA", "name": "TripAdvisor", "url": "https://www.tripadvisor.com", "category": "Travel", "clicks": 0, "dateAdded": 1717000000055 },
      { "fallback": "KHA", "name": "Khan Academy", "url": "https://www.khanacademy.org", "category": "Learning", "clicks": 0, "dateAdded": 1717000000056 },
      { "fallback": "GL", "name": "GitLab", "url": "https://gitlab.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000057 },
      { "fallback": "DO", "name": "DigitalOcean", "url": "https://www.digitalocean.com", "category": "Cloud", "clicks": 0, "dateAdded": 1717000000058 },
      { "fallback": "MOZ", "name": "Mozilla", "url": "https://www.mozilla.org", "category": "Tech", "clicks": 0, "dateAdded": 1717000000059 }
    ];
  }

  // Dynamic Tabs Controller
  function renderTabs() {
    const tabsContainer = document.getElementById("cal-tabs-container");
    tabsContainer.innerHTML = "";

    // Ensure active category is still valid
    const allTabs = ["All", "General", ...launcherCategories];
    if (!allTabs.includes(activeCategoryTab)) activeCategoryTab = "All";

    allTabs.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "category-tab" + (activeCategoryTab === cat ? " active" : "");
      btn.innerText = cat;
      btn.addEventListener("click", () => {
        activeCategoryTab = cat;
        renderTabs();
        renderGrid();
      });
      tabsContainer.appendChild(btn);
    });

    categoryDatalist.innerHTML = "";
    launcherCategories.forEach(cat => {
      categoryDatalist.innerHTML += `<option value="${cat}">`;
    });
  }

  // Unified Multi-Sort Filter Grid System [1]
  function renderGrid() {
    grid.innerHTML = "";
    const searchTerm = searchBar.value.toLowerCase();
    const sortVal = sortSelect.value;

    // Phase 1: Filter
    let filtered = launcherLinks.filter(link => {
      const matchesSearch = link.name.toLowerCase().includes(searchTerm);
      let matchesCategory = false;

      if (activeCategoryTab === "All") {
        matchesCategory = true;
      } else if (activeCategoryTab === "General") {
        matchesCategory = !link.category || link.category.trim() === "" || link.category === "General";
      } else {
        matchesCategory = link.category === activeCategoryTab;
      }
      return matchesSearch && matchesCategory;
    });

    // Phase 2: Sort based on metadata
    filtered.sort((a, b) => {
      // Pinned items float to top per category layout
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      switch (sortVal) {
        case "name":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return (b.dateAdded || 0) - (a.dateAdded || 0);
        case "oldest":
          return (a.dateAdded || 0) - (b.dateAdded || 0);
        case "most-visited":
          return (b.clicks || 0) - (a.clicks || 0);
        case "least-visited":
          return (a.clicks || 0) - (b.clicks || 0);
        default:
          return 0;
      }
    });

    // Phase 3: Build Grid Items
    filtered.forEach(link => {
      const idx = launcherLinks.indexOf(link);
      const card = document.createElement("a");
      card.className = "card";
      card.href = link.url;
      if (link.isPinned) card.classList.add("pinned");
      card.title = `${link.name}` + (link.category ? ` (${link.category})` : "") + ` | Visited: ${link.clicks || 0}`;
      card.dataset.index = idx;
      card.draggable = true;

      const fallback = link.fallback || generateFallback(link.name);
      const bg = getRandomColor();
      card.innerHTML = `<div class="icon" style="background:${bg};color:#fff;">${fallback}</div><div class="name">${link.name}</div><div class="menu-btn">⋮</div>`;

      // Prevent popup closure and open programmatically in active tab [1]
      card.addEventListener("click", e => {
        if (!e.target.classList.contains("menu-btn")) {
          e.preventDefault();
          openLink(idx, false);
        }
      });
      card.addEventListener("contextmenu", e => {
        e.preventDefault();
        currentIndex = idx;
        showContextMenu(e.pageX, e.pageY);
      });
      card.querySelector(".menu-btn").addEventListener("click", e => {
        e.stopPropagation();
        currentIndex = idx;
        showContextMenu(e.pageX, e.pageY);
      });

      // Internal Drag Events
      card.addEventListener('dragstart', () => { draggedItem = card; setTimeout(() => card.classList.add('dragging'), 0); });
      card.addEventListener('dragend', () => { card.classList.remove('dragging'); draggedItem = null; });

      grid.appendChild(card);
      loadFavicon(card, link, fallback);
    });
  }

  // Standard Programmatic Link Router [1]
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
    else alert("Incognito unavailable in current context.");
  }

  function generateFallback(name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 3).toUpperCase();
  }

  function getRandomColor() {
    const h = Math.floor(Math.random() * 360), s = Math.floor(Math.random() * 40 + 40), l = Math.floor(Math.random() * 30 + 30);
    return `hsl(${h},${s}%,${l}%)`;
  }

  // Favicon Loader Engine
  function loadFavicon(card, link, fallback) {
    const icon = card.querySelector(".icon");
    if (link.icon) {
      icon.innerHTML = `<img src="${link.icon}">`;
      icon.style.background = 'transparent';
      return;
    }
    try {
      const hostname = new URL(link.url).hostname;
      const sources = [
        e => `https://www.google.com/s2/favicons?sz=64&domain=${e}`,
        e => `https://icons.duckduckgo.com/ip2/${e}.ico`
      ];
      let i = 0;
      function tryNext() {
        if (i >= sources.length) return;
        const img = document.createElement("img");
        img.src = sources[i](hostname);
        img.onload = () => {
          icon.innerHTML = "";
          icon.style.background = "transparent";
          icon.appendChild(img);
        };
        img.onerror = () => { i++; tryNext(); };
      }
      tryNext();
    } catch (e) { }
  }

  // Drag and Drop External Link Syncing
  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(grid, e.clientY);
    if (draggedItem) {
      if (afterElement == null) grid.appendChild(draggedItem);
      else grid.insertBefore(draggedItem, afterElement);
    }
  });

  grid.addEventListener('drop', e => {
    const urlData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL');
    const textData = e.dataTransfer.getData('text/plain');

    if (urlData) {
      e.preventDefault();
      handleDroppedLink(urlData, textData);
    } else {
      // Handle Internal Drag Re-ordering Drop
      const newOrder = [...grid.querySelectorAll('.card')].map(card => launcherLinks[card.dataset.index]);
      const visibleIndexes = [...grid.querySelectorAll('.card')].map(card => parseInt(card.dataset.index));
      launcherLinks.forEach((l, i) => { if (!visibleIndexes.includes(i)) newOrder.push(l); });
      launcherLinks = newOrder;
      saveAll();
      renderGrid();
    }
  });

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

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Right-Click Context Menu Coordinates Control
  function showContextMenu(x, y) {
    contextMenu.style.display = "flex";
    if (x + contextMenu.offsetWidth > window.innerWidth) x = window.innerWidth - contextMenu.offsetWidth - 5;
    if (y + contextMenu.offsetHeight > window.innerHeight) y = window.innerHeight - contextMenu.offsetHeight - 5;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
  }

  document.addEventListener("click", () => { contextMenu.style.display = "none"; });
  contextMenu.addEventListener("click", e => {
    if (currentIndex === null) return;
    const action = e.target.dataset.action;
    if (action === "cal-open") openLink(currentIndex, false);
    else if (action === "cal-Newtab") openLink(currentIndex, true);
    else if (action === "cal-incognito") openIncognito(currentIndex);
    else if (action === "cal-pin") {
      launcherLinks[currentIndex].isPinned = !launcherLinks[currentIndex].isPinned;
      saveAll();
      renderGrid();
    }
    else if (action === "cal-edit") { editingIndex = currentIndex; openModal(true); }
    else if (action === "cal-delete") {
      launcherLinks.splice(currentIndex, 1);
      saveAll();
      renderGrid();
    }
  });

  // Settings Slide Drawer Panels
  settingsBtn.addEventListener("click", () => settingsPanel.classList.add("open"));
  settingsCloseBtn.addEventListener("click", () => settingsPanel.classList.remove("open"));

  infoBtn.addEventListener("click", () => infoPanel.classList.add("open"));
  infoCloseBtn.addEventListener("click", () => infoPanel.classList.remove("open"));

  // Category Tab settings control manager
  addCatBtn.addEventListener("click", () => {
    const name = newCatInput.value.trim();
    if (name && !launcherCategories.includes(name)) {
      launcherCategories.push(name);
      newCatInput.value = "";
      saveAll();
      renderTabs();
      renderCategorySettingsList();
    }
  });

  function renderCategorySettingsList() {
    const container = document.getElementById("cal-categories-list");
    container.innerHTML = "";
    launcherCategories.forEach((cat, index) => {
      const item = document.createElement("div");
      item.className = "settings-list-item";
      item.innerHTML = `<span>${cat}</span><button class="delete-cat-btn" data-index="${index}">&times;</button>`;
      item.querySelector(".delete-cat-btn").addEventListener("click", () => deleteCategory(index));
      container.appendChild(item);
    });
  }

  function deleteCategory(index) {
    const catName = launcherCategories[index];
    if (confirm(`Are you sure you want to remove the Category: "${catName}"? Existing shortcuts inside will default back into "General".`)) {
      launcherLinks.forEach(l => { if (l.category === catName) l.category = ""; });
      launcherCategories.splice(index, 1);
      saveAll();
      renderTabs();
      renderGrid();
      renderCategorySettingsList();
    }
  }

  // Shape Configuration Control
  shapeSelect.addEventListener("change", () => {
    launcherSettings.iconShape = shapeSelect.value;
    saveAll();
    applySettings();
  });

  // Gist Cloud Sync push/pull mechanism [1]
  syncPushBtn.addEventListener("click", async () => {
    const token = document.getElementById("cal-gh-token").value.trim();
    let gistId = document.getElementById("cal-gist-id").value.trim();
    if (!token) return alert("GitHub Personal Access Token is required to Sync.");

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
        document.getElementById("cal-gist-id").value = gistId;
        launcherSettings.gistId = gistId;
        saveAll();
      }
      alert("Successful push transfer directly to GitHub Cloud!");
    } catch (err) {
      alert("Cloud push sync failed: " + err.message);
    }
  });

  syncPullBtn.addEventListener("click", async () => {
    const token = document.getElementById("cal-gh-token").value.trim();
    const gistId = document.getElementById("cal-gist-id").value.trim();
    if (!token || !gistId) return alert("Both API Token and Gist ID are required to request storage pull.");

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
          alert("Successful download and synchronization transfer from Cloud!");
        }
      } else {
        alert("The designated backup filename could not be parsed inside the requested Gist ID.");
      }
    } catch (err) {
      alert("Cloud sync load failed: " + err.message);
    }
  });

  // Data Backups Local Actions
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
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.launcherLinks) {
          launcherLinks = data.launcherLinks;
          launcherCategories = data.launcherCategories || launcherCategories;
          launcherSettings = data.launcherSettings || launcherSettings;
          saveAll();
          sanitizeAndRender();
        } else if (Array.isArray(data)) {
          // Backward compatibility import logic
          launcherLinks = data;
          saveAll();
          sanitizeAndRender();
        }
      } catch (err) { alert('Failed parsing the imported configuration file.'); }
    };
    if (e.target.files[0]) reader.readAsText(e.target.files[0]);
    e.target.value = '';
  };

  resetBtn.onclick = () => {
    if (confirm("Reset layout? Local modifications will clear back to factory installation configurations.")) {
      if (storageAPI) {
        storageAPI.clear(() => window.location.reload());
      } else {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  // Create Shortcut Dialog Popup
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

  saveBtn.addEventListener("click", () => {
    const name = linkTitleInput.value.trim();
    const cat = linkCategoryInput.value.trim();
    const iconUrl = linkIconUrlInput.value.trim();
    let url = linkUrlInput.value.trim();

    if (!name || !url) return alert("Name and target URL coordinates are required.");
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
      if (iconFile.size > 50000) return alert("Uploaded image too large. Please select file <= 50KB to preserve memory parameters.");
      const reader = new FileReader();
      reader.onload = e => commitShortcut(e.target.result);
      reader.readAsDataURL(iconFile);
    } else {
      commitShortcut();
    }
  });

  // Top Suggested Sites API Dialog Control
  suggestedBtn.addEventListener("click", () => {
    suggestedDialog.style.display = 'flex';
    topSitesList.innerHTML = "Retrieving system logs...";
    if (extAPI && extAPI.topSites) {
      extAPI.topSites.get(sites => {
        topSitesList.innerHTML = "";
        if (!sites || sites.length === 0) {
          topSitesList.innerHTML = "<p>No browsing suggestions retrieved from the browser profile.</p>";
          return;
        }
        sites.slice(0, 15).forEach(site => {
          const item = document.createElement("div");
          item.className = "top-site-item";
          item.innerHTML = `
            <div class="top-site-info">
              <span class="top-site-title">${site.title || "Unknown Page"}</span>
              <span class="top-site-url">${site.url}</span>
            </div>
            <button class="add-top-site-btn" title="Add to Launcher">+</button>
          `;
          item.querySelector('.add-top-site-btn').addEventListener("click", () => {
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
      topSitesList.innerHTML = "<p>Standard Chrome TopSites API interface is not accessible outside active browser environments.</p>";
    }
  });
  suggestedCloseBtn.addEventListener('click', () => suggestedDialog.style.display = 'none');

  // Input Events
  searchBar.addEventListener('input', renderGrid);
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  });
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
  addBtn.onclick = () => openModal(false);

  sortSelect.addEventListener('change', renderGrid);

  // Global Hotkeys Control Intercepts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
      e.preventDefault();
      searchBar.focus();
    }
    if (e.key === 'Escape') {
      closeModal();
      suggestedDialog.style.display = 'none';
      settingsPanel.classList.remove("open");
      infoPanel.classList.remove("open");
    }
  });

  loadAll();
})();