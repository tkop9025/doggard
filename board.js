const BOARD_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1P5ciYvu7D1KiJxGgAVgVHVYfoj_aicjiCVASuEm_SQw/export?format=csv&gid=1812346023";

async function loadBoardUrl() {
  const res = await fetch(BOARD_CSV_URL);
  const text = await res.text();
  console.log("Board CSV raw:", JSON.stringify(text));

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) {
    throw new Error("No URL found in board sheet");
  }

  const firstLine = lines[0];
  const firstCell = firstLine.split(",")[0].trim();

  if (!firstCell) {
    throw new Error("First cell is empty");
  }

  return firstCell;
}

document.addEventListener("DOMContentLoaded", async () => {
  const imgEl = document.getElementById("boardImage");
  if (!imgEl) return;

  try {
    const url = await loadBoardUrl();
    imgEl.src = url;
  } catch (err) {
    console.error(err);
  }
});
