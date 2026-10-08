import fs from "node:fs";
import path from "node:path";
import { templatesDir, bookletDir, songsDir, imagesDir, outDir, slugify } from "./paths.js";

const rawName = process.argv[2];

if (!rawName) {
  console.error("Användning: npm run new -- <häftesnamn>");
  console.error('Exempel:    npm run new -- "Julbord 2026"');
  process.exit(1);
}

const name = slugify(rawName);
const dir = bookletDir(name);

if (fs.existsSync(dir)) {
  console.error(`Häftet "${name}" finns redan (${dir}).`);
  process.exit(1);
}

fs.mkdirSync(songsDir(name), { recursive: true });
fs.mkdirSync(imagesDir(name), { recursive: true });
fs.mkdirSync(outDir(name), { recursive: true });

// Kopiera och förifyll booklet.yaml med titeln användaren angav.
const yamlTemplate = fs.readFileSync(path.join(templatesDir, "booklet.yaml"), "utf8");
const yaml = yamlTemplate.replace(/^titel:.*$/m, `titel: ${rawName}`);
fs.writeFileSync(path.join(dir, "booklet.yaml"), yaml);

console.log(`Skapade häftet "${name}" i booklets/${name}/`);
console.log("");
console.log("Nästa steg:");
console.log(`  1. Lägg till sånger:   npm run add -- ${name} "Helan går"`);
console.log(`  2. Redigera texten i:  booklets/${name}/songs/`);
console.log(`  3. Bygg häftet:        npm run build -- ${name}`);
