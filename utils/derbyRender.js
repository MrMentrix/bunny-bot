import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const FONT_DIR = "/usr/share/fonts/truetype/dejavu";
let fontsRegistered = false;

function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(`${FONT_DIR}/DejaVuSans-Bold.ttf`, "DejaVu Sans Bold");
  GlobalFonts.registerFromPath(`${FONT_DIR}/DejaVuSans.ttf`, "DejaVu Sans");
  fontsRegistered = true;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets", "manifest.json"), "utf8"));
const fileByName = new Map(manifest.map((m) => [m.name, m.file]));
const iconCache = new Map();

async function getIcon(itemName) {
  if (iconCache.has(itemName)) return iconCache.get(itemName);
  const file = fileByName.get(itemName);
  if (!file) return null;
  const img = await loadImage(path.join(root, file));
  iconCache.set(itemName, img);
  return img;
}

const BRAND = "#f25ff7";
const BG = "#1e1a21";
const HEADER_BG = "#18141a";
const ROW_A = "#28232b";
const ROW_B = "#231f26";
const TEXT = "#f0ebf2";
const SUBTEXT = "#beb4be";
const CLAIMED_BG = "#3a915c";
const OPEN_BG = "#463e4a";
const BORDER = "#463c48";

const ROW_H = 56;
const COL_LETTER = 50;
const COL_ICON = 60;
const COL_ITEM = 260;
const COL_QTY = 80;
const COL_TIME = 140;
const COL_POINTS = 80;
const COL_STATUS = 180;
const PAD = 20;
const HEADER_H = 34;
const GAP = 40;

const COL_W = COL_LETTER + COL_ICON + COL_ITEM + COL_QTY + COL_TIME + COL_POINTS + COL_STATUS;

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawColumn(ctx, originX, items, reservedCounts, letterOffset) {
  let hx = originX + COL_LETTER + COL_ICON;
  ctx.fillStyle = HEADER_BG;
  ctx.fillRect(originX, PAD, COL_W, HEADER_H);
  ctx.fillStyle = SUBTEXT;
  ctx.font = '14px "DejaVu Sans"';
  ctx.fillText("Item", hx + 8, PAD + 22);
  hx += COL_ITEM;
  ctx.fillText("Qty", hx + 8, PAD + 22);
  hx += COL_QTY;
  ctx.fillText("Time", hx + 8, PAD + 22);
  hx += COL_TIME;
  ctx.fillText("Pts", hx + 8, PAD + 22);
  hx += COL_POINTS;
  ctx.fillText("Status", hx + 8, PAD + 22);

  let y = PAD + HEADER_H;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const globalIndex = letterOffset + i;
    const letter = String.fromCharCode(65 + globalIndex);
    ctx.fillStyle = i % 2 === 0 ? ROW_A : ROW_B;
    ctx.fillRect(originX, y, COL_W, ROW_H);

    let x = originX;
    const cx = x + COL_LETTER / 2;
    const cy = y + ROW_H / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#3c3440";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = BRAND;
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.font = '18px "DejaVu Sans Bold"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, cx, cy + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    x += COL_LETTER;

    const icon = await getIcon(item.item);
    if (icon) {
      const size = 40;
      ctx.drawImage(icon, x + (COL_ICON - size) / 2, y + (ROW_H - size) / 2, size, size);
    }
    x += COL_ICON;

    ctx.fillStyle = TEXT;
    ctx.font = '17px "DejaVu Sans"';
    ctx.fillText(item.item, x, y + ROW_H / 2 + 6);
    x += COL_ITEM;

    ctx.fillText(String(item.maxQuantity), x, y + ROW_H / 2 + 6);
    x += COL_QTY;

    ctx.fillStyle = SUBTEXT;
    ctx.fillText(item.time, x, y + ROW_H / 2 + 6);
    x += COL_TIME;

    ctx.fillStyle = BRAND;
    ctx.fillText(String(item.points), x, y + ROW_H / 2 + 6);
    x += COL_POINTS;

    const count = reservedCounts[globalIndex] ?? 0;
    const btnW = COL_STATUS - 30;
    const btnH = 36;
    const bx = x + 10;
    const by = y + (ROW_H - btnH) / 2;
    roundRectPath(ctx, bx, by, btnW, btnH, 10);
    if (count > 0) {
      ctx.fillStyle = CLAIMED_BG;
      ctx.fill();
      ctx.fillStyle = TEXT;
    } else {
      ctx.fillStyle = OPEN_BG;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = BRAND;
      ctx.stroke();
      ctx.fillStyle = SUBTEXT;
    }
    const label = count > 0 ? `Reserved ×${count}` : "Unreserved";
    ctx.font = '14px "DejaVu Sans"';
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, bx + (btnW - tw) / 2, by + btnH / 2 + 5);

    y += ROW_H;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX, y);
    ctx.lineTo(originX + COL_W, y);
    ctx.stroke();
  }
}

export async function renderDerbyChunk(chunk, reservedCounts) {
  ensureFonts();

  const leftCount = Math.ceil(chunk.length / 2);
  const left = chunk.slice(0, leftCount);
  const right = chunk.slice(leftCount);
  const rows = Math.max(left.length, right.length);

  const width = right.length > 0 ? PAD * 2 + COL_W * 2 + GAP : PAD * 2 + COL_W;
  const height = PAD + HEADER_H + ROW_H * rows + PAD;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  await drawColumn(ctx, PAD, left, reservedCounts, 0);
  if (right.length > 0) {
    await drawColumn(ctx, PAD + COL_W + GAP, right, reservedCounts, leftCount);
  }

  return canvas.encode("png");
}
