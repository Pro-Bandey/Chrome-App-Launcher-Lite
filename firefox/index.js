(function () {
  const extAPI = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : ((typeof browser !== "undefined" && browser.runtime) ? browser : null);
  const storageAPI = extAPI && extAPI.storage ? (extAPI.storage.sync || extAPI.storage.local) : null;

  let launcherLinks = [];
  let launcherCategories = [];
  let launcherSettings = { iconShape: "square", ghToken: "", gistId: "" };

  let currentIndex = null;
  let editingIndex = null;
  let activeCategoryTab = "All";

  let keyboardFocusedIndex = -1;
  let activeCardNodes = [];

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

  let saveTimeout = null;
  function saveAll() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(executeSaveAll, 120);
  }

  function executeSaveAll() {
    if (storageAPI) {
      storageAPI.set({ launcherLinks, launcherCategories, launcherSettings }, () => {
        if (extAPI && extAPI.runtime && extAPI.runtime.lastError) {
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
      { "fallback": "Bi", "name": "Bing", "url": "https://www.bing.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000001 },
      { "fallback": "YH", "name": "Yahoo", "url": "https://www.yahoo.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000002 },
      { "fallback": "DDG", "name": "DuckDuckGo", "url": "https://duckduckgo.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000003 },
      { "fallback": "EC", "name": "Ecosia", "url": "https://www.ecosia.org", "category": "Search", "clicks": 0, "dateAdded": 1717000000004 },
      { "fallback": "BD", "name": "Baidu", "url": "https://www.baidu.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000005 },
      { "fallback": "YD", "name": "Yandex", "url": "https://yandex.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000006 },
      { "fallback": "SP", "name": "Startpage", "url": "https://www.startpage.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000007 },
      { "fallback": "BR", "name": "Brave Search", "url": "https://search.brave.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000008 },
      { "fallback": "QW", "name": "Qwant", "url": "https://www.qwant.com", "category": "Search", "clicks": 0, "dateAdded": 1717000000009 },
      { "fallback": "ST", "name": "Speedtest", "url": "https://www.speedtest.net", "category": "Tools", "clicks": 0, "dateAdded": 1717000000010 },
      { "fallback": "CNV", "name": "Canva", "url": "https://www.canva.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000011 },
      { "fallback": "TP", "name": "TinyPNG", "url": "https://tinypng.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000012 },
      { "fallback": "RM", "name": "Remove.bg", "url": "https://www.remove.bg", "category": "Tools", "clicks": 0, "dateAdded": 1717000000013 },
      { "fallback": "CV", "name": "Convertio", "url": "https://convertio.co", "category": "Tools", "clicks": 0, "dateAdded": 1717000000014 },
      { "fallback": "VT", "name": "VirusTotal", "url": "https://www.virustotal.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000015 },
      { "fallback": "US", "name": "Unsplash", "url": "https://unsplash.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000016 },
      { "fallback": "PX", "name": "Pixabay", "url": "https://pixabay.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000017 },
      { "fallback": "WM", "name": "Wayback Machine", "url": "https://archive.org/web/", "category": "Tools", "clicks": 0, "dateAdded": 1717000000018 },
      { "fallback": "FG", "name": "Figma", "url": "https://www.figma.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000019 },
      { "fallback": "QB", "name": "QuillBot", "url": "https://quillbot.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000020 },
      { "fallback": "P2G", "name": "PDF2Go", "url": "https://www.pdf2go.com", "category": "Tools", "clicks": 0, "dateAdded": 1717000000021 },
      { "fallback": "GML", "name": "Gmail", "url": "https://mail.google.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000022 },
      { "fallback": "CAL", "name": "Google Calendar", "url": "https://calendar.google.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000023 },
      { "fallback": "DRV", "name": "Google Drive", "url": "https://drive.google.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000024 },
      { "fallback": "SHT", "name": "Google Sheets", "url": "https://docs.google.com/spreadsheets", "category": "Work", "clicks": 0, "dateAdded": 1717000000025 },
      { "fallback": "DOC", "name": "Google Docs", "url": "https://docs.google.com/document", "category": "Work", "clicks": 0, "dateAdded": 1717000000026 },
      { "fallback": "M36", "name": "Microsoft 365", "url": "https://www.office.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000027 },
      { "fallback": "ZM", "name": "Zoom", "url": "https://zoom.us", "category": "Work", "clicks": 0, "dateAdded": 1717000000028 },
      { "fallback": "OUT", "name": "Outlook", "url": "https://outlook.live.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000029 },
      { "fallback": "SL", "name": "Slack", "url": "https://slack.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000030 },
      { "fallback": "DB", "name": "Dropbox", "url": "https://www.dropbox.com", "category": "Work", "clicks": 0, "dateAdded": 1717000000031 },
      { "fallback": "NT", "name": "Notion", "url": "https://www.notion.so", "category": "Work", "clicks": 0, "dateAdded": 1717000000032 },
      { "fallback": "JR", "name": "Jira", "url": "https://www.atlassian.com/software/jira", "category": "Work", "clicks": 0, "dateAdded": 1717000000033 },
      { "fallback": "X", "name": "X (Twitter)", "url": "https://x.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000034 },
      { "fallback": "FB", "name": "Facebook", "url": "https://www.facebook.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000035 },
      { "fallback": "IG", "name": "Instagram", "url": "https://www.instagram.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000036 },
      { "fallback": "LN", "name": "LinkedIn", "url": "https://www.linkedin.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000037 },
      { "fallback": "RD", "name": "Reddit", "url": "https://www.reddit.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000038 },
      { "fallback": "PIN", "name": "Pinterest", "url": "https://www.pinterest.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000039 },
      { "fallback": "TT", "name": "TikTok", "url": "https://www.tiktok.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000040 },
      { "fallback": "THR", "name": "Threads", "url": "https://www.threads.net", "category": "Social", "clicks": 0, "dateAdded": 1717000000041 },
      { "fallback": "DC", "name": "Discord", "url": "https://discord.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000042 },
      { "fallback": "TG", "name": "Telegram", "url": "https://web.telegram.org", "category": "Social", "clicks": 0, "dateAdded": 1717000000043 },
      { "fallback": "WA", "name": "WhatsApp Web", "url": "https://web.whatsapp.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000044 },
      { "fallback": "MD", "name": "Mastodon", "url": "https://mastodon.social", "category": "Social", "clicks": 0, "dateAdded": 1717000000045 },
      { "fallback": "GPT", "name": "ChatGPT", "url": "https://chat.openai.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000046 },
      { "fallback": "CLD", "name": "Claude", "url": "https://claude.ai", "category": "AI", "clicks": 0, "dateAdded": 1717000000047 },
      { "fallback": "GEM", "name": "Gemini", "url": "https://gemini.google.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000048 },
      { "fallback": "MJ", "name": "Midjourney", "url": "https://www.midjourney.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000049 },
      { "fallback": "HF", "name": "Hugging Face", "url": "https://huggingface.co", "category": "AI", "clicks": 0, "dateAdded": 1717000000050 },
      { "fallback": "PPX", "name": "Perplexity", "url": "https://www.perplexity.ai", "category": "AI", "clicks": 0, "dateAdded": 1717000000051 },
      { "fallback": "DL", "name": "DeepL", "url": "https://www.deepl.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000052 },
      { "fallback": "GR", "name": "Grammarly", "url": "https://www.grammarly.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000053 },
      { "fallback": "POE", "name": "Poe", "url": "https://poe.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000054 },
      { "fallback": "COP", "name": "Copilot", "url": "https://copilot.microsoft.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000055 },
      { "fallback": "RW", "name": "RunwayML", "url": "https://runwayml.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000056 },
      { "fallback": "PH", "name": "Phind", "url": "https://www.phind.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000057 },
      { "fallback": "GH", "name": "GitHub", "url": "https://github.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000058 },
      { "fallback": "GL", "name": "GitLab", "url": "https://gitlab.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000059 },
      { "fallback": "BB", "name": "Bitbucket", "url": "https://bitbucket.org", "category": "Dev", "clicks": 0, "dateAdded": 1717000000060 },
      { "fallback": "SO", "name": "Stack Overflow", "url": "https://stackoverflow.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000061 },
      { "fallback": "MDN", "name": "MDN Web Docs", "url": "https://developer.mozilla.org", "category": "Dev", "clicks": 0, "dateAdded": 1717000000062 },
      { "fallback": "CP", "name": "CodePen", "url": "https://codepen.io", "category": "Dev", "clicks": 0, "dateAdded": 1717000000063 },
      { "fallback": "JSF", "name": "JSFiddle", "url": "https://jsfiddle.net", "category": "Dev", "clicks": 0, "dateAdded": 1717000000064 },
      { "fallback": "VR", "name": "Vercel", "url": "https://vercel.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000065 },
      { "fallback": "NL", "name": "Netlify", "url": "https://www.netlify.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000066 },
      { "fallback": "DH", "name": "Docker Hub", "url": "https://hub.docker.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000067 },
      { "fallback": "NPM", "name": "npm", "url": "https://www.npmjs.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000068 },
      { "fallback": "LC", "name": "LeetCode", "url": "https://leetcode.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000069 },
      { "fallback": "YT", "name": "YouTube", "url": "https://www.youtube.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000070 },
      { "fallback": "NFL", "name": "Netflix", "url": "https://www.netflix.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000071 },
      { "fallback": "SF", "name": "Spotify", "url": "https://www.spotify.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000072 },
      { "fallback": "TWC", "name": "Twitch", "url": "https://www.twitch.tv", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000073 },
      { "fallback": "DIS", "name": "Disney+", "url": "https://www.disneyplus.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000074 },
      { "fallback": "PV", "name": "Prime Video", "url": "https://www.primevideo.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000075 },
      { "fallback": "IMD", "name": "IMDb", "url": "https://www.imdb.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000076 },
      { "fallback": "SCD", "name": "SoundCloud", "url": "https://soundcloud.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000077 },
      { "fallback": "STM", "name": "Steam", "url": "https://store.steampowered.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000078 },
      { "fallback": "CR", "name": "Crunchyroll", "url": "https://www.crunchyroll.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000079 },
      { "fallback": "AMZ", "name": "Amazon", "url": "https://www.amazon.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000080 },
      { "fallback": "EBY", "name": "eBay", "url": "https://www.ebay.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000081 },
      { "fallback": "ALI", "name": "AliExpress", "url": "https://www.aliexpress.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000082 },
      { "fallback": "ETS", "name": "Etsy", "url": "https://www.etsy.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000083 },
      { "fallback": "SHP", "name": "Shopify", "url": "https://www.shopify.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000084 },
      { "fallback": "BBY", "name": "Best Buy", "url": "https://www.bestbuy.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000085 },
      { "fallback": "TGT", "name": "Target", "url": "https://www.target.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000086 },
      { "fallback": "WMT", "name": "Walmart", "url": "https://www.walmart.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000087 },
      { "fallback": "APL", "name": "Apple Store", "url": "https://www.apple.com/store", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000088 },
      { "fallback": "IKE", "name": "IKEA", "url": "https://www.ikea.com", "category": "Shopping", "clicks": 0, "dateAdded": 1717000000089 },
      { "fallback": "WK", "name": "Wikipedia", "url": "https://www.wikipedia.org", "category": "Information", "clicks": 0, "dateAdded": 1717000000090 },
      { "fallback": "HN", "name": "Hacker News", "url": "https://news.ycombinator.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000091 },
      { "fallback": "SE", "name": "Stack Exchange", "url": "https://stackexchange.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000092 },
      { "fallback": "QR", "name": "Quora", "url": "https://www.quora.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000093 },
      { "fallback": "MED", "name": "Medium", "url": "https://medium.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000094 },
      { "fallback": "TC", "name": "TechCrunch", "url": "https://techcrunch.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000095 },
      { "fallback": "BBC", "name": "BBC News", "url": "https://www.bbc.com/news", "category": "Information", "clicks": 0, "dateAdded": 1717000000096 },
      { "fallback": "RT", "name": "Reuters", "url": "https://www.reuters.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000097 },
      { "fallback": "WRD", "name": "Wired", "url": "https://www.wired.com", "category": "Information", "clicks": 0, "dateAdded": 1717000000098 },
      { "fallback": "DVT", "name": "Dev.to", "url": "https://dev.to", "category": "Information", "clicks": 0, "dateAdded": 1717000000099 }
    ];
  }

  function renderTabs() {
    const tabsContainer = document.getElementById("calTabsContainer");
    tabsContainer.innerHTML = "";

    const allTabs = ["All", "General", ...launcherCategories];
    if (!allTabs.includes(activeCategoryTab)) activeCategoryTab = "All";

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
      tabsContainer.appendChild(btn);
    });

    categoryDatalist.innerHTML = "";
    launcherCategories.forEach(cat => {
      categoryDatalist.innerHTML += `<option value="${escapeHTML(cat)}">`;
    });
  }

  function renderGrid() {
    let focusGlobalIdx = null;
    let wasFocused = false;

    // Remember the keyboard focus state seamlessly across re-renders
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

      if (activeCategoryTab === "All") {
        matchesCategory = true;
      } else if (activeCategoryTab === "General") {
        matchesCategory = !link.category || link.category.trim() === "" || link.category === "General";
      } else {
        matchesCategory = link.category === activeCategoryTab;
      }
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
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

    const fragment = document.createDocumentFragment();

    filtered.forEach(link => {
      const idx = launcherLinks.indexOf(link);
      const card = document.createElement("a");
      card.className = "card";
      card.href = escapeHTML(link.url);
      card.tabIndex = 0;
      card.setAttribute("role", "gridcell");
      if (link.isPinned)
        card.classList.add("pinned");
      const safeName = escapeHTML(link.name);
      const safeCategory = escapeHTML(link.category);
      card.title = `${safeName}` + (link.category ? ` (${safeCategory})` : "") + ` | Visited: ${link.clicks || 0}`;
      card.dataset.index = idx;

      const fallback = escapeHTML(link.fallback || generateFallback(link.name));
      const bg = getRandomColor();
      card.innerHTML = `<div class="icon" style="background:${bg};color:#fff;">${fallback}</div><div class="name">${safeName}</div><div class="menuBtn">⋮</div>`;

      card.addEventListener("click", e => {
        if (!e.target.classList.contains("menuBtn")) {
          e.preventDefault();
          openLink(idx, false);
        }
      });
      card.addEventListener("contextmenu", e => {
        e.preventDefault();
        currentIndex = idx;
        showContextMenu(e.pageX, e.pageY);
      });
      card.querySelector(".menuBtn").addEventListener("click", e => {
        e.stopPropagation();
        currentIndex = idx;
        showContextMenu(e.pageX, e.pageY);
      });

      card.addEventListener("focus", () => {
        keyboardFocusedIndex = activeCardNodes.indexOf(card);
        updateKeyboardFocusState();
      });

      fragment.appendChild(card);
      loadFavicon(card, link, fallback);
    });

    grid.appendChild(fragment);

    activeCardNodes = Array.from(grid.querySelectorAll('.card'));

    // Automatically re-focus mapped keyboard elements if grid was rebuilt externally
    if (focusGlobalIdx !== null) {
      const reMapIndex = activeCardNodes.findIndex(node => node.dataset.index === focusGlobalIdx);
      if (reMapIndex !== -1) {
        keyboardFocusedIndex = reMapIndex;
        updateKeyboardFocusState();
        if (wasFocused) {
          activeCardNodes[keyboardFocusedIndex].focus();
        }
      } else {
        keyboardFocusedIndex = -1;
      }
    } else {
      keyboardFocusedIndex = -1;
    }
  }

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

  function generateFallback(name) {
    const clean = name.trim();
    if (!clean) return "??";
    const parts = clean.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.substring(0, 3).toUpperCase();
  }

  function getRandomColor() {
    const h = Math.floor(Math.random() * 360), s = Math.floor(Math.random() * 40 + 40), l = Math.floor(Math.random() * 30 + 30);
    return `hsl(${h},${s}%,${l}%)`;
  }

  function loadFavicon(card, link, fallback) {
    const icon = card.querySelector(".icon");
    if (link.icon) {
      icon.innerHTML = `<img src="${escapeHTML(link.icon)}">`;
      icon.style.background = 'transparent';
      return;
    }
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
        const img = document.createElement("img");
        try {
          img.src = sources[i]();
        } catch (err) {
          i++;
          tryNext();
          return;
        }
        img.onload = () => {
          icon.innerHTML = "";
          icon.style.background = "transparent";
          icon.appendChild(img);
          link.icon = img.src;
          saveAll();
        };
        img.onerror = () => { i++; tryNext(); };
      }
      tryNext();
    } catch (e) { }
  }

  grid.addEventListener('dragover', e => {
    e.preventDefault();
  });

  grid.addEventListener('drop', e => {
    const urlData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL');
    const textData = e.dataTransfer.getData('text/plain');

    if (urlData) {
      e.preventDefault();
      handleDroppedLink(urlData, textData);
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

    // Hardened context menu to handle children clicks within the button map
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
      if (storageAPI) {
        storageAPI.clear(() => window.location.reload());
      } else {
        localStorage.clear();
        window.location.reload();
      }
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

  searchBar.addEventListener('input', debounce(renderGrid, 120));

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('darkTheme');
    localStorage.setItem('theme', document.body.classList.contains('darkTheme') ? 'dark' : 'light');
  });
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('darkTheme');
  addBtn.onclick = () => openModal(false);

  sortSelect.addEventListener('change', renderGrid);

  function getGridColumns() {
    if (activeCardNodes.length === 0) return 1;
    const firstRect = activeCardNodes[0].getBoundingClientRect();
    let cols = 1;
    for (let i = 1; i < activeCardNodes.length; i++) {
      if (activeCardNodes[i].getBoundingClientRect().top === firstRect.top) {
        cols++;
      } else {
        break;
      }
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
      if (contextMenu.style.display === "flex") {
        contextMenu.style.display = "none";
      }
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

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (keyboardFocusedIndex === -1) keyboardFocusedIndex = 0;
        else keyboardFocusedIndex = Math.min(activeCardNodes.length - 1, keyboardFocusedIndex + 1);
        activeCardNodes[keyboardFocusedIndex].focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (keyboardFocusedIndex === -1) keyboardFocusedIndex = 0;
        else keyboardFocusedIndex = Math.max(0, keyboardFocusedIndex - 1);
        activeCardNodes[keyboardFocusedIndex].focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (keyboardFocusedIndex === -1) keyboardFocusedIndex = 0;
        else keyboardFocusedIndex = Math.min(activeCardNodes.length - 1, keyboardFocusedIndex + columns);
        activeCardNodes[keyboardFocusedIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (keyboardFocusedIndex === -1) keyboardFocusedIndex = 0;
        else keyboardFocusedIndex = Math.max(0, keyboardFocusedIndex - columns);
        activeCardNodes[keyboardFocusedIndex].focus();
      }

      if (keyboardFocusedIndex >= 0 && keyboardFocusedIndex < activeCardNodes.length) {
        const targetNode = activeCardNodes[keyboardFocusedIndex];
        const globalIdx = parseInt(targetNode.dataset.index);

        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            openLink(globalIdx, true);
          } else if (e.ctrlKey || e.metaKey) {
            openIncognito(globalIdx);
          } else {
            openLink(globalIdx, false);
          }
        }

        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          launcherLinks[globalIdx].isPinned = !launcherLinks[globalIdx].isPinned;
          saveAll();
          renderGrid();
          // `renderGrid` natively handles preserving focused mapping post-render
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
      if (!_modal.backdrop) {
        resolve(window.confirm(msg));
        return;
      }

      function cleanup() {
        _modal.okBtn.removeEventListener("click", onOk);
        _modal.cancelBtn.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKeyDown);
        _modal.backdrop.classList.add("hidden");
        _modal.backdrop.setAttribute("aria-hidden", "true");
        _modal.visible = false;
      }

      function onOk() {
        cleanup();
        resolve(true);
      }

      function onCancel() {
        cleanup();
        resolve(false);
      }

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

  function showConfirm(msg, title = "Confirm") {
    return _showModal(title, msg, { showCancel: true, okText: "Yes", cancelText: "No" });
  }

  function showAlert(msg, title = "Alert") {
    return _showModal(title, msg, { showCancel: false, okText: "OK" });
  }

  loadAll();
})();