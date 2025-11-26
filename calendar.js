// URL of your published Sheet as CSV
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQwEvws-k4zNJGkK7H8KtUIbcpNCYjUKYcaDTl4td5VisYupSKMxtK1_tmbiH8gPA2NgVGwDfSVamAz/pub?output=csv";

// Global puzzles map: { "YYYY-MM-DD": { url, title, source } }
let PUZZLES = {};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Track what month we're showing
let currentYear;
let currentMonth; // 0–11

// ---------------------------------------------------------------------------
//  CSV PARSER THAT HANDLES MULTILINE QUOTED FIELDS
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch; // preserve newlines inside quotes
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          rows.push(row);
        }
        row = [];
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Load puzzles from Google Sheet (using the real CSV parser)
// ---------------------------------------------------------------------------
async function loadPuzzlesFromSheet() {
  const res = await fetch(SHEET_CSV_URL);
  const text = await res.text();
  console.log("CSV text preview:", text.slice(0, 200));

  const rows = parseCsv(text.trim());
  if (rows.length < 2) return {};

  const headers = rows[0].map((h) => h.trim());
  const puzzles = {};

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || !cols.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] || "").trim();
    });

    const date = row.date;
    if (!date) continue;

    const active = (row.active || "TRUE").toLowerCase();
    if (active === "false" || active === "0") continue;

    puzzles[date] = {
      url: row.url,
      title: row.title,
      source: row.source,
      star: row.star,
      scoring: row.scoring, // full multiline string preserved
    };
  }

  return puzzles;
}

// -------- Calendar helpers --------

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

function cleanScoring(text) {
  if (!text) return "";
  return text.replace(/^"+|"+$/g, "");
}

// ---------------------------------------------------------------------------
//  Build Calendar
// ---------------------------------------------------------------------------
function buildCalendar(year, month) {
  const titleEl = document.getElementById("calendarTitle");
  const subtitleEl = document.getElementById("calendarSubtitle");
  const grid = document.getElementById("calendarGrid");
  const status = document.getElementById("calendarStatus");

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const monthName = firstDay.toLocaleString("default", { month: "long" });
  if (titleEl) titleEl.textContent = `Puzzle Calendar — ${monthName} ${year}`;
  if (subtitleEl)
    subtitleEl.textContent = "Click a highlighted day to open the puzzle.";

  grid.innerHTML = "";

  // Weekday headers
  WEEKDAY_LABELS.forEach((label, idx) => {
    const div = document.createElement("div");
    div.className = "calendar-weekday";
    div.textContent = label;
    grid.appendChild(div);
  });

  const today = new Date();
  const todayKey = formatDateKey(today);

  // Empty cells before first day (non-interactive)
  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day calendar-day--empty";

    // make sure they don't respond to hover/click
    empty.style.pointerEvents = "none";
    empty.setAttribute("aria-hidden", "true");

    grid.appendChild(empty);
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = formatDateKey(date);

    const cell = document.createElement("div");
    cell.className = "calendar-day";

    const number = document.createElement("div");
    number.className = "calendar-day-number";
    number.textContent = day;

    const label = document.createElement("div");
    label.className = "calendar-day-label";

    const puzzle = PUZZLES[key];

    if (puzzle && puzzle.url) {
      cell.classList.add("calendar-day--has-puzzle");
      label.textContent = puzzle.title || "Puzzle available";

      if (puzzle.star != "") {
        const pill = document.createElement("div");
        pill.className = "calendar-day-pill";
        pill.textContent = "⭐";
        cell.appendChild(pill);
      }

      cell.addEventListener("click", () => {
        window.open(puzzle.url, "_blank", "noopener");
      });

      cell.addEventListener("mouseenter", () => {
        if (status) {
          const scoringClean = cleanScoring(puzzle.scoring);
          status.textContent =
            `${key}: ${puzzle.title || "Puzzle"} (${puzzle.source || "Unknown source"})\n` +
            scoringClean;
        }
      });
    } else {
      cell.classList.add("calendar-day--no-puzzle");
      label.textContent = "No puzzle";
      cell.addEventListener("mouseenter", () => {
        if (status) status.textContent = `${key}: no puzzle recorded.`;
      });
    }

    if (key === todayKey) {
      cell.classList.add("calendar-day--today");
    }

    cell.appendChild(number);
    cell.appendChild(label);
    grid.appendChild(cell);
  }

  grid.onmouseleave = () => {
    if (status) status.textContent = "Hover a day to see puzzle status.";
  };
}

// ---------------------------------------------------------------------------
//  Month navigation
// ---------------------------------------------------------------------------
function changeMonth(delta) {
  currentMonth += delta;

  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }

  buildCalendar(currentYear, currentMonth);
}

// ---------------------------------------------------------------------------
//  Initialize
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("calendarStatus");
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");

  if (prevBtn) prevBtn.addEventListener("click", () => changeMonth(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => changeMonth(1));

  try {
    if (status) status.textContent = "Loading puzzles from server…";
    PUZZLES = await loadPuzzlesFromSheet();
    buildCalendar(currentYear, currentMonth);
    if (status) status.textContent = "Hover a day to see puzzle status.";
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Failed to load puzzles from server.";
  }
});
