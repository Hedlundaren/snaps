import { fileURLToPath } from "node:url";
import path from "node:path";

// Projektets rot (mappen ovanför src/).
export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const templatesDir = path.join(rootDir, "templates");
export const bookletsDir = path.join(rootDir, "booklets");

export function bookletDir(name) {
  return path.join(bookletsDir, name);
}

export function songsDir(name) {
  return path.join(bookletDir(name), "songs");
}

export function imagesDir(name) {
  return path.join(bookletDir(name), "images");
}

export function outDir(name) {
  return path.join(bookletDir(name), "out");
}

// Gör en filnamnssäker "slug" av en titel.
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ta bort diakriter
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "namnlos";
}
