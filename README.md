# snaps

Fil-baserad generator för snapshäften. Varje häfte är en mapp med sångtexter
(markdown) och bilder. Ett kommando renderar ett tryckfärdigt A5-häfte där
sidorna ordnas automatiskt (saddle-stitch-imposition) på liggande A4 som viks
på mitten, plus en HTML du kan skriva ut direkt från webbläsaren.

## Kom igång

```bash
npm install
```

`npm install` laddar även ner en Chromium som används för att skapa PDF.

## Arbetsflöde

1. **Skapa ett nytt häfte**

   ```bash
   npm run new -- "Julbord 2026"
   ```

   Skapar `booklets/julbord-2026/` med `booklet.yaml` och mapparna
   `songs/`, `images/` och `out/`.

2. **Lägg till sånger**

   ```bash
   npm run add -- julbord-2026 "Helan går"
   ```

   Skapar en numrerad markdown-fil i `songs/`. Numret i filnamnet styr
   ordningen i häftet.

3. **Skriv/redigera texten**

   Öppna filen i `booklets/<häfte>/songs/` och skriv sångtexten. Varje fil
   har en frontmatter-del överst:

   ```markdown
   ---
   titel: Helan går
   melodi: "Mel: Trad."
   bild: helan-gar.jpg
   ---

   Helan går,
   sjung hopp faderallan lallan lej...
   ```

   - Varje rad blir en egen rad i häftet. En tom rad ger ett stycke-mellanrum.
   - `*kursiv*` och `**fet**` fungerar (markdown).

4. **Lägg till bilder** (valfritt)

   Lägg bildfiler i `booklets/<häfte>/images/` och skriv filnamnet i sångens
   `bild:`-fält. Be gärna agenten hämta passande bilder från internet – de
   sparas i `images/` och länkas in automatiskt. Sånger utan bild fungerar
   också (bildytan lämnas då tom).

   Försättssidan kan ha en egen bild via `omslagsbild:` i `booklet.yaml`.

5. **Bygg häftet**

   ```bash
   npm run build -- julbord-2026
   ```

   Skapar:
   - `booklets/julbord-2026/out/booklet.html` – öppna och skriv ut (liggande A4).
   - `booklets/julbord-2026/out/booklet.pdf` – tryckfärdig PDF.

   Lägg till `--no-pdf` för att bara skapa HTML.

## Utskrift och vikning

- Skriv ut i **liggande A4**, **dubbelsidigt**.
- Häfta i mitten och vik till ett A5-häfte.
- Sidorna paddas till en multipel av 4 (tomma sidor läggs till vid behov) och
  ordnas så att läsordningen blir rätt efter vikning.
- Ställ in dubbelsidig utskrift på "vänd på långsidan" om baksidorna hamnar
  upp och ner; annars "vänd på kortsidan".

## Mappstruktur

```
booklets/<häfte>/
  booklet.yaml        # titel, undertitel, datum, omslagsbild
  songs/              # 01-...md, 02-...md ... (ordningen styrs av numret)
  images/             # bilder som refereras från sångerna
  out/                # genererad booklet.html + booklet.pdf
```

Ett färdigt exempel finns i `booklets/exempel/`.

## Anpassa utseendet

All layout och typografi styrs av `templates/booklet.css` (A5-sida,
A4-imposition, teckensnitt, bildstorlekar). Mallar för nya häften och sånger
finns i `templates/booklet.yaml` och `templates/song.md`.
