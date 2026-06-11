(function () {
  const extAPI = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : ((typeof browser !== "undefined" && browser.runtime) ? browser : null);
  const storageAPI = extAPI && extAPI.storage ? (extAPI.storage.sync || extAPI.storage.local) : null;

  // App States
  let launcherLinks = [];
  let launcherCategories = [];
  let launcherSettings = { iconShape: "square", ghToken: "", gistId: "" };

  let currentIndex = null;
  let editingIndex = null;
  let activeCategoryTab = "All";

  // Elements
  const grid = document.getElementById("calLinkGrid");
  const contextMenu = document.getElementById("calContextMenu");
  const searchBar = document.getElementById("calSearchBar");
  const sortSelect = document.getElementById("calSortSelect");
  const themeToggle = document.getElementById("calThemeToggle");

  // Side Panels & Buttons
  const settingsPanel = document.getElementById("calSettingsPanel");
  const settingsBtn = document.getElementById("calSettingsBtn");
  const settingsCloseBtn = document.getElementById("calSettingsCloseBtn");

  const infoPanel = document.getElementById("calInfoPanel");
  const infoBtn = document.getElementById("calInfoBtn");
  const infoCloseBtn = document.getElementById("calInfoCloseBtn");

  // Popups & Modal inputs
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

  // Settings Panel Inputs
  const newCatInput = document.getElementById("calNewCategoryInput");
  const addCatBtn = document.getElementById("calAddCategoryBtn");
  const shapeSelect = document.getElementById("calShapeSelect");
  const syncPushBtn = document.getElementById("calSyncPushBtn");
  const syncPullBtn = document.getElementById("calSyncPullBtn");
  const exportBtn = document.getElementById("calExportBtn");
  const importBtn = document.getElementById("calImportBtn");
  const importFile = document.getElementById("calImportFile");
  const resetBtn = document.getElementById("calResetBtn");

  // Custom Modal Elements Object
  const _modal = {
    backdrop: document.getElementById("confirmAndAlertBox"),
    titleEl: document.getElementById("confirmAndAlertBoxTitle"),
    msgEl: document.getElementById("confirmAndAlertBoxMessage"),
    okBtn: document.getElementById("confirmAndAlertBoxOk"),
    cancelBtn: document.getElementById("confirmAndAlertBoxCancel"),
    visible: false
  };

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
      { "fallback": "GML", "name": "Gmail", "url": "https://mail.google.com", "category": "Work", "icon": "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico", "clicks": 0, "dateAdded": 1717000000002 },
      { "fallback": "X", "name": "X (Twitter)", "url": "https://x.com", "category": "Social", "clicks": 0, "dateAdded": 1717000000003 },
      { "fallback": "GPT", "name": "ChatGPT", "url": "https://chat.openai.com", "category": "AI", "clicks": 0, "dateAdded": 1717000000004 },
      { "fallback": "GH", "name": "GitHub", "url": "https://github.com", "category": "Dev", "clicks": 0, "dateAdded": 1717000000005 },
      { "fallback": "YT", "name": "YouTube", "url": "https://www.youtube.com", "category": "Entertainment", "clicks": 0, "dateAdded": 1717000000006 }
    ];
  }

  // Dynamic Tabs Controller
  function renderTabs() {
    const tabsContainer = document.getElementById("calTabsContainer");
    tabsContainer.innerHTML = "";

    const allTabs = ["All", "General", ...launcherCategories];
    if (!allTabs.includes(activeCategoryTab)) activeCategoryTab = "All";

    allTabs.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "categoryTab" + (activeCategoryTab === cat ? " active" : "");
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

  // Unified Multi-Sort Filter Grid System using DocumentFragment
  function renderGrid() {
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
      card.href = link.url;
      if (link.isPinned) card.classList.add("pinned");
      card.title = `${link.name}` + (link.category ? ` (${link.category})` : "") + ` | Visited: ${link.clicks || 0}`;
      card.dataset.index = idx;

      const fallback = link.fallback || generateFallback(link.name);
      const bg = getRandomColor();
      card.innerHTML = `<div class="icon" style="background:${bg};color:#fff;">${fallback}</div><div class="name">${link.name}</div><div class="menuBtn">⋮</div>`;

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

      fragment.appendChild(card);
      loadFavicon(card, link, fallback);
    });

    grid.appendChild(fragment);
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
    else showAlert("Incognito option is unavailable in the current workspace.", "System Warning");
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

  // Favicon Loader Engine with Runtime Caching
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
          link.icon = img.src;
          saveAll();
        };
        img.onerror = () => { i++; tryNext(); };
      }
      tryNext();
    } catch (e) { }
  }

  // Drag and Drop (External Link Drops Only - Internal Sorting Disabled)
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

  // Context Menu Controls
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
      showCoconfirm('Are you');
      launcherLinks.splice(currentIndex, 1);
      saveAll();
      renderGrid();
    }
  });

  // Drawer Panel Event Handlers
  settingsBtn.addEventListener("click", () => settingsPanel.classList.add("open"));
  settingsCloseBtn.addEventListener("click", () => settingsPanel.classList.remove("open"));

  infoBtn.addEventListener("click", () => infoPanel.classList.add("open"));
  infoCloseBtn.addEventListener("click", () => infoPanel.classList.remove("open"));

  // Category Tab control manager
  addCatBtn.addEventListener("click", () => {
    const name = newCatInput.value.trim();
    if (name && !launcherCategories.includes(name)) {
      launcherCategories.push(name);
      newCatInput.value = "";
      saveAll();
      renderTabs();
      renderCategorySettingsList();
    } else {
      showAlert('Please type or paste category name in input first');
    }
  });

  function renderCategorySettingsList() {
    const container = document.getElementById("calCategoriesList");
    container.innerHTML = "";
    launcherCategories.forEach((cat, index) => {
      const item = document.createElement("div");
      item.className = "settingsListItem";
      item.innerHTML = `<span>${cat}</span><button class="deleteCatBtn" data-index="${index}">&times;</button>`;
      item.querySelector(".deleteCatBtn").addEventListener("click", () => deleteCategory(index));
      container.appendChild(item);
    });
  }

  async function deleteCategory(index) {
    const catName = launcherCategories[index];
    const confirmed = await showConfirm(`Are you sure you want to remove the Category: "${catName}"? Existing shortcuts inside will default back to "General".`, "Delete Category");
    if (confirmed) {
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

  // Gist Cloud Sync push/pull mechanism
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
      await showAlert("Configuration successfully sent and backed up to GitHub Cloud!", "Cloud Sync");
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

  // Top Suggested Sites API Dialog Control
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
              <span class="topSiteTitle">${site.title || "Untitled Location"}</span>
              <span class="topSiteUrl">${site.url}</span>
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

  // Input Events & Debouncing Performance Boost
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

  // Global Key Interceptors
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

  // Asynchronous Custom Modal Overlay Controller (Prompts, Alerts, Confirms)
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