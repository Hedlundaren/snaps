import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Bygg <img>-tagg för en bild som ligger i häftets images/-mapp.
function imageTag(filename, className) {
  if (!filename) return "";
  const src = `../images/${encodeURIComponent(filename)}`;
  return `<img class="${className}" src="${src}" alt="" />`;
}

// Försättssidan.
export function renderCover(meta, pageNumber) {
  const title = escapeHtml(meta.titel || "Snapshäfte");
  const subtitle = meta.undertitel ? `<div class="cover-subtitle">${escapeHtml(meta.undertitel)}</div>` : "";
  const date = meta.datum ? `<div class="cover-date">${escapeHtml(meta.datum)}</div>` : "";
  const image = meta.omslagsbild ? imageTag(meta.omslagsbild, "cover-image") : "";
  return `
    <div class="page page--cover">
      <div class="cover-title">${title}</div>
      ${subtitle}
      ${date}
      ${image}
      <span class="page-number">${pageNumber}</span>
    </div>`;
}

// Ett visblock: den tecknade bilden i en kolumn bredvid texten. Bilden byter
// sida (vänster/höger) per visa via det globala indexet. Flera block kan
// staplas på samma sida.
export function renderSongBlock(song, index) {
  const side = index % 2 === 0 ? "right" : "left";
  const title = escapeHtml(song.titel || "");
  const melody = song.melodi ? `<div class="song-melody">${escapeHtml(song.melodi)}</div>` : "";
  const lyrics = marked.parse(song.body || "");
  const imageCol = song.bild
    ? `<div class="song-illustration-col">${imageTag(song.bild, "song-illustration")}</div>`
    : "";
  const text = `<div class="song-text"><h1 class="song-title">${title}</h1>${melody}<div class="song-lyrics">${lyrics}</div></div>`;
  const inner = side === "right" ? text + imageCol : imageCol + text;
  return `<div class="song-block img-${side}">${inner}</div>`;
}

// En medvetet tom sida (för utfyllnad till multipel av 4).
export function renderBlank() {
  return `<div class="page page--blank"></div>`;
}

// Rendera en sida (cover, en eller flera visor, eller blank) utifrån
// läsordningsnummer. `pages` är läsordningen; varje element är antingen
// {type:'cover',meta,number} eller {type:'songs',songs:[{song,index}],number}.
function renderPage(readingNumber, pages) {
  if (readingNumber === null) return renderBlank();
  const page = pages[readingNumber - 1];
  if (!page) return renderBlank();
  if (page.type === "cover") return renderCover(page.meta, readingNumber);
  const blocks = page.songs.map(({ song, index }) => renderSongBlock(song, index)).join('\n<div class="song-sep"></div>\n');
  return `
    <div class="page page--songs">
      ${blocks}
      <span class="page-number">${readingNumber}</span>
    </div>`;
}

/**
 * Bygg hela HTML-dokumentet.
 * @param {object} params
 * @param {object} params.meta        booklet.yaml-innehåll.
 * @param {Array}  params.pages       Läsordning: [{type:'cover'...}, {type:'songs'...}, ...].
 * @param {Array}  params.sheetSides  Från impositionOrder: [[vänster,höger], ...].
 * @param {string} params.css         CSS att bädda in.
 */
export function renderDocument({ meta, pages, sheetSides, css }) {
  const sheets = sheetSides
    .map(([left, right]) => {
      return `
    <div class="sheet">
      ${renderPage(left, pages)}
      ${renderPage(right, pages)}
    </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meta.titel || "Snapshäfte")}</title>
  <style>
${css}
  </style>
</head>
<body>
${sheets}
</body>
</html>`;
}
