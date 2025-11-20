const BOARD_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1P5ciYvu7D1KiJxGgAVgVHVYfoj_aicjiCVASuEm_SQw/export?format=csv&gid=1812346023";

async function loadBoardUrl() {
  const res = await fetch(BOARD_CSV_URL);
  const text = await res.text();
  console.log("Board CSV raw:", JSON.stringify(text));

  // Take the first non-empty line and first cell → treat it as URL
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) {
    throw new Error("No URL found in board sheet");
  }

  // If for some reason there are commas, just take the first cell
  const firstLine = lines[0];
  const firstCell = firstLine.split(",")[0].trim();

  if (!firstCell) {
    throw new Error("First cell is empty");
  }

  return firstCell;
}

document.addEventListener("DOMContentLoaded", async () => {
  const imgEl = document.getElementById("boardImage");
  const updatedEl = document.getElementById("boardUpdated");
  const noteEl = document.getElementById("boardNote");

  try {
    const url = await loadBoardUrl();

    imgEl.src = url;
    updatedEl.textContent = "Board loaded from Sheet.";
    noteEl.textContent =
      "Screenshot of the current game state. Zoom in with your browser if you need more detail.";
  } catch (err) {
    console.error(err);
    updatedEl.textContent = "Failed to load board image URL.";
    noteEl.textContent =
      "Make sure the board sheet has the image URL in the first cell.";
  }
});
