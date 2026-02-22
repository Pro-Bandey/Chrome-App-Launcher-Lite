(function () {
  // ===== Variables =====
  let launcherLinks = [];
  let currentIndex = null;
  let editingIndex = null;
  let deletingIndex = null;
  let contextMenuElement = null;

  // Elements (launcher.js IDs)
  const grid = document.getElementById("cal-link-grid");
  const contextMenu = document.getElementById("cal-contextMenu");
  const addBtn = document.getElementById("cal-add-btn");
  const exportBtn = document.getElementById("cal-export-btn");
  const importBtn = document.getElementById("cal-import-btn");
  const importFile = document.getElementById("cal-import-file");
  const popupBox = document.getElementById("cal-popupBox");
  const boxTitle = document.getElementById("cal-box-Tittle");
  const linkTitleInput = document.getElementById("cal-link-Tittle");
  const linkUrlInput = document.getElementById("cal-link-Url");
  const saveBtn = document.getElementById("cal-save-btn");
  const cancelBtn = document.getElementById("cal-cancel-btn");

  // Delete confirmation
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

  // ===== Utilities =====
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

  function saveLauncherLinks() {
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ launcherLinks });
    } else {
      localStorage.setItem("launcherLinks", JSON.stringify(launcherLinks));
    }
  }

  function loadLauncherLinks() {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(["launcherLinks"], res => {
        launcherLinks = res.launcherLinks && res.launcherLinks.length ? res.launcherLinks : getDefaultLinks();
        renderGrid();
      });
    } else {
      const saved = localStorage.getItem("launcherLinks");
      launcherLinks = saved ? JSON.parse(saved) : getDefaultLinks();
      renderGrid();
    }
  }

  function getDefaultLinks() {
    return [
      // ===== GOOGLE =====
      { name: "Google Search", url: "https://www.google.com", fallback: "GS" },
      { name: "Gmail", url: "https://mail.google.com", fallback: "GMA" },
      { name: "Google Drive", url: "https://drive.google.com", fallback: "GD" },
      { name: "Google Docs", url: "https://docs.google.com", fallback: "DOC" },
      { name: "Google Sheets", url: "https://sheets.google.com", fallback: "SHT" },
      { name: "Google Slides", url: "https://slides.google.com", fallback: "SLD" },
      { name: "Google Photos", url: "https://photos.google.com", fallback: "PHO" },
      { name: "Google Maps", url: "https://maps.google.com", fallback: "MAP" },
      { name: "Google Calendar", url: "https://calendar.google.com", fallback: "CAL" },
      { name: "Google Meet", url: "https://meet.google.com", fallback: "MET" },
      { name: "Google Chat", url: "https://chat.google.com", fallback: "CHA" },
      { name: "Google Keep", url: "https://keep.google.com", fallback: "KEP" },
      { name: "Google Contacts", url: "https://contacts.google.com", fallback: "CON" },
      { name: "Google Translate", url: "https://translate.google.com", fallback: "TRA" },
      { name: "YouTube", url: "https://www.youtube.com", fallback: "YT" },

      // ===== SOCIAL =====
      { name: "Facebook", url: "https://www.facebook.com", fallback: "FB" },
      { name: "Instagram", url: "https://www.instagram.com", fallback: "IG" },
      { name: "Twitter / X", url: "https://x.com", fallback: "X" },
      { name: "LinkedIn", url: "https://www.linkedin.com", fallback: "IN" },
      { name: "Reddit", url: "https://www.reddit.com", fallback: "RD" },
      { name: "Pinterest", url: "https://www.pinterest.com", fallback: "PIN" },
      { name: "Snapchat", url: "https://www.snapchat.com", fallback: "SNP" },
      { name: "Discord", url: "https://discord.com", fallback: "DIS" },
      { name: "Telegram Web", url: "https://web.telegram.org", fallback: "TEL" },
      { name: "WhatsApp Web", url: "https://web.whatsapp.com", fallback: "WA" },

      // ===== AI & DEV =====
      { name: "ChatGPT", url: "https://chat.openai.com", fallback: "GPT" },
      { name: "GitHub", url: "https://github.com", fallback: "GH" },
      { name: "Stack Overflow", url: "https://stackoverflow.com", fallback: "SO" },
      { name: "CodePen", url: "https://codepen.io", fallback: "CP" },
      { name: "JSFiddle", url: "https://jsfiddle.net", fallback: "JS" },
      { name: "Replit", url: "https://replit.com", fallback: "REP" },
      { name: "Vercel", url: "https://vercel.com", fallback: "VER" },
      { name: "Netlify", url: "https://www.netlify.com", fallback: "NET" },

      // ===== PRODUCTIVITY =====
      { name: "Notion", url: "https://www.notion.so", fallback: "NOT" },
      { name: "Trello", url: "https://trello.com", fallback: "TRL" },
      { name: "Asana", url: "https://asana.com", fallback: "ASA" },
      { name: "Slack", url: "https://slack.com", fallback: "SLK" },
      { name: "Zoom", url: "https://zoom.us", fallback: "ZOM" },
      { name: "Canva", url: "https://www.canva.com", fallback: "CAN" },
      { name: "Dropbox", url: "https://www.dropbox.com", fallback: "DB" },

      // ===== SHOPPING =====
      { name: "Amazon", url: "https://www.amazon.com", fallback: "AMZ" },
      { name: "eBay", url: "https://www.ebay.com", fallback: "EBY" },
      { name: "Flipkart", url: "https://www.flipkart.com", fallback: "FLP" },
      { name: "AliExpress", url: "https://www.aliexpress.com", fallback: "ALI" },
      { name: "Etsy", url: "https://www.etsy.com", fallback: "ETS" },

      // ===== ENTERTAINMENT =====
      { name: "Netflix", url: "https://www.netflix.com", fallback: "NFL" },
      { name: "Amazon Prime Video", url: "https://www.primevideo.com", fallback: "PRM" },
      { name: "Disney+", url: "https://www.disneyplus.com", fallback: "DIS" },
      { name: "Spotify", url: "https://open.spotify.com", fallback: "SPT" },
      { name: "SoundCloud", url: "https://soundcloud.com", fallback: "SND" },
      { name: "Twitch", url: "https://www.twitch.tv", fallback: "TWT" },

      // ===== NEWS =====
      { name: "BBC News", url: "https://www.bbc.com/news", fallback: "BBC" },
      { name: "CNN", url: "https://www.cnn.com", fallback: "CNN" },
      { name: "The Guardian", url: "https://www.theguardian.com", fallback: "GDN" },
      { name: "New York Times", url: "https://www.nytimes.com", fallback: "NYT" },
      { name: "Google News", url: "https://news.google.com", fallback: "GNS" },

      // ===== LEARNING =====
      { name: "Wikipedia", url: "https://www.wikipedia.org", fallback: "WIK" },
      { name: "Coursera", url: "https://www.coursera.org", fallback: "CRS" },
      { name: "Udemy", url: "https://www.udemy.com", fallback: "UDE" },
      { name: "Khan Academy", url: "https://www.khanacademy.org", fallback: "KHN" },
      { name: "Medium", url: "https://medium.com", fallback: "MED" },

      // ===== TOOLS =====
      { name: "Speedtest", url: "https://www.speedtest.net", fallback: "SPD" },
      { name: "TinyPNG", url: "https://tinypng.com", fallback: "PNG" },
      { name: "Remove.bg", url: "https://www.remove.bg", fallback: "RBG" },
      { name: "PDF24 Tools", url: "https://tools.pdf24.org", fallback: "PDF" },
      { name: "ILovePDF", url: "https://www.ilovepdf.com", fallback: "ILP" }

    ];
  }
  // ===== Grid Rendering =====
  function renderGrid() {
    grid.innerHTML = "";
    launcherLinks.forEach((link, idx) => {
      const card = document.createElement("div");
      card.className = "card";
      card.title = link.name;
      const fallback = link.fallback || generateFallback(link.name);
      const bg = getRandomColor();
      const color = "#fff";

      card.innerHTML = `
        <div class="icon" style="background:${bg};color:${color};">${fallback}</div>
        <div class="name">${link.name}</div>
        <div class="menu-btn">⋮</div>
      `;

      // Left-click: open link
      card.addEventListener("click", e => {
        if (!e.target.classList.contains("menu-btn")) openLink(idx, false);
      });

      // Right-click: context menu
      card.addEventListener("contextmenu", e => {
        e.preventDefault();
        currentIndex = idx;
        showContextMenu(e.pageX, e.pageY);
      });

      // Menu button click
      card.querySelector(".menu-btn").addEventListener("click", e => {
        e.stopPropagation();
        currentIndex = idx;
        showContextMenu(e.pageX, e.pageY);
      });

      grid.appendChild(card);
      setTimeout(() => loadFavicon(card, link.url, fallback, bg, color), 100);
    });

    saveLauncherLinks();
  }

  function loadFavicon(card, url, fallback, bg, color) {
    const icon = card.querySelector(".icon");
    const hostname = new URL(url).hostname;
    const sources = [
      e => `https://www.google.com/s2/favicons?sz=64&domain=${e}`,
      e => `https://icons.duckduckgo.com/ip2/${e}.ico`,
      e => `https://logo.clearbit.com/${e}`
    ];
    let i = 0;
    function tryNext() {
      if (i >= sources.length) {
        icon.innerHTML = fallback;
        icon.style.background = bg;
        icon.style.color = color;
        return;
      }
      const img = document.createElement("img");
      img.src = sources[i](hostname);
      img.onload = () => { icon.innerHTML = ""; icon.style.background = "transparent"; icon.appendChild(img); };
      img.onerror = () => { i++; tryNext(); };
    }
    tryNext();
  }

  // ===== Context Menu =====
  function showContextMenu(x, y) {
    contextMenu.style.display = "block";
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
    else if (action === "cal-edit") {
      editingIndex = currentIndex;  // store exact item being edited
      openModal(true);
    }
    else if (action === "cal-delete") showDeleteConfirm(currentIndex);
  });

  // ===== Delete Confirmation =====
  function showDeleteConfirm(idx) {
    deletingIndex = idx;
    deleteConfirmBox.style.display = "block";
  }

  deleteConfirmBtn.addEventListener("click", () => {
    if (deletingIndex !== null) {
      launcherLinks.splice(deletingIndex, 1);
      renderGrid();
      deletingIndex = null;
    }
    deleteConfirmBox.style.display = "none";
  });

  deleteCancelBtn.addEventListener("click", () => {
    deletingIndex = null;
    deleteConfirmBox.style.display = "none";
  });

  // ===== Open Link =====
  function openLink(index, newTab = false) {
    if (index < 0 || index >= launcherLinks.length) return;
    const url = launcherLinks[index].url;
    if (chrome.tabs) {
      newTab ? chrome.tabs.create({ url }) : chrome.tabs.query({ active: true, currentWindow: true }, t => { chrome.tabs.update(t[0].id, { url }); });
    } else {
      newTab ? window.open(url, "_blank") : window.open(url, "_self");
    }
    contextMenu.style.display = "none";
  }
  function openIncognito(index) {
    if (index < 0 || index >= launcherLinks.length) return;

    const url = launcherLinks[index].url;

    if (chrome.windows) {
      chrome.windows.create({
        url: url,
        incognito: true
      });
    } else {
      alert("Incognito mode is only supported in Chrome extension environment.");
    }

    contextMenu.style.display = "none";
  }

  // ===== Modal =====
  function openModal(edit = false) {
    popupBox.style.display = "flex";

    if (edit && editingIndex !== null) {
      linkTitleInput.value = launcherLinks[editingIndex].name;
      linkUrlInput.value = launcherLinks[editingIndex].url.replace(/^https?:\/\//, "");
    } else {
      linkTitleInput.value = "";
      linkUrlInput.value = "";
      editingIndex = null;
    }

    linkTitleInput.focus();
  }



  function closeModal() { popupBox.style.display = "none"; }
  saveBtn.addEventListener("click", () => {
    const name = linkTitleInput.value.trim();
    let url = linkUrlInput.value.trim();
    if (!name || !url) {
      showCustomAlert("Please fill in both the Name and URL fields.");
      return;
    }
    const urlWithScheme = /^https?:\/\//i.test(url) ? url : "https://" + url;
    try {
      const parsed = new URL(urlWithScheme);
      if (!/^https?:$/i.test(parsed.protocol)) {
        showCustomAlert("Only http/https URLs are allowed.");
        return;
      }
      const normalizedUrl = parsed.href;
      const fallback = generateFallback(name);
      if (editingIndex !== null) {
        launcherLinks[editingIndex] = { name, url: normalizedUrl, fallback };
      } else {
        launcherLinks.push({ name, url: normalizedUrl, fallback });
      }
      editingIndex = null;
      renderGrid();
      closeModal();
    } catch (err) {
      showCustomAlert("Invalid URL format.");
      return;
    }
  });


  cancelBtn.addEventListener("click", closeModal);

  // ===== Buttons =====
  addBtn.onclick = () => openModal(false);
  exportBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(launcherLinks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "launcherLinks.json";
    a.click();
  };
  importBtn.onclick = () => importFile.click();
  importFile.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      launcherLinks = JSON.parse(ev.target.result);
      renderGrid();
    };
    reader.readAsText(file);
  };

  // ===== Load Immediately =====
  loadLauncherLinks();

})();

// Displays a custom alert box with a given message.
function showCustomAlert(message) {
  const overlay = document.getElementById("alert-overlay");
  const alertBox = document.getElementById("alert-box");
  const alertBoxMessage = document.getElementById("alert-box-message");
  const alertBoxOkBtn = document.getElementById("alert-box-ok-btn");

  alertBoxMessage.textContent = message;
  overlay.style.display = "block";
  alertBox.style.display = "block";

  alertBoxOkBtn.onclick = function () {
    overlay.style.display = "none";
    alertBox.style.display = "none";
  };
  overlay.onclick = function (event) {
    if (event.target === overlay) {
      overlay.style.display = "none";
      alertBox.style.display = "none";
    }
  };
};