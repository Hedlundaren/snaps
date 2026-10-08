import fs from "node:fs";
import path from "node:path";
import { templatesDir, bookletDir, songsDir, slugify } from "./paths.js";

const bookletName = process.argv[2];
const title = process.argv[3];

if (!bookletName || !title) {
  console.error('Användning: npm run add -- <häfte> "<sångtitel>"');
  console.error('Exempel:    npm run add -- julbord-2026 "Helan går"');
  process.exit(1);
}

const dir = bookletDir(bookletName);
if (!fs.existsSync(dir)) {
  console.error(`Häftet "${bookletName}" finns inte. Skapa det först med: npm run new -- ${bookletName}`);
  process.exit(1);
}

const songs = songsDir(bookletName);
fs.mkdirSync(songs, { recursive: true });

// Nästa löpnummer baserat på befintliga filer.
const existing = fs
  .readdirSync(songs)
  .filter((f) => f.endsWith(".md"))
  .map((f) => parseInt(f.slice(0, 2), 10))
  .filter((n) => Number.isFinite(n));
const next = (existing.length ? Math.max(...existing) : 0) + 1;
const num = String(next).padStart(2, "0");

const filename = `${num}-${slugify(title)}.md`;
const filepath = path.join(songs, filename);

// Använd mallen men sätt titeln.
const template = fs.readFileSync(path.join(templatesDir, "song.md"), "utf8");
const content = template.replace(/^titel:.*$/m, `titel: ${title}`);
fs.writeFileSync(filepath, content);

console.log(`La till sång ${num}: ${title}`);
console.log(`  Redigera: booklets/${bookletName}/songs/${filename}`);
