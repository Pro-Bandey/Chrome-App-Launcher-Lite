(function() {
  // ===== Variables =====
  let launcherLinks = [];
  let currentIndex = null;
  let editingIndex = null;
  let deletingIndex = null;
  let draggedItem = null;

  // ===== Elements =====
  const grid = document.getElementById("cal-link-grid");
  const contextMenu = document.getElementById("cal-contextMenu");
  const addBtn = document.getElementById("cal-add-btn");
  const exportBtn = document.getElementById("cal-export-btn");
  const importBtn = document.getElementById("cal-import-btn");
  const importFile = document.getElementById("cal-import-file");
  const infoBtn = document.getElementById("cal-info-btn");
  const resetBtn = document.getElementById("cal-reset-btn");
  const searchBar = document.getElementById("cal-search-bar");
  const themeToggle = document.getElementById("cal-theme-toggle");

  const popupBox = document.getElementById("cal-popupBox");
  const linkTitleInput = document.getElementById("cal-link-Tittle");
  const linkUrlInput = document.getElementById("cal-link-Url");
  const linkIconUrlInput = document.getElementById("cal-link-Icon-Url");
  const linkIconFileInput = document.getElementById("cal-link-Icon-File");
  const saveBtn = document.getElementById("cal-save-btn");
  const cancelBtn = document.getElementById("cal-cancel-btn");

  const infoDialog = document.getElementById("cal-info-dialog");
  const infoCloseBtn = document.getElementById("cal-info-close-btn");

  const deleteConfirmBox = document.createElement("div");
  deleteConfirmBox.className = "delete-box";
  deleteConfirmBox.style.display = "none";
  deleteConfirmBox.innerHTML = `
    <h2 class="alert-box-heading">Delete Shortcut</h2>
    <div class="delete-box-content">
        <p>Are you sure you want to remove this shortcut?</p>
        <div class="delete-box-action">
            <button id="deleteConfirmBtn" class="danger">Delete</button>
            <button id="deleteCancelBtn">Cancel</button>
        </div>
    </div>
  `;
  document.body.appendChild(deleteConfirmBox);
  const deleteConfirmBtn = deleteConfirmBox.querySelector("#deleteConfirmBtn");
  const deleteCancelBtn = deleteConfirmBox.querySelector("#deleteCancelBtn");

  const storage = chrome?.storage?.sync ? chrome.storage.sync : chrome?.storage?.local;

  function saveLauncherLinks() {
    if (storage) {
      storage.set({ launcherLinks });
    } else {
      localStorage.setItem("launcherLinks", JSON.stringify(launcherLinks));
    }
  }

  function loadLauncherLinks() {
    if (storage) {
      storage.get(["launcherLinks"], res => {
        launcherLinks = (res.launcherLinks && res.launcherLinks.length) ? res.launcherLinks : getDefaultLinks();
        renderGrid();
      });
    } else {
      const saved = localStorage.getItem("launcherLinks");
      launcherLinks = saved ? JSON.parse(saved) : getDefaultLinks();
      renderGrid();
    }
  }

  function getRandomColor() {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 50 + 50);
    const l = Math.floor(Math.random() * 40 + 30);
    return `hsl(${h},${s}%,${l}%)`;
  }

  function generateFallback(name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 3).toUpperCase();
  }

  function getDefaultLinks() {
    return [
      { "fallback": "GS", "name": "Google Search", "url": "https://www.google.com" },
      { "fallback": "GMA", "name": "Gmail", "url": "https://mail.google.com", "icon": "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" },
      { "fallback": "GD", "name": "Google Drive", "url": "https://drive.google.com", "icon": "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png" },
      { "fallback": "GD", "name": "Google Docs", "url": "https://docs.google.com", "icon": "https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico" },
      { "fallback": "GS", "name": "Google Sheets", "url": "https://sheets.google.com", "icon": "https://ssl.gstatic.com/docs/spreadsheets/spreadsheets_2023q4.ico" },
      { "fallback": "GS", "name": "Google Slides", "url": "https://slides.google.com", "icon": "https://ssl.gstatic.com/docs/presentations/images/favicon-2023q4.ico" },
      { "fallback": "PHO", "name": "Google Photos", "url": "https://photos.google.com" },
      { "fallback": "MAP", "name": "Google Maps", "url": "https://maps.google.com" },
      { "fallback": "GC", "name": "Google Calendar", "url": "https://calendar.google.com", "icon": "https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_31.ico" },
      { "fallback": "MET", "name": "Google Meet", "url": "https://meet.google.com" },
      { "fallback": "CHA", "name": "Google Chat", "url": "https://chat.google.com" },
      { "fallback": "GK", "name": "Google Keep", "url": "https://keep.google.com", "icon": "https://ssl.gstatic.com/keep/icon_2020q4v2_128.png" },
      { "fallback": "GC", "name": "Google Contacts", "url": "https://contacts.google.com", "icon": "https://www.gstatic.com/images/branding/product/2x/contacts_2022_96dp.png" },
      { "fallback": "TRA", "name": "Google Translate", "url": "https://translate.google.com" },
      { "fallback": "YT", "name": "YouTube", "url": "https://www.youtube.com" },
      { "fallback": "FB", "name": "Facebook", "url": "https://www.facebook.com" },
      { "fallback": "IG", "name": "Instagram", "url": "https://www.instagram.com" },
      { "fallback": "X", "name": "Twitter / X", "url": "https://x.com" },
      { "fallback": "IN", "name": "LinkedIn", "url": "https://www.linkedin.com", "icon": "https://linkedin.com/favicon.ico" },
      { "fallback": "RD", "name": "Reddit", "url": "https://www.reddit.com" },
      { "fallback": "PIN", "name": "Pinterest", "url": "https://www.pinterest.com" },
      { "fallback": "SNP", "name": "Snapchat", "url": "https://www.snapchat.com", "icon": "https://snapchat.com/favicon.ico" },
      { "fallback": "DIS", "name": "Discord", "url": "https://discord.com" },
      { "fallback": "TEL", "name": "Telegram Web", "url": "https://web.telegram.org" },
      { "fallback": "WA", "name": "WhatsApp Web", "url": "https://web.whatsapp.com", "icon": "https://web.whatsapp.com/favicon.ico" },
      { "fallback": "GPT", "name": "ChatGPT", "url": "https://chat.openai.com" },
      { "fallback": "GH", "name": "GitHub", "url": "https://github.com" },
      { "fallback": "SO", "name": "Stack Overflow", "url": "https://stackoverflow.com" },
      { "fallback": "CP", "name": "CodePen", "url": "https://codepen.io" },
      { "fallback": "JS", "name": "JSFiddle", "url": "https://jsfiddle.net" },
      { "fallback": "REP", "name": "Replit", "url": "https://replit.com" },
      { "fallback": "VER", "name": "Vercel", "url": "https://vercel.com" },
      { "fallback": "NET", "name": "Netlify", "url": "https://www.netlify.com" },
      { "fallback": "NOT", "name": "Notion", "url": "https://www.notion.so" },
      { "fallback": "TRL", "name": "Trello", "url": "https://trello.com" },
      { "fallback": "ASA", "name": "Asana", "url": "https://asana.com" },
      { "fallback": "SLK", "name": "Slack", "url": "https://slack.com" },
      { "fallback": "ZOM", "name": "Zoom", "url": "https://zoom.us" },
      { "fallback": "CAN", "name": "Canva", "url": "https://www.canva.com" },
      { "fallback": "DB", "name": "Dropbox", "url": "https://www.dropbox.com" },
      { "fallback": "AMZ", "name": "Amazon", "url": "https://www.amazon.com" },
      { "fallback": "EBY", "name": "eBay", "url": "https://www.ebay.com" },
      { "fallback": "FLP", "name": "Flipkart", "url": "https://www.flipkart.com" },
      { "fallback": "ALI", "name": "AliExpress", "url": "https://www.aliexpress.com" },
      { "fallback": "ETS", "name": "Etsy", "url": "https://www.etsy.com" },
      { "fallback": "NFL", "name": "Netflix", "url": "https://www.netflix.com" },
      { "fallback": "PRM", "name": "Amazon Prime Video", "url": "https://www.primevideo.com" },
      { "fallback": "DIS", "name": "Disney+", "url": "https://www.disneyplus.com" },
      { "fallback": "SPT", "name": "Spotify", "url": "https://open.spotify.com" },
      { "fallback": "SND", "name": "SoundCloud", "url": "https://soundcloud.com" },
      { "fallback": "TWT", "name": "Twitch", "url": "https://www.twitch.tv" },
      { "fallback": "BBC", "name": "BBC News", "url": "https://www.bbc.com/news" },
      { "fallback": "CNN", "name": "CNN", "url": "https://www.cnn.com" },
      { "fallback": "GDN", "name": "The Guardian", "url": "https://www.theguardian.com" },
      { "fallback": "NYT", "name": "New York Times", "url": "https://www.nytimes.com" },
      { "fallback": "GNS", "name": "Google News", "url": "https://news.google.com" },
      { "fallback": "WIK", "name": "Wikipedia", "url": "https://www.wikipedia.org" },
      { "fallback": "CRS", "name": "Coursera", "url": "https://www.coursera.org" },
      { "fallback": "UDE", "name": "Udemy", "url": "https://www.udemy.com" },
      { "fallback": "MED", "name": "Medium", "url": "https://medium.com" },
      { "fallback": "SPD", "name": "Speedtest", "url": "https://www.speedtest.net" },
      { "fallback": "PNG", "name": "TinyPNG", "url": "https://tinypng.com" },
      { "fallback": "RBG", "name": "Remove.bg", "url": "https://www.remove.bg" },
      { "fallback": "PDF", "name": "PDF24 Tools", "url": "https://tools.pdf24.org" },
      { "fallback": "ILP", "name": "ILovePDF", "url": "https://www.ilovepdf.com" }
    ];
  }

  function renderGrid(linksToRender = launcherLinks) {
    grid.innerHTML = "";
    const sortedLinks = [...linksToRender].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    sortedLinks.forEach(link => {
      const idx = launcherLinks.indexOf(link);
      const card = document.createElement("div");
      card.className = "card";
      if (link.isPinned) card.classList.add("pinned");
      card.title = link.name;
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
    saveLauncherLinks();
  }

  function loadFavicon(card, link, fallback, bg, color) {
    const icon = card.querySelector(".icon");
    if (link.icon) { icon.innerHTML = `<img src="${link.icon}" alt="${link.name}">`; icon.style.background = 'transparent'; return; }
    const hostname = new URL(link.url).hostname;
    const sources = [ e => `https://www.google.com/s2/favicons?sz=64&domain=${e}`, e => `https://icons.duckduckgo.com/ip2/${e}.ico`, e => `https://logo.clearbit.com/${e}` ];
    let i = 0;
    function tryNext() {
        if (i >= sources.length) { icon.innerHTML = fallback; icon.style.background = bg; icon.style.color = color; return; }
        const img = document.createElement("img");
        img.src = sources[i](hostname);
        img.onload = () => { icon.innerHTML = ""; icon.style.background = "transparent"; icon.appendChild(img); };
        img.onerror = () => { i++; tryNext(); };
    }
    tryNext();
  }

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(grid, e.clientY);
    if (draggedItem) { if (afterElement == null) { grid.appendChild(draggedItem); } else { grid.insertBefore(draggedItem, afterElement); } }
  });

  grid.addEventListener('drop', () => {
    const newOrder = [...grid.querySelectorAll('.card')].map(card => launcherLinks[card.dataset.index]);
    launcherLinks = newOrder;
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
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 5;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 5;
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
    else if (action === "cal-delete") showDeleteConfirm(currentIndex);
  });

  function showDeleteConfirm(idx) { deletingIndex = idx; deleteConfirmBox.style.display = "block"; }
  deleteConfirmBtn.addEventListener("click", () => {
    if (deletingIndex !== null) { launcherLinks.splice(deletingIndex, 1); renderGrid(); deletingIndex = null; }
    deleteConfirmBox.style.display = "none";
  });
  deleteCancelBtn.addEventListener("click", () => { deletingIndex = null; deleteConfirmBox.style.display = "none"; });

  function openLink(index, newTab = false) {
    if (index < 0 || index >= launcherLinks.length) return;
    const url = launcherLinks[index].url;
    if (chrome?.tabs) {
      newTab ? chrome.tabs.create({ url }) : chrome.tabs.query({ active: true, currentWindow: true }, t => {
        if(t[0]) chrome.tabs.update(t[0].id, { url });
        else chrome.tabs.create({ url });
      });
    } else {
      newTab ? window.open(url, "_blank") : window.open(url, "_self");
    }
    contextMenu.style.display = "none";
  }

  function openIncognito(index) {
    if (index < 0 || index >= launcherLinks.length) return;
    const url = launcherLinks[index].url;
    if (chrome?.windows) { chrome.windows.create({ url: url, incognito: true }); }
    else { alert("Incognito mode is only supported in the Chrome extension environment."); }
    contextMenu.style.display = "none";
  }

  function openModal(edit = false) {
    popupBox.style.display = "flex";
    if (edit && editingIndex !== null) {
      const link = launcherLinks[editingIndex];
      linkTitleInput.value = link.name;
      linkUrlInput.value = link.url;
      linkIconUrlInput.value = link.icon && link.icon.startsWith('http') ? link.icon : '';
    } else {
      linkTitleInput.value = "";
      linkUrlInput.value = "";
      linkIconUrlInput.value = "";
      editingIndex = null;
    }
    linkIconFileInput.value = '';
    linkTitleInput.focus();
  }

  function closeModal() { popupBox.style.display = "none"; }

  saveBtn.addEventListener("click", () => {
    const name = linkTitleInput.value.trim();
    let url = linkUrlInput.value.trim();
    const iconUrl = linkIconUrlInput.value.trim();
    const iconFile = linkIconFileInput.files[0];
    if (!name || !url) { alert("Please fill in both the Name and URL fields."); return; }
    const urlWithScheme = /^https?:\/\//i.test(url) ? url : "https://" + url;
    try { new URL(urlWithScheme); } catch (err) { alert("Invalid URL format."); return; }
    const saveLink = (iconData = null) => {
      const fallback = generateFallback(name);
      const newLink = { name, url: urlWithScheme, fallback, icon: iconData || iconUrl || null };
      if (editingIndex !== null) { launcherLinks[editingIndex] = newLink; }
      else { launcherLinks.push(newLink); }
      editingIndex = null;
      renderGrid();
      closeModal();
    };
    if (iconFile) { const reader = new FileReader(); reader.onload = e => saveLink(e.target.result); reader.readAsDataURL(iconFile); }
    else { saveLink(); }
  });

  cancelBtn.addEventListener("click", closeModal);

  searchBar.addEventListener('input', e => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredLinks = launcherLinks.filter(link => link.name.toLowerCase().includes(searchTerm));
    renderGrid(filteredLinks);
  });

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  });

  function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') { document.body.classList.add('dark-theme'); }
    else { document.body.classList.remove('dark-theme'); }
  }

  addBtn.onclick = () => openModal(false);

  exportBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(launcherLinks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "launcherLinks.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  importBtn.onclick = () => importFile.click();
  
  resetBtn.onclick = () => {
    if (confirm("Are you sure you want to reset all shortcuts to the default list? This cannot be undone.")) {
        if (storage) {
            storage.remove("launcherLinks", () => { window.location.reload(); });
        } else {
            localStorage.removeItem("launcherLinks");
            window.location.reload();
        }
    }
  };

  importFile.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const importedLinks = JSON.parse(ev.target.result);
        if (Array.isArray(importedLinks)) { launcherLinks = importedLinks; renderGrid(); }
        else { alert('Invalid file format.'); }
      } catch (error) { alert('Could not parse the file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  infoBtn.onclick = () => { infoDialog.style.display = 'flex' };
  infoCloseBtn.onclick = () => { infoDialog.style.display = 'none' };

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) { e.preventDefault(); searchBar.focus(); }
    if (e.key === 'Escape') { closeModal(); deleteConfirmBox.style.display = 'none'; infoDialog.style.display = 'none'; }
  });

  if (chrome?.commands) {
      chrome.commands.onCommand.addListener((command) => {
          if (command === "add-new-link") {
              openModal(false);
          }
      });
  }

  applyTheme();
  loadLauncherLinks();
})();