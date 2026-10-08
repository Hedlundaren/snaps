import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import matter from "gray-matter";
import { templatesDir, bookletDir, songsDir, outDir } from "./paths.js";
import { impositionOrder } from "./imposition.js";
import { renderDocument, renderSongBlock } from "./render.js";

const bookletName = process.argv[2];
const skipPdf = process.argv.includes("--no-pdf");

if (!bookletName) {
  console.error("Användning: npm run build -- <häfte> [--no-pdf]");
  process.exit(1);
}

const dir = bookletDir(bookletName);
if (!fs.existsSync(dir)) {
  console.error(`Häftet "${bookletName}" finns inte.`);
  process.exit(1);
}

// --- Sidmått (A5-sida med 12 mm marginal) ---
const PX_PER_MM = 96 / 25.4;
const CONTENT_WIDTH_MM = 148.5 - 24; // 124.5 mm
const USABLE_HEIGHT_MM = 182; // 186 mm innehåll minus lite marginal för sidnummer
const GAP_MM = 8; // ungefärlig höjd på avdelaren mellan visor

// Läs metadata.
const metaPath = path.join(dir, "booklet.yaml");
let meta = {};
if (fs.existsSync(metaPath)) {
  meta = yaml.load(fs.readFileSync(metaPath, "utf8")) || {};
} else {
  console.warn(`Varning: ${metaPath} saknas – använder standardvärden.`);
}

// Läs sånger i filnamnsordning.
const songs = fs.existsSync(songsDir(bookletName))
  ? fs
      .readdirSync(songsDir(bookletName))
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((file) => {
        const raw = fs.readFileSync(path.join(songsDir(bookletName), file), "utf8");
        const parsed = matter(raw);
        return { ...parsed.data, body: parsed.content.trim(), _file: file };
      })
  : [];

if (songs.length === 0) {
  console.warn("Inga sånger hittades – häftet får bara en försättssida.");
}

// Bygg @font-face-regler med inbäddade (base64) woff2 så att både HTML och PDF
// blir självständiga och renderar rätt typsnitt utan nätverk.
function buildFontFaceCss() {
  const fontsDir = path.join(templatesDir, "fonts");
  const faces = [
    { family: "Playfair Display", weight: 700, style: "normal", file: "playfair-display-latin-700-normal.woff2" },
    { family: "Playfair Display", weight: 400, style: "normal", file: "playfair-display-latin-400-normal.woff2" },
    { family: "IM Fell English", weight: 400, style: "normal", file: "im-fell-english-latin-400-normal.woff2" },
    { family: "IM Fell English", weight: 400, style: "italic", file: "im-fell-english-latin-400-italic.woff2" },
  ];
  const rules = [];
  for (const f of faces) {
    const p = path.join(fontsDir, f.file);
    if (!fs.existsSync(p)) continue;
    const data = fs.readFileSync(p).toString("base64");
    rules.push(
      `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};font-display:swap;` +
        `src:url(data:font/woff2;base64,${data}) format("woff2");}`
    );
  }
  return rules.join("\n");
}

const css = buildFontFaceCss() + "\n" + fs.readFileSync(path.join(templatesDir, "booklet.css"), "utf8");

// Mät varje visblocks verkliga höjd (i px) genom att rendera dem i en
// osynlig prob-sida med Puppeteer. Bilderna måste ligga i out/ för att
// ../images ska lösas ut – därför skrivs proben där.
async function measureHeights(browser, songList) {
  const probePath = path.join(outDir(bookletName), "_measure.html");
  const blocks = songList
    .map((s, i) => `<div class="measure" style="width:${CONTENT_WIDTH_MM}mm">${renderSongBlock(s, i)}</div>`)
    .join("\n");
  const probe = `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"><style>
${css}
body{background:#fff;margin:0;padding:0;}
.measure{margin:0;padding:0;}
</style></head><body>${blocks}</body></html>`;
  fs.writeFileSync(probePath, probe);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(probePath).href, { waitUntil: "networkidle0" });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  const heights = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".measure")).map((el) => el.getBoundingClientRect().height)
  );
  await page.close();
  fs.rmSync(probePath, { force: true });
  return heights;
}

// Grov uppskattning om Puppeteer inte är tillgängligt (fallback).
function estimateHeights(songList) {
  return songList.map((s) => {
    const lines = (s.body || "").split(/\n/);
    let textPx = 34 + (s.melodi ? 18 : 0);
    for (const l of lines) textPx += l.trim() === "" ? 10 : 22;
    textPx += 12;
    const imgPx = s.bild ? 46 * PX_PER_MM : 0;
    return Math.max(textPx, imgPx);
  });
}

// Packa visorna på sidor: fyll en sida tills nästa visa inte får plats.
function packSongs(songList, heightsPx) {
  const usable = USABLE_HEIGHT_MM * PX_PER_MM;
  const gap = GAP_MM * PX_PER_MM;
  const out = [];
  let cur = [];
  let used = 0;
  songList.forEach((song, i) => {
    const h = heightsPx[i] || 0;
    const add = (cur.length ? gap : 0) + h;
    if (cur.length && used + add > usable) {
      out.push(cur);
      cur = [];
      used = 0;
    }
    used += (cur.length ? gap : 0) + h;
    cur.push({ song, index: i });
  });
  if (cur.length) out.push(cur);
  return out;
}

fs.mkdirSync(outDir(bookletName), { recursive: true });

// Starta Puppeteer (används både för mätning och PDF). Faller tillbaka på
// uppskattade höjder om det inte går att starta.
let browser = null;
let heights;
if (songs.length > 0) {
  try {
    const { default: puppeteer } = await import("puppeteer");
    browser = await puppeteer.launch({ headless: true });
    heights = await measureHeights(browser, songs);
  } catch (err) {
    console.warn("Kunde inte mäta med Puppeteer, använder uppskattning:", err.message);
    heights = estimateHeights(songs);
  }
} else {
  heights = [];
}

const songPages = packSongs(songs, heights);

// Läsordning: försättssida först, sedan de packade vissidorna.
const pages = [{ type: "cover", meta }, ...songPages.map((songsOnPage) => ({ type: "songs", songs: songsOnPage }))];

const { sheetSides, paddedCount } = impositionOrder(pages.length);
const html = renderDocument({ meta, pages, sheetSides, css });

const htmlPath = path.join(outDir(bookletName), "booklet.html");
fs.writeFileSync(htmlPath, html);

console.log(
  `Byggde ${songs.length} visor på ${pages.length} sidor (utfyllt till ${paddedCount} för häftesvikning).`
);
console.log(`HTML: ${path.relative(process.cwd(), htmlPath)}`);

// Rendera PDF med Puppeteer (om inte --no-pdf).
if (!skipPdf) {
  try {
    if (!browser) {
      const { default: puppeteer } = await import("puppeteer");
      browser = await puppeteer.launch({ headless: true });
    }
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
    const pdfPath = path.join(outDir(bookletName), "booklet.pdf");
    await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true });
    await page.close();
    console.log(`PDF:  ${path.relative(process.cwd(), pdfPath)}`);
  } catch (err) {
    console.error("Kunde inte skapa PDF:", err.message);
    console.error("HTML:en är klar – du kan skriva ut den från webbläsaren (liggande A4) istället.");
    console.error("Kör med --no-pdf för att hoppa över PDF-steget.");
  }
} else {
  console.log("Hoppar över PDF (--no-pdf).");
}

if (browser) await browser.close();
