import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Script } from "node:vm";

const htmlFiles = [
  "public/index.html",
  "public/chat.html",
  "public/bestiary.html",
  "public/intro.html"
];

let failed = false;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  checkInlineScripts(file, html);
  checkLocalAssets(file, html);
}

if (failed) process.exit(1);
console.log("HTML scripts and local asset references look good.");

function checkInlineScripts(file, html) {
  const scripts = html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
  let index = 0;

  for (const match of scripts) {
    index += 1;
    try {
      new Script(match[1], { filename: `${file}#script-${index}` });
    } catch (error) {
      failed = true;
      console.error(`${file}: inline script ${index} has a syntax error`);
      console.error(error.message);
    }
  }
}

function checkLocalAssets(file, html) {
  const attrs = html.matchAll(/\b(?:src|href)=["']([^"'#][^"']*)["']/gi);
  const baseDir = dirname(file);

  for (const match of attrs) {
    const raw = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    if (raw.includes("${")) continue;

    const assetPath = raw.split(/[?#]/, 1)[0];
    if (!assetPath || assetPath.endsWith(".html")) continue;

    const normalized = assetPath.replace(/^\/+/, "");
    const candidates = [
      join(baseDir, assetPath),
      join("public", normalized)
    ];

    if (!candidates.some(candidate => existsSync(candidate))) {
      failed = true;
      console.error(`${file}: missing asset ${raw}`);
    }
  }
}
