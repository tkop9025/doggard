const BASE_SHEET_ID = "1P5ciYvu7D1KiJxGgAVgVHVYfoj_aicjiCVASuEm_SQw";

// gid=0  -> inventories
const INVENTORY_CSV_URL = `https://docs.google.com/spreadsheets/d/${BASE_SHEET_ID}/export?format=csv&gid=0`;

// gid=1896699616 -> items
const ITEMS_CSV_URL = `https://docs.google.com/spreadsheets/d/${BASE_SHEET_ID}/export?format=csv&gid=1896699616`;

// gid=68572419 -> spaces
const SPACES_CSV_URL = `https://docs.google.com/spreadsheets/d/${BASE_SHEET_ID}/export?format=csv&gid=68572419`;

// ---------------- CSV helper ----------------

async function fetchCsv(url) {
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",");
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

// ---------------- Inventory (per-player cards) ----------------

// headers:  Item, Aidan, Chris, ...
function parseInventoryCsv(text) {
  console.log("Inventory CSV raw preview:", text.slice(0, 200));

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    console.warn("Inventory CSV: not enough lines");
    return { players: [], itemsByPlayer: {} };
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  if (headers.length < 2) {
    console.warn("Inventory CSV: need at least 2 headers (item + 1 player)");
    return { players: [], itemsByPlayer: {} };
  }

  // First header is item name; rest are player names
  const players = headers.slice(1);

  const itemsByPlayer = {};
  players.forEach((name) => {
    if (name) itemsByPlayer[name] = [];
  });

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (!cols.length) continue;

    const itemName = (cols[0] || "").trim();
    if (!itemName) continue;

    for (let colIdx = 1; colIdx < headers.length; colIdx++) {
      const player = players[colIdx - 1];
      if (!player) continue;

      const cell = (cols[colIdx] || "").trim();
      if (!cell) continue;

      const qty = Number(cell);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      if (!itemsByPlayer[player]) itemsByPlayer[player] = [];
      itemsByPlayer[player].push({ item: itemName, qty });
    }
  }

  console.log("Parsed inventory:", { players, itemsByPlayer });
  return { players, itemsByPlayer };
}

async function loadInventory() {
  const grid = document.getElementById("inventoryGrid");
  const subtitle = document.getElementById("inventorySubtitle"); // optional

  if (!grid) {
    console.error("inventoryGrid element not found");
    return;
  }

  try {
    if (subtitle) {
      subtitle.textContent = "Loading items from spreadsheet…";
    }

    const res = await fetch(INVENTORY_CSV_URL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while fetching inventory CSV`);
    }

    const text = await res.text();
    const { players, itemsByPlayer } = parseInventoryCsv(text);

    if (subtitle) subtitle.textContent = "";

    if (!players.length) {
      grid.textContent = "No inventory data found.";
      return;
    }

    grid.innerHTML = "";

    players.forEach((player) => {
      if (!player) return;

      const card = document.createElement("div");
      card.className = "inventory-card";

      const header = document.createElement("div");
      header.className = "inventory-card-header";
      header.textContent = player;

      const body = document.createElement("div");
      body.className = "inventory-card-body";

      const items = itemsByPlayer[player] || [];
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "inventory-empty";
        empty.textContent = "No items yet.";
        body.appendChild(empty);
      } else {
        const ul = document.createElement("ul");
        ul.className = "inventory-items";

        items.forEach(({ item, qty }) => {
          const li = document.createElement("li");
          li.className = "inventory-item";

          const nameSpan = document.createElement("span");
          nameSpan.className = "inventory-item-name";
          nameSpan.textContent = item;

          const qtySpan = document.createElement("span");
          qtySpan.className = "inventory-item-qty";
          qtySpan.textContent = `×${qty}`;

          li.appendChild(nameSpan);
          li.appendChild(qtySpan);
          ul.appendChild(li);
        });

        body.appendChild(ul);
      }

      card.appendChild(header);
      card.appendChild(body);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Inventory load error:", err);
    if (subtitle) {
      subtitle.textContent = "Failed to load inventory from spreadsheet.";
    }
    if (!grid.textContent) {
      grid.textContent = "Error loading inventory.";
    }
  }
}

async function loadItemsPanel() {
  const container = document.getElementById("itemsList");
  if (!container) return;

  try {
    const rows = await fetchCsv(ITEMS_CSV_URL);
    if (!rows.length) {
      container.textContent = "No items recorded.";
      return;
    }

    // Figure out which header is "Name" and which is "Effect"
    const headers = Object.keys(rows[0]);
    const nameKey = headers.find((h) => /^name$/i.test(h)) || headers[0];
    const effectKey =
      headers.find((h) => /^effect$/i.test(h)) || headers[1] || headers[0];

    const ul = document.createElement("ul");
    ul.className = "inv-list";

    rows.forEach((row) => {
      const li = document.createElement("li");
      li.className = "inv-list-item";

      const name = document.createElement("div");
      name.className = "inv-list-name";
      name.textContent = row[nameKey] || "(unnamed item)";

      const effectText = (row[effectKey] || "").trim();
      if (effectText) {
        const effect = document.createElement("div");
        effect.className = "inv-list-meta";
        effect.textContent = effectText;
        li.appendChild(name);
        li.appendChild(effect);
      } else {
        li.appendChild(name);
      }

      ul.appendChild(li);
    });

    container.innerHTML = "";
    container.appendChild(ul);
  } catch (err) {
    console.error("Failed to load items", err);
    container.textContent = "Failed to load items.";
  }
}

async function loadSpacesPanel() {
  const container = document.getElementById("spacesList");
  if (!container) return;

  try {
    const rows = await fetchCsv(SPACES_CSV_URL);
    if (!rows.length) {
      container.textContent = "No spaces recorded.";
      return;
    }

    // Detect Name / Type / Effect keys regardless of capitalization
    const headers = Object.keys(rows[0]);
    const nameKey = headers.find((h) => /^name$/i.test(h)) || headers[0];
    const typeKey = headers.find((h) => /^type$/i.test(h)) || null;
    const effectKey = headers.find((h) => /^effect$/i.test(h)) || null;

    const ul = document.createElement("ul");
    ul.className = "inv-list";

    rows.forEach((row) => {
      const li = document.createElement("li");
      li.className = "inv-list-item";

      const name = document.createElement("div");
      name.className = "inv-list-name";
      name.textContent = row[nameKey] || "(unnamed space)";

      const meta = document.createElement("div");
      meta.className = "inv-list-meta";

      const typeText = typeKey ? (row[typeKey] || "").trim() : "";
      if (typeText) {
        const pill = document.createElement("span");
        pill.className = "inv-list-type-pill";
        pill.textContent = typeText;
        meta.appendChild(pill);
      }

      const effectText = effectKey ? (row[effectKey] || "").trim() : "";
      if (effectText) {
        const span = document.createElement("span");
        span.textContent = effectText;
        meta.appendChild(span);
      }

      li.appendChild(name);
      if (meta.textContent || meta.children.length) {
        li.appendChild(meta);
      }
      ul.appendChild(li);
    });

    container.innerHTML = "";
    container.appendChild(ul);
  } catch (err) {
    console.error("Failed to load spaces", err);
    container.textContent = "Failed to load spaces.";
  }
}

// ---------------- Boot ----------------

document.addEventListener("DOMContentLoaded", () => {
  loadInventory();
  loadItemsPanel();
  loadSpacesPanel();
});
