// news-image-20261118
// Draws one infographic of the world's news of Wednesday 18 November 2026
// and writes it to <MAKEFUN_OUTPUT_DIR>/entry.png (default /output).
// Node standard library only. No network, no external files, deterministic:
// the same bytes come out of every run.
//
// The picture is drawn with a hand-written 5x7 bitmap font (below) and a
// hand-written PNG encoder (node:zlib for DEFLATE, own CRC32).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const WIDTH = 1024;
const HEIGHT = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 pixels, "1" = ink, "0" = blank.
// Uppercase, lowercase, digits and punctuation, all drawn fresh here.
// ---------------------------------------------------------------------------

const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],

  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "10001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11110", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10001", "01111"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],

  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],

  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ";": ["00000", "01100", "00000", "01100", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "\u2013": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "\u2014": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "\u00b7": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
};

const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

function glyphOf(ch) {
  return GLYPHS[ch] || BLANK;
}

// Width of one character cell at a scale: 5 glyph pixels + 1 blank column.
function charAdvance(scale) {
  return 6 * scale;
}

function textWidth(text, scale) {
  if (text.length === 0) return 0;
  return text.length * charAdvance(scale) - scale;
}

// ---------------------------------------------------------------------------
// Canvas: a plain RGB byte buffer, 3 bytes per pixel.
// ---------------------------------------------------------------------------

const pixels = new Uint8Array(WIDTH * HEIGHT * 3);

function rgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function fillRect(x, y, w, h, color) {
  const [r, g, b] = rgb(color);
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(WIDTH, x + w);
  const y1 = Math.min(HEIGHT, y + h);
  for (let py = y0; py < y1; py++) {
    let off = (py * WIDTH + x0) * 3;
    for (let px = x0; px < x1; px++) {
      pixels[off] = r;
      pixels[off + 1] = g;
      pixels[off + 2] = b;
      off += 3;
    }
  }
}

function drawText(text, x, y, scale, color) {
  const [r, g, b] = rgb(color);
  let cx = x;
  for (const ch of text) {
    const glyph = glyphOf(ch);
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (bits[col] !== "1") continue;
        const px0 = cx + col * scale;
        const py0 = y + row * scale;
        for (let dy = 0; dy < scale; dy++) {
          let off = ((py0 + dy) * WIDTH + px0) * 3;
          for (let dx = 0; dx < scale; dx++) {
            pixels[off] = r;
            pixels[off + 1] = g;
            pixels[off + 2] = b;
            off += 3;
          }
        }
      }
    }
    cx += charAdvance(scale);
  }
}

function drawTextCentered(text, centerX, y, scale, color) {
  drawText(text, centerX - Math.floor(textWidth(text, scale) / 2), y, scale, color);
}

// Greedy word wrap: split into at most maxLines lines, each no wider than
// maxWidth pixels at the given scale.
function wrapText(text, scale, maxWidth, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const trial = current === "" ? word : current + " " + word;
    if (textWidth(trial, scale) <= maxWidth || current === "") {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== "") lines.push(current);
  return lines.slice(0, maxLines);
}

// ---------------------------------------------------------------------------
// PNG encoder: signature, IHDR, one IDAT (zlib level 9, filter 0 per row),
// IEND. CRC32 table built at startup; no timestamps anywhere, so the
// output is byte-identical on every run.
// ---------------------------------------------------------------------------

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng() {
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
  for (let y = 0; y < HEIGHT; y++) {
    raw[y * (1 + WIDTH * 3)] = 0; // filter: none
    raw.set(
      pixels.subarray(y * WIDTH * 3, (y + 1) * WIDTH * 3),
      y * (1 + WIDTH * 3) + 1
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The day's news: Wednesday 18 November 2026. Seven stories, each with a
// category chip, a headline (one line) and a summary (two lines at most).
// ---------------------------------------------------------------------------

const STORIES = [
  {
    chip: "UKRAINE",
    color: "#2563eb",
    headline: "72 killed in village airstrike",
    summary: "Russian strike on Komyshuvakha kills 72; four still missing.",
  },
  {
    chip: "MIDDLE EAST",
    color: "#ea580c",
    headline: "Gulf states report drone hits",
    summary: "Kuwait reports drone attacks as Iran, US trade strikes on Qeshm, Bahrain.",
  },
  {
    chip: "ASIA",
    color: "#0d9488",
    headline: "Trump lands in Manila for Quad",
    summary: "Trump arrives in Manila for Quad talks ahead of China visit; APEC opens.",
  },
  {
    chip: "EUROPE",
    color: "#7c3aed",
    headline: "UK sanctions settlement firms",
    summary: "Britain sanctions Israeli settlement firms to protect two-state solution.",
  },
  {
    chip: "ECONOMY",
    color: "#92400e",
    headline: "Nvidia revenue doubles",
    summary: "Nvidia revenue doubles to $115.84bn; board won't bring back Huang.",
  },
  {
    chip: "USA",
    color: "#15803d",
    headline: "Trump plotter jailed 27 years",
    summary: "Pakistani man sentenced to 27 years over plot to assassinate Trump.",
  },
  {
    chip: "SCIENCE",
    color: "#475569",
    headline: "Voyager 1 nears one light-day",
    summary: "NASA probe about to become first human-made object a light-day from Earth.",
  },
];

const CREAM = "#f7f3e8";
const NAVY = "#16213e";
const NAVY_TEXT = "#1a2340";
const GOLD = "#d4a017";
const SUMMARY_GREY = "#3a4666";
const SUBLINE_GREY = "#c9d1e3";

function drawEntry() {
  fillRect(0, 0, WIDTH, HEIGHT, CREAM);

  // Header band + gold rule.
  fillRect(0, 0, WIDTH, 154, NAVY);
  fillRect(0, 154, WIDTH, 6, GOLD);
  drawTextCentered("THE WORLD IN ONE IMAGE", WIDTH / 2, 20, 2, GOLD);
  drawTextCentered("WEDNESDAY, 18 NOVEMBER 2026", WIDTH / 2, 44, 6, "#ffffff");
  drawTextCentered("Seven stories that defined the day", WIDTH / 2, 102, 3, SUBLINE_GREY);

  // Seven story cards.
  const cardX = 28;
  const cardW = WIDTH - 2 * cardX; // 968
  const cardH = 110;
  const gap = 4;
  let cardY = 168;
  for (const story of STORIES) {
    fillRect(cardX, cardY, cardW, cardH, "#ffffff");
    fillRect(cardX, cardY, 12, cardH, story.color);

    // Category chip.
    const chipText = story.chip;
    const chipW = textWidth(chipText, 2) + 20;
    fillRect(56, cardY + 8, chipW, 19, story.color);
    drawText(chipText, 56 + 10, cardY + 10, 2, "#ffffff");

    // Headline, one line, scale 5.
    drawText(story.headline, 56, cardY + 30, 5, NAVY_TEXT);

    // Summary, up to two lines, scale 3.
    const lines = wrapText(story.summary, 3, 932, 2);
    drawText(lines[0], 56, cardY + 66, 3, SUMMARY_GREY);
    if (lines.length > 1) drawText(lines[1], 56, cardY + 87, 3, SUMMARY_GREY);

    cardY += cardH + gap;
  }

  // Footer.
  drawTextCentered(
    "Sources: Reuters \u00b7 AP \u00b7 The Guardian \u00b7 The Independent \u2014 18 Nov 2026",
    WIDTH / 2,
    974,
    2,
    NAVY_TEXT
  );
  drawTextCentered("make.fun \u00b7 news-image-20261118", WIDTH / 2, 996, 2, "#6b7280");
}

// Font test page: every glyph at a readable size, for visual inspection.
function drawFontTest() {
  fillRect(0, 0, WIDTH, HEIGHT, "#ffffff");
  const rows = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    ".,;:!?\"'-/()&%$#@+*=",
    "\u2013\u2014\u00b7",
    "72 killed in village airstrike",
    "Nvidia revenue doubles to $115.84bn;",
  ];
  let y = 30;
  for (const row of rows) {
    drawText(row, 30, y, 4, "#111111");
    y += 60;
  }
  drawText("THE WORLD IN ONE IMAGE", 30, y, 2, "#111111");
  y += 40;
  drawText("WEDNESDAY, 18 NOVEMBER 2026", 30, y, 3, "#111111");
}

function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  const fontTest = process.env.FONT_TEST === "1";
  mkdirSync(outDir, { recursive: true });
  if (fontTest) {
    drawFontTest();
    writeFileSync(join(outDir, "font-test.png"), encodePng());
  } else {
    drawEntry();
    writeFileSync(join(outDir, "entry.png"), encodePng());
  }
}

main();
