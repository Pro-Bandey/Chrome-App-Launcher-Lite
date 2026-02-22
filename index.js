let products = [];
let currentProduct = null;
let editingProduct = null;

/* Load products with localStorage first */
if (localStorage.getItem("products")) {
  try {
    const saved = JSON.parse(localStorage.getItem("products"));
    if (saved && saved.length > 0) {
      products = saved;
      renderGrid();
    } else {
      fetchProducts();
    }
  } catch {
    fetchProducts();
  }
} else {
  fetchProducts();
}

function fetchProducts() {
  fetch("products.json")
    .then(res => res.json())
    .then(data => {
      products = data;
      renderGrid();
    });
}

/* Random color generator for fallback and his background */
function getRandomColor() {
  const hue = Math.floor(Math.random() * (255));
  const saturation = Math.floor(Math.random() * (255));
  const lightness = Math.floor(Math.random() * (255));
  return `rgb(${hue}, ${saturation}, ${lightness})`;
}
/* Random color generator with decided colors for fallback and his background */
/*
function getRandomColor() {
  const colors = [
    "#FF5733", "#33FF57", "#ff57FF",
    "#FFC300", "#9B59B6", "#FF6F61",
    "#00B812", "#000055", "#154671",
    "#fff8DB", "#E67E22", "#1ABC9C"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
*/

/* Generate fallback text */
function generateFallback(name) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase(); // Google Drive → GD
  }
  return name.substring(0, 3).toUpperCase(); // Photos → PHO
}

/* Render grid */
function renderGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  products.forEach(prod => {
    const card = document.createElement("div");
    card.className = "card";

    // Random colors for fallback
    const fallbackBg = getRandomColor();
    const fallbackTextColor = getRandomColor();

    card.innerHTML = `
      <div class="icon" style="background:${fallbackBg}; color:${fallbackTextColor};">${prod.fallback}</div>
      <div class="name">${prod.name}</div>
      <div class="menu-btn">⋮</div>
    `;

    // Open link on card click
    card.onclick = () => window.open(prod.url, "_self");

    // Context menu via right-click
    card.oncontextmenu = (e) => {
      e.preventDefault();
      currentProduct = prod;
      showContextMenu(e.pageX, e.pageY);
    };

    // Context menu via three-dots button
    card.querySelector(".menu-btn").onclick = (e) => {
      e.stopPropagation();
      currentProduct = prod;
      showContextMenu(e.pageX, e.pageY);
    };

    grid.appendChild(card);

    // Lazy load favicon after 2s
    setTimeout(() => {
      loadIcon(card, prod.url, prod.fallback, fallbackBg, fallbackTextColor);
    }, 2000);
  });

  // ✅ Save to localStorage only if products exist
  if (products.length > 0) {
    localStorage.setItem("products", JSON.stringify(products));
  }
}

/* Load favicon */
function loadIcon(card, url, fallback, fallbackBg, fallbackTextColor) {
  const icon = card.querySelector(".icon");
  const img = document.createElement("img");
  img.src = `https://www.google.com/s2/favicons?sz=64&domain=${url}`;

  img.onload = () => {
    icon.innerHTML = "";
    icon.style.background = "transparent"; // clear bg
    icon.style.color = "inherit";          // reset text color
    icon.appendChild(img);
  };

  img.onerror = () => {
    // Keep fallback with random styles
    icon.innerHTML = fallback.toUpperCase();
    icon.style.background = fallbackBg;
    icon.style.color = fallbackTextColor;
  };
}

/* Context menu */
const contextMenu = document.getElementById("contextMenu");
function showContextMenu(x, y) {
  contextMenu.style.display = "block"; // show first to measure size

  const menuWidth = contextMenu.offsetWidth;
  const pageWidth = window.innerWidth;

  // Adjust X so menu doesn't go off right edge
  if (x + menuWidth > pageWidth) {
    x = pageWidth - menuWidth - 5;
  }

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`; // keep natural height (can flow downward)
}
document.addEventListener("click", () => {
  contextMenu.style.display = "none";
});

/* Context menu actions */
contextMenu.addEventListener("click", (e) => {
  if (!currentProduct) return;
  const action = e.target.getAttribute("data-action");

  if (action === "open") {
    window.open(currentProduct.url, "_self");
  } else if (action === "newtab") {
    window.open(currentProduct.url, "_blank");
  } else if (action === "edit") {
    openModal(true);
  } else if (action === "delete") {
    products = products.filter(p => p !== currentProduct);
    renderGrid();
  }
});

/* Modal Controls */
function openModal(edit = false) {
  document.getElementById("addModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = edit ? "Edit Shortcut" : "Add Shortcut";

  if (edit && currentProduct) {
    document.getElementById("linkTitle").value = currentProduct.name;
    document.getElementById("linkURL").value = currentProduct.url.replace(/^https?:\/\//, "");
    editingProduct = currentProduct;
  } else {
    document.getElementById("linkTitle").value = "";
    document.getElementById("linkURL").value = "";
    editingProduct = null;
  }
}

function closeModal() {
  document.getElementById("addModal").style.display = "none";
}

function submitLink() {
  const name = document.getElementById("linkTitle").value.trim();
  const url = document.getElementById("linkURL").value.trim();

  if (!name || !url) return;

  if (editingProduct) {
    editingProduct.name = name;
    editingProduct.url = "https://" + url;
    editingProduct.fallback = generateFallback(name);
  } else {
    products.push({ name, url: "https://" + url, fallback: generateFallback(name) });
  }

  renderGrid();
  closeModal();
}

/* Add shortcut button */
document.getElementById("addBtn").onclick = () => openModal(false);

/* Export */
document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "products.json";
  a.click();
};

/* Import */
document.getElementById("importBtn").onclick = () => {
  document.getElementById("importFile").click();
};
document.getElementById("importFile").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    products = JSON.parse(ev.target.result);
    renderGrid();
  };
  reader.readAsText(file);
};