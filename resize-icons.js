import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const srcDir = "./assets/hayday-icons-original";
const destDir = "./assets/hayday-icons";
const SIZE = 80;

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".png"));

for (const file of files) {
  const destPath = path.join(destDir, file);
  const img = await loadImage(path.join(srcDir, file));
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const buffer = await canvas.encode("png");
  fs.writeFileSync(destPath, buffer);
  console.log(`Resized ${file}`);
}