/**
 * Saddle-stitch-imposition för ett A5-häfte tryckt på liggande A4.
 *
 * Sidorna (i läsordning, 1-indexerade) paddas till en multipel av 4 med
 * tomma sidor och paras sedan ihop så att varje A4-ark, vikt på mitten och
 * häftat, ger rätt läsordning.
 *
 * För N sidor (multipel av 4) blir arkens sidor, framifrån:
 *   ark 1 fram:  [N,     1]
 *   ark 1 bak:   [2,     N-1]
 *   ark 2 fram:  [N-2,   3]
 *   ark 2 bak:   [4,     N-3]
 *   ...
 *
 * @param {number} pageCount Antal sidor i läsordning (före padding).
 * @returns {{ sheets: Array<{ front: [number|null, number|null], back: [number|null, number|null] }>, paddedCount: number }}
 *   Sidnummer är 1-indexerade läsordningsnummer, eller null för en tom sida.
 */
export function imposePages(pageCount) {
  const paddedCount = Math.ceil(pageCount / 4) * 4;

  // Hjälpare: returnera sidnummer om det finns i läsordningen, annars null (blank).
  const p = (n) => (n >= 1 && n <= pageCount ? n : null);

  const sheets = [];
  let left = 1;
  let right = paddedCount;

  // Varje varv i loopen fyller ett ark (fram- och baksida).
  while (left < right) {
    const front = [p(right), p(left)]; // t.ex. [N, 1]
    left += 1;
    right -= 1;
    const back = [p(left), p(right)]; // t.ex. [2, N-1]
    left += 1;
    right -= 1;
    sheets.push({ front, back });
  }

  return { sheets, paddedCount };
}

/**
 * Platta ut imposition till en sekvens av ark i utskriftsordning, där varje
 * ark är ett par [vänster, höger] med läsordningsnummer (eller null).
 *
 * Ordningen är: ark1 fram, ark1 bak, ark2 fram, ark2 bak, ...
 * vilket är korrekt för dubbelsidig utskrift ("vänd på kortsidan"-motsvarande
 * beroende på skrivare; se README).
 *
 * @param {number} pageCount
 * @returns {{ sheetSides: Array<[number|null, number|null]>, paddedCount: number }}
 */
export function impositionOrder(pageCount) {
  const { sheets, paddedCount } = imposePages(pageCount);
  const sheetSides = [];
  for (const sheet of sheets) {
    sheetSides.push(sheet.front);
    sheetSides.push(sheet.back);
  }
  return { sheetSides, paddedCount };
}
