/* ============================================================
   tools/stage.mjs — تجهيز مجلد نشر نظيف
   ------------------------------------------------------------
   ينسخ ملفات الموقع الجاهزة للنشر إلى مجلد مؤقت، مستبعدًا:
     • أدوات البناء (tools/)
     • الملفات المصدرية غير Needed للموقع
     • الملف المصدري غير المقروء  IMG-20251209-WA0052.jpg
   ثم يُنشر المجلد بأمر:
     npx wrangler pages deploy <staging> --project-name=tfkir
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || "/tmp/tfkir-site";

const EXCLUDE_FILES = new Set([
  "IMG-20251209-WA0052.jpg",
  "CONTENT.md",
  "README.md",
  "package.json",
  "package-lock.json",
  ".gitignore",
  "wrangler.toml",
  ".DS_Store",
]);
const EXCLUDE_DIRS = new Set([
  "tools",
  ".git",
  ".github",
  ".and-code",
  "node_modules",
  "__pycache__",
  ".vscode",
  ".idea",
]);

let files = 0;
let bytes = 0;

const rm = fs.rmSync ? fs.rmSync : fs.rmdirSync;
try { rm(OUT, { recursive: true, force: true }); } catch {}
fs.mkdirSync(OUT, { recursive: true });

function copy(rel) {
  const src = path.join(ROOT, rel);
  const dst = path.join(OUT, rel);
  if (!fs.existsSync(src)) return;

  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src)) copy(path.join(rel, e));
    return;
  }
  // تخطّي أي ملف لا يمكن قراءته (مثل الصورة المصدرية)
  try {
    const buf = fs.readFileSync(src);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, buf);
    files++;
    bytes += buf.length;
  } catch (e) {
    console.log(`  ⚠︎ تخطّي ${rel} — ${e.code || e.message}`);
  }
}

for (const e of fs.readdirSync(ROOT)) {
  if (EXCLUDE_DIRS.has(e) || EXCLUDE_FILES.has(e)) continue;
  copy(e);
}

// دوال Pages جزء من النشر
if (fs.existsSync(path.join(ROOT, "functions"))) copy("functions");

console.log(`\n  ✓ مجلد النشر: ${OUT}`);
console.log(`    ${files} ملفًا · ${(bytes / 1024).toFixed(1)} KB\n`);