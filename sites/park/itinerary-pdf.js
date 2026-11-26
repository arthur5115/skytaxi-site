const PDF_FONT = "/assets/itinerary-tc.ttf";
const PDF_METRICS = "/assets/itinerary-tc.json";
const BRAND = "虎頭埤長壽生活園區";
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const WIDE = PAGE_WIDTH - MARGIN * 2;
const normalize = text => text.replace(/[‐‑–—]/g, "-");

function fontAdapter(metrics) {
  const glyphs = new Map(Object.entries(metrics.glyphs).map(([key, [id, advanceWidth]]) => {
    const code = Number(key);
    return [code, { id, advanceWidth, codePoints: [code] }];
  }));
  function glyphForCodePoint(code) {
    const glyph = glyphs.get(code);
    if (!glyph) throw new Error(`Missing PDF glyph: U+${code.toString(16)}`);
    return glyph;
  }
  return {
    create() {
      return {
        ...metrics.dimensions,
        postscriptName: "HutoupiItinerary",
        italicAngle: 0,
        post: { isFixedPitch: false },
        head: { macStyle: { italic: false } },
        cff: false,
        characterSet: [...glyphs.keys()],
        glyphForCodePoint,
        layout: text => ({ glyphs: Array.from(text, character => glyphForCodePoint(character.codePointAt(0))) }),
      };
    },
  };
}

export async function buildPdf(lib, fontBytes, metrics, report) {
  const { PDFDocument, rgb } = lib;
  const document = await PDFDocument.create();
  document.setTitle(`${BRAND}｜${report.title}`);
  document.setAuthor(BRAND);
  document.registerFontkit(fontAdapter(metrics));
  const font = await document.embedFont(fontBytes, { customName: "HutoupiItinerary" });
  const pine = rgb(.08, .19, .15);
  const muted = rgb(.24, .33, .28);
  const line = rgb(.83, .87, .82);
  const gold = rgb(.88, .79, .59);
  let page;
  let y;

  function draw(text, x, at, size, color = pine) {
    page.drawText(normalize(text), { x, y: at, size, color, font });
  }

  function wrap(text, size, maxWidth) {
    const lines = [];
    let current = "";
    for (const character of normalize(text)) {
      if (current && font.widthOfTextAtSize(current + character, size) > maxWidth) {
        lines.push(current);
        current = "";
      }
      current += character;
    }
    if (current) lines.push(current);
    return lines;
  }

  function paragraph(text, size, color, width = WIDE, x = MARGIN) {
    for (const row of wrap(text, size, width)) {
      if (y < 54) nextPage();
      draw(row, x, y, size, color);
      y -= size + 5;
    }
  }

  function nextPage(first = false) {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 7, width: PAGE_WIDTH, height: 7, color: pine });
    y = PAGE_HEIGHT - 48;
    draw(BRAND, MARGIN, y, 11);
    y -= 31;
    draw(first ? report.title : `${report.title}（續）`, MARGIN, y, first ? 23 : 17);
    y -= 24;
    page.drawLine({ start: { x: MARGIN, y: y + 9 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 9 }, thickness: 1.6, color: gold });
  }

  nextPage(true);
  for (const text of report.summary) paragraph(text, 10.5, muted);

  for (const day of report.days) {
    if (y < 163) nextPage();
    y -= 12;
    draw(day.title, MARGIN, y, 15);
    y -= 19;
    for (const warning of day.warnings) paragraph(warning, 10, rgb(.43, .24, .08));

    for (const row of day.events) {
      const detailX = MARGIN + 107;
      const width = WIDE - 107;
      const titles = wrap(row.title, 11, width);
      const details = wrap(row.detail, 9.6, width);
      const times = wrap(row.time, 9.5, 99);
      const height = 13 + Math.max(times.length * 15, titles.length * 16 + details.length * 13);
      if (y - height < 56) {
        nextPage();
        draw(`${day.title}（續）`, MARGIN, y, 13);
        y -= 21;
      }
      page.drawLine({ start: { x: MARGIN, y: y + 9 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 9 }, thickness: .5, color: line });
      const nextY = y - height;
      times.forEach((time, index) => draw(time, MARGIN, y - index * 15, 9.5));
      for (const title of titles) {
        draw(title, detailX, y, 11);
        y -= 16;
      }
      for (const detail of details) {
        draw(detail, detailX, y, 9.6, muted);
        y -= 13;
      }
      y = nextY;
    }
  }

  const pages = document.getPages();
  pages.forEach((item, index) => {
    item.drawText(`${index + 1} / ${pages.length}`, { x: PAGE_WIDTH - MARGIN - 37, y: 32, size: 9, color: muted, font });
  });
  return document.save();
}

let browserAssets;

async function getAssets() {
  const pdfLib = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/pdf-lib.min.js";
    script.onload = () => globalThis.PDFLib ? resolve(globalThis.PDFLib) : reject(new Error("PDF library unavailable"));
    script.onerror = () => reject(new Error("PDF library failed to load"));
    document.head.append(script);
  });
  async function read(path, format) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`PDF asset: ${response.status}`);
    return response[format]();
  }
  return Promise.all([pdfLib, read(PDF_FONT, "arrayBuffer"), read(PDF_METRICS, "json")]);
}

export async function createBrowserPdf(report) {
  browserAssets ??= getAssets().catch(error => {
    browserAssets = null;
    throw error;
  });
  const [library, font, metrics] = await browserAssets;
  const bytes = await buildPdf(library, new Uint8Array(font), metrics, report);
  return new Blob([bytes], { type: "application/pdf" });
}

export function downloadFile(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}
