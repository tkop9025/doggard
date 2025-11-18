// URL of your published Sheet as CSV
const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQwEvws-k4zNJGkK7H8KtUIbcpNCYjUKYcaDTl4td5VisYupSKMxtK1_tmbiH8gPA2NgVGwDfSVamAz/pub?output=csv';

// Global puzzles map: { "YYYY-MM-DD": { url, title, source } }
let PUZZLES = {};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Track what month we're showing
let currentYear;
let currentMonth; // 0–11

// -------- CSV loader --------

async function loadPuzzlesFromSheet() {
  const res = await fetch(SHEET_CSV_URL);
  const text = await res.text();
  console.log('CSV text preview:', text.slice(0, 200));

  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    return {};
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const puzzles = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing: assumes no commas inside fields
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] || '').trim();
    });

    const date = row.date;
    if (!date) continue;

    // active column optional; default to true
    const active = (row.active || 'TRUE').toLowerCase();
    if (active === 'false' || active === '0') continue;

    puzzles[date] = {
      url: row.url,
      title: row.title,
      source: row.source,
    };
  }

  return puzzles;
}

// -------- Calendar helpers --------

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

function buildCalendar(year, month) {
  const titleEl = document.getElementById('calendarTitle');
  const subtitleEl = document.getElementById('calendarSubtitle');
  const grid = document.getElementById('calendarGrid');
  const status = document.getElementById('calendarStatus');

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const monthName = firstDay.toLocaleString('default', { month: 'long' });
  if (titleEl) {
    titleEl.textContent = `Puzzle Calendar — ${monthName} ${year}`;
  }
  if (subtitleEl) {
    subtitleEl.textContent = 'Click a highlighted day to open the puzzle.';
  }

  grid.innerHTML = '';

  // Weekday headers
  WEEKDAY_LABELS.forEach((label, idx) => {
    const div = document.createElement('div');
    div.className = 'calendar-weekday';
    if (idx === 0 || idx === 6) {
      div.classList.add('calendar-weekday--weekend');
    }
    div.textContent = label;
    grid.appendChild(div);
  });

  const today = new Date();
  const todayKey = formatDateKey(today);

  // Empty cells before first day
  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day calendar-day--empty';
    grid.appendChild(empty);
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = formatDateKey(date);

    const cell = document.createElement('div');
    cell.className = 'calendar-day';

    // mark weekends for styling
    if (date.getDay() === 0 || date.getDay() === 6) {
      cell.classList.add('calendar-day--weekend');
    }

    const number = document.createElement('div');
    number.className = 'calendar-day-number';
    number.textContent = day;

    const label = document.createElement('div');
    label.className = 'calendar-day-label';

    const puzzle = PUZZLES[key];

    if (puzzle && puzzle.url) {
      cell.classList.add('calendar-day--has-puzzle');
      label.textContent = puzzle.title || 'Puzzle available';

      // Add small "Puzzle" pill in the corner
      const pill = document.createElement('div');
      pill.className = 'calendar-day-pill';
      pill.textContent = 'Puzzle';
      cell.appendChild(pill);

      cell.addEventListener('click', () => {
        window.open(puzzle.url, '_blank', 'noopener');
      });

      cell.addEventListener('mouseenter', () => {
        if (status) {
          status.textContent =
            `${key}: ${puzzle.title || 'Puzzle'} (${puzzle.source || 'Unknown source'})`;
        }
      });
    } else {
      cell.classList.add('calendar-day--no-puzzle');
      label.textContent = 'No puzzle';

      cell.addEventListener('mouseenter', () => {
        if (status) status.textContent = `${key}: no puzzle recorded.`;
      });
    }

    if (key === todayKey) {
      cell.classList.add('calendar-day--today');
    }

    cell.appendChild(number);
    cell.appendChild(label);
    grid.appendChild(cell);
  }

  // Reset status when leaving grid
  grid.onmouseleave = () => {
    if (status) status.textContent = 'Hover a day to see puzzle status.';
  };
}

// Change currentYear/currentMonth by ±1 and rebuild
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

// -------- Initialize on page load --------

document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('calendarStatus');
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => changeMonth(-1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => changeMonth(1));
  }

  try {
    if (status) status.textContent = 'Loading puzzles from server…';
    PUZZLES = await loadPuzzlesFromSheet();
    buildCalendar(currentYear, currentMonth);
    if (status) status.textContent = 'Hover a day to see puzzle status.';
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Failed to load puzzles from server.';
  }
});
