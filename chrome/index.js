(function () {
  const extAPI = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : ((typeof browser !== "undefined" && browser.runtime) ? browser : null);
  const storageAPI = extAPI && extAPI.storage ? (extAPI.storage.sync || extAPI.storage.local) : null;
  let launcherLinks = [];
  let currentIndex = null;
  let editingIndex = null;
  let deletingIndex = null;
  let draggedItem = null;
  const grid = document.getElementById("cal-link-grid");
  const contextMenu = document.getElementById("cal-contextMenu");
  const searchBar = document.getElementById("cal-search-bar");
  const categoryFilter = document.getElementById("cal-category-filter");
  const themeToggle = document.getElementById("cal-theme-toggle");
  const addBtn = document.getElementById("cal-add-btn");
  const suggestedBtn = document.getElementById("cal-suggested-btn");
  const exportBtn = document.getElementById("cal-export-btn");
  const importBtn = document.getElementById("cal-import-btn");
  const importFile = document.getElementById("cal-import-file");
  const infoBtn = document.getElementById("cal-info-btn");
  const resetBtn = document.getElementById("cal-reset-btn");
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
  const infoDialog = document.getElementById("cal-info-dialog");
  const infoCloseBtn = document.getElementById("cal-info-close-btn");
  if (storageAPI && extAPI.storage.onChanged) {
    extAPI.storage.onChanged.addListener((changes, area) => {
      if ((area === 'sync' || area === 'local') && changes.launcherLinks) {
        launcherLinks = changes.launcherLinks.newValue || getDefaultLinks();
        populateCategories();
        renderGrid();
      }
    });
  }
  function saveLauncherLinks() {
    if (storageAPI) {
      storageAPI.set({ launcherLinks }, () => {
        if (extAPI.runtime.lastError) {
          console.error("Storage Error (Quota Exceeded?):", extAPI.runtime.lastError);
          extAPI.storage.local.set({ launcherLinks });
        }
      });
    } else {
      localStorage.setItem("launcherLinks", JSON.stringify(launcherLinks));
    }
  }
  function loadLauncherLinks() {
    if (storageAPI) {
      storageAPI.get(["launcherLinks"], res => {
        launcherLinks = (res && res.launcherLinks && res.launcherLinks.length) ? res.launcherLinks : getDefaultLinks();
        populateCategories();
        renderGrid();
      });
    } else {
      const saved = localStorage.getItem("launcherLinks");
      launcherLinks = saved ? JSON.parse(saved) : getDefaultLinks();
      populateCategories();
      renderGrid();
    }
  }
  function getDefaultLinks() {
    return [
      { "fallback": "GS", "name": "Google Search", "url": "https://www.google.com", "category": "Search" },
      { "fallback": "Bi", "name": "Bing", "url": "https://www.bing.com", "category": "Search" },
      { "fallback": "DDG", "name": "DuckDuckGo", "url": "https://www.duckduckgo.com", "category": "Search" },
      { "fallback": "SP", "name": "StartPage", "url": "https://www.startpage.com", "category": "Search" },
      { "fallback": "MAP", "name": "Google Maps", "url": "https://maps.google.com", "category": "Tools" },
      { "fallback": "TRA", "name": "Google Translate", "url": "https://translate.google.com", "category": "Tools" },
      { "fallback": "GMA", "name": "Gmail", "url": "https://mail.google.com", "category": "Work", "icon": "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" },
      { "fallback": "GD", "name": "Google Drive", "url": "https://drive.google.com", "category": "Work", "icon": "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png" },
      { "fallback": "GC", "name": "Google Calendar", "url": "https://calendar.google.com", "category": "Work", "icon": "https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_31.ico" },
      { "fallback": "MET", "name": "Google Meet", "url": "https://meet.google.com", "category": "Work" },
      { "fallback": "NOT", "name": "Notion", "url": "https://www.notion.so", "category": "Work" },
      { "fallback": "SLK", "name": "Slack", "url": "https://app.slack.com", "category": "Work" },
      { "fallback": "ZOM", "name": "Zoom", "url": "https://zoom.us", "category": "Work" },
      { "fallback": "CAN", "name": "Canva", "url": "https://www.canva.com", "category": "Work" },
      { "fallback": "WA", "name": "WhatsApp Web", "url": "https://web.whatsapp.com", "category": "Social", "icon": "https://web.whatsapp.com/favicon.ico" },
      { "fallback": "IG", "name": "Instagram", "url": "https://www.instagram.com", "category": "Social" },
      { "fallback": "X", "name": "X (Twitter)", "url": "https://x.com", "category": "Social" },
      { "fallback": "FB", "name": "Facebook", "url": "https://www.facebook.com", "category": "Social" },
      { "fallback": "IN", "name": "LinkedIn", "url": "https://www.linkedin.com", "category": "Social", "icon": "https://linkedin.com/favicon.ico" },
      { "fallback": "RD", "name": "Reddit", "url": "https://www.reddit.com", "category": "Social" },
      { "fallback": "DIS", "name": "Discord", "url": "https://discord.com", "category": "Social" },
      { "fallback": "TEL", "name": "Telegram Web", "url": "https://web.telegram.org", "category": "Social" },
      { "fallback": "GPT", "name": "ChatGPT", "url": "https://chat.openai.com", "category": "AI" },
      { "fallback": "CL", "name": "Claude", "url": "https://claude.ai", "category": "AI" },
      { "fallback": "GH", "name": "GitHub", "url": "https://github.com", "category": "Dev" },
      { "fallback": "SO", "name": "Stack Overflow", "url": "https://stackoverflow.com", "category": "Dev" },
      { "fallback": "YT", "name": "YouTube", "url": "https://www.youtube.com", "category": "Entertainment" },
      { "fallback": "NFL", "name": "Netflix", "url": "https://www.netflix.com", "category": "Entertainment" },
      { "fallback": "SPT", "name": "Spotify", "url": "https://open.spotify.com", "category": "Entertainment" },
      { "fallback": "TWT", "name": "Twitch", "url": "https://www.twitch.tv", "category": "Entertainment" },
      { "fallback": "PRM", "name": "Prime Video", "url": "https://www.primevideo.com", "category": "Entertainment" },
      { "fallback": "AMZ", "name": "Amazon", "url": "https://www.amazon.com", "category": "Shopping" },
      { "fallback": "EBY", "name": "eBay", "url": "https://www.ebay.com", "category": "Shopping" },
      { "fallback": "ALI", "name": "AliExpress", "url": "https://www.aliexpress.com", "category": "Shopping" },
      { "fallback": "WIK", "name": "Wikipedia", "url": "https://www.wikipedia.org", "category": "Infomation" },
      { "fallback": "BBC", "name": "BBC News", "url": "https://www.bbc.com/news", "category": "Infomation" }
    ];
  }
  function generateFallback(name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 3).toUpperCase();
  }
  function getRandomColor() {
    const h = Math.floor(Math.random() * 360), s = Math.floor(Math.random() * 50 + 50), l = Math.floor(Math.random() * 40 + 30);
    return `hsl(${h},${s}%,${l}%)`;
  }
  function populateCategories() {
    const categories = new Set(launcherLinks.map(link => link.category).filter(c => c && c.trim() !== ""));
    categoryFilter.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(cat => {
      categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    categoryDatalist.innerHTML = "";
    categories.forEach(cat => {
      categoryDatalist.innerHTML += `<option value="${cat}">`;
    });
  }
  function renderGrid() {
    grid.innerHTML = "";
    const searchTerm = searchBar.value.toLowerCase();
    const filterCat = categoryFilter.value;
    let linksToRender = launcherLinks.filter(link => {
      const matchesSearch = link.name.toLowerCase().includes(searchTerm);
      const matchesCategory = filterCat === "All" || link.category === filterCat;
      return matchesSearch && matchesCategory;
    });
    linksToRender.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    linksToRender.forEach(link => {
      const idx = launcherLinks.indexOf(link);
      const card = document.createElement("div");
      card.className = "card";
      if (link.isPinned) card.classList.add("pinned");
      card.title = `&chr=20;${link.name}&chr;` + (link.category ? `&cl=var(--accent); (${link.category})&cl;` : "");
      card.dataset.index = idx;
      card.draggable = true;
      const fallback = link.fallback || generateFallback(link.name);
      const bg = getRandomColor();
      const color = "#fff";
      card.innerHTML = `<div class="icon" style="background:${bg};color:${color};">${fallback}</div><div class="name">${link.name}</div><div class="menu-btn">⋮</div>`;
      card.addEventListener("click", e => { if (!e.target.classList.contains("menu-btn")) openLink(idx, false); });
      card.addEventListener("contextmenu", e => { e.preventDefault(); currentIndex = idx; showContextMenu(e.pageX, e.pageY); });
      card.querySelector(".menu-btn").addEventListener("click", e => { e.stopPropagation(); currentIndex = idx; showContextMenu(e.pageX, e.pageY); });

      card.addEventListener('dragstart', () => { draggedItem = card; setTimeout(() => card.classList.add('dragging'), 0); });
      card.addEventListener('dragend', () => { card.classList.remove('dragging'); draggedItem = null; });
      grid.appendChild(card);

      loadFavicon(card, link, fallback, bg, color);
    });
  }
  function loadFavicon(card, link, fallback, bg, color) {
    const icon = card.querySelector(".icon");
    if (link.icon) { icon.innerHTML = `<img src="${link.icon}">`; icon.style.background = 'transparent'; return; }
    try {
      const hostname = new URL(link.url).hostname;
      const sources = [e => `https://www.google.com/s2/favicons?sz=64&domain=${e}`, e => `https://icons.duckduckgo.com/ip2/${e}.ico`];
      let i = 0;
      function tryNext() {
        if (i >= sources.length) return;
        const img = document.createElement("img");
        img.src = sources[i](hostname);
        img.onload = () => { icon.innerHTML = ""; icon.style.background = "transparent"; icon.appendChild(img); };
        img.onerror = () => { i++; tryNext(); };
      }
      tryNext();
    } catch (e) { }
  }
  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(grid, e.clientY);
    if (draggedItem) { if (afterElement == null) { grid.appendChild(draggedItem); } else { grid.insertBefore(draggedItem, afterElement); } }
  });
  grid.addEventListener('drop', () => {
    const newOrder = [...grid.querySelectorAll('.card')].map(card => launcherLinks[card.dataset.index]);
    const visibleIndexes = [...grid.querySelectorAll('.card')].map(card => parseInt(card.dataset.index));
    launcherLinks.forEach((l, i) => { if (!visibleIndexes.includes(i)) newOrder.push(l); });
    launcherLinks = newOrder;
    saveLauncherLinks();
    renderGrid();
  });
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
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
    else if (action === "cal-edit") { editingIndex = currentIndex; openModal(true); }
    else if (action === "cal-delete") { launcherLinks.splice(currentIndex, 1); saveLauncherLinks(); populateCategories(); renderGrid(); }
  });
  function openLink(index, newTab = false) {
    if (index < 0 || index >= launcherLinks.length) return;
    const url = launcherLinks[index].url;
    if (extAPI && extAPI.tabs) {
      if (newTab) extAPI.tabs.create({ url });
      else {
        extAPI.tabs.query({ active: true, lastFocusedWindow: true }, t => {
          if (t && t.length > 0) extAPI.tabs.update(t[0].id, { url });
          else extAPI.tabs.create({ url });
        });
      }
    } else {
      window.open(url, newTab ? "_blank" : "_self");
    }
  }
  function openIncognito(index) {
    const url = launcherLinks[index].url;
    if (extAPI && extAPI.windows) extAPI.windows.create({ url: url, incognito: true });
    else alert("Incognito unsupported outside browser extension.");
  }
  suggestedBtn.addEventListener("click", () => {
    suggestedDialog.style.display = 'flex';
    topSitesList.innerHTML = "Loading...";
    if (extAPI && extAPI.topSites) {
      extAPI.topSites.get(sites => {
        topSitesList.innerHTML = "";
        if (!sites || sites.length === 0) topSitesList.innerHTML = "<p>No sites found.</p>";
        sites.slice(0, 15).forEach(site => {
          const item = document.createElement("div");
          item.className = "top-site-item";
          item.innerHTML = `
                    <div title="Add &cl=var(--accent);&chr=30;${site.title || site.url}&chr;&cl;" class="top-site-info">
                        <span class="top-site-title">${site.title || site.url}</span>
                        <span class="top-site-url">${site.url}</span>
                    </div>
                    <button class="add-top-site-btn" title="Add to Launcher">+</button>
                 `;
          item.querySelector('.add-top-site-btn').addEventListener("click", () => {
            launcherLinks.push({ name: site.title || "Website", url: site.url, category: "Top Sites", fallback: generateFallback(site.title || "Website") });
            saveLauncherLinks(); populateCategories(); renderGrid();
            item.style.opacity = '0.5';
            item.querySelector('button').disabled = true;
            item.querySelector('button').innerText = "✓";
          });
          topSitesList.appendChild(item);
        });
      });
    } else {
      topSitesList.innerHTML = "<p>Top Sites API not available in this context.</p>";
    }
  });
  suggestedCloseBtn.addEventListener('click', () => suggestedDialog.style.display = 'none');
  function openModal(edit = false) {
    popupBox.style.display = "flex";
    if (edit && editingIndex !== null) {
      popupBoxTitle.textContent = "Edit Shortcut";
      const l = launcherLinks[editingIndex];
      linkTitleInput.value = l.name; linkUrlInput.value = l.url; linkCategoryInput.value = l.category || '';
      linkIconUrlInput.value = l.icon && l.icon.startsWith('http') ? l.icon : '';
    } else {
      popupBoxTitle.textContent = "Add Shortcut"; linkTitleInput.value = ""; linkUrlInput.value = ""; linkCategoryInput.value = ""; linkIconUrlInput.value = ""; editingIndex = null;
    }
    linkIconFileInput.value = ''; linkTitleInput.focus();
  }
  function closeModal() { popupBox.style.display = "none"; }
  saveBtn.addEventListener("click", () => {
    const name = linkTitleInput.value.trim(), cat = linkCategoryInput.value.trim(), iconUrl = linkIconUrlInput.value.trim();
    let url = linkUrlInput.value.trim();
    if (!name || !url) return alert("Name and URL required.");
    url = /^https?:\/\//i.test(url) ? url : "https://" + url;
    const saveLink = (iconData = null) => {
      const newLink = { name, url, category: cat, fallback: generateFallback(name), icon: iconData || iconUrl || null };
      if (editingIndex !== null) launcherLinks[editingIndex] = newLink; else launcherLinks.push(newLink);
      editingIndex = null; saveLauncherLinks(); populateCategories(); renderGrid(); closeModal();
    };

    const iconFile = linkIconFileInput.files[0];
    if (iconFile) {
      if (iconFile.size > 50000) return alert("Image too large. Max 50KB for syncing constraints.");
      const reader = new FileReader(); reader.onload = e => saveLink(e.target.result); reader.readAsDataURL(iconFile);
    } else saveLink();
  });
  cancelBtn.addEventListener("click", closeModal);
  searchBar.addEventListener('input', renderGrid);
  categoryFilter.addEventListener('change', renderGrid);
  themeToggle.addEventListener('click', () => { document.body.classList.toggle('dark-theme'); localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light'); });
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
  addBtn.onclick = () => openModal(false);
  exportBtn.onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(launcherLinks, null, 2)], { type: "application/json" }));
    a.download = "launcherLinks.json"; a.click(); URL.revokeObjectURL(a.href);
  };
  importBtn.onclick = () => importFile.click();
  resetBtn.onclick = () => {
    if (confirm("Reset to default?")) { storageAPI ? storageAPI.remove("launcherLinks", () => window.location.reload()) : (localStorage.removeItem("launcherLinks"), window.location.reload()); }
  };
  importFile.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      try { const data = JSON.parse(ev.target.result); if (Array.isArray(data)) { launcherLinks = data; saveLauncherLinks(); populateCategories(); renderGrid(); } } catch (err) { alert('Invalid file'); }
    };
    if (e.target.files[0]) reader.readAsText(e.target.files[0]); e.target.value = '';
  };
  infoBtn.onclick = () => infoDialog.style.display = 'flex';
  infoCloseBtn.onclick = () => infoDialog.style.display = 'none';
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) { e.preventDefault(); searchBar.focus(); }
    if (e.key === 'Escape') { closeModal(); suggestedDialog.style.display = 'none'; infoDialog.style.display = 'none'; }
  });
  loadLauncherLinks();
})();