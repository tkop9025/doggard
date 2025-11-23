// --- CONFIG: inventory sheet as CSV (gid=0) ---
const INVENTORY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1P5ciYvu7D1KiJxGgAVgVHVYfoj_aicjiCVASuEm_SQw/export?format=csv&gid=0";

// --- CSV parsing helper ---
// Assumes: first row = headers: item, Player1, Player2, ...
//          subsequent rows: itemName, qtyForPlayer1, qtyForPlayer2, ...
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
    if (name) {
      itemsByPlayer[name] = [];
    }
  });

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (!cols.length) continue;

    const rawItemName = (cols[0] || "").trim();
    if (!rawItemName) continue;

    const itemName = rawItemName;

    for (let colIdx = 1; colIdx < headers.length; colIdx++) {
      const player = players[colIdx - 1];
      if (!player) continue; // skip blank header columns

      const cell = (cols[colIdx] || "").trim();
      if (!cell) continue;

      const qty = Number(cell);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      if (!itemsByPlayer[player]) {
        itemsByPlayer[player] = [];
      }
      itemsByPlayer[player].push({ item: itemName, qty });
    }
  }

  console.log("Parsed inventory:", { players, itemsByPlayer });
  return { players, itemsByPlayer };
}

// --- Main loader / renderer ---

async function loadInventory() {
  const grid = document.getElementById("inventoryGrid");
  const subtitle = document.getElementById("inventorySubtitle");

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

    if (subtitle) {
      subtitle.textContent = "";
    }

    if (!players.length) {
      grid.textContent = "No inventory data found.";
      return;
    }

    grid.innerHTML = "";

    players.forEach((player) => {
      if (!player) return; // skip empty header

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

document.addEventListener("DOMContentLoaded", loadInventory);
