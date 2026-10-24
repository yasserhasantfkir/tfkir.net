/* ============================================================
   tools/verify.mjs — تحقق شامل من الموقع حرفًا بحرف
   يفحص النسخ الثلاث (ar/tr/en) في 12 صفحة:
     الروابط الداخلية، المبدّل، الوسوم، الـ head، JSON-LD،
     بقايا العربية، نصوص التطوير، تعارض الصيغ، الخريطة، التغذية.
   الاستعمال:  node tools/verify.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["index", "about", "thinking", "ideas", "article", "projects", "talks", "links", "contact", "thank-you", "404", "privacy"];
const LANGS = ["ar", "tr", "en"];
const HAS_AR = /[\u0600-\u06FF]/;
const errors = [];
const warnings = [];

const fileFor = (lang, p) => (lang === "ar" ? `${p}.html` : `${lang}/${p}.html`);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/* أدوات مساعدة */
const stripTags = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]*>/g, "\u0000");
const ALLOWED_ROOT = /^\/(assets\/|api\/|functions\/|admin|feed\.xml|robots\.txt|sitemap\.xml|site\.webmanifest|favicon)/;

for (const lang of LANGS) {
  for (const p of PAGES) {
    const f = fileFor(lang, p);
    const tag = `${f}`;
    const h = read(f);
    const slug = p === "index" ? "" : p;

    /* ---- 1) HTML: اللغة والاتجاه ---- */
    const htmlTag = h.match(/<html[^>]*>/)?.[0] || "";
    if (lang === "ar") {
      if (!/lang="ar"/.test(htmlTag) || !/dir="rtl"/.test(htmlTag)) errors.push(`${tag}: <html> يجب أن تكون ar/rtl`);
    } else {
      if (!new RegExp(`lang="${lang}"`).test(htmlTag) || !/dir="ltr"/.test(htmlTag)) errors.push(`${tag}: <html> يجب أن تكون ${lang}/ltr`);
    }

    /* ---- 2) الروابط الداخلية بادئة صحيحة (نطاق body فقط) ---- */
    const bodyStart = h.indexOf("<body");
    const body = bodyStart === -1 ? h : h.slice(bodyStart);
    for (const m of body.matchAll(/(?:href|src|action)="(\/[^"]*)"/g)) {
      const u = m[1];
      const bare = u.split(/[?#]/)[0];
      if (ALLOWED_ROOT.test(bare)) continue;
      const inSwitcher = /lang-switch/.test(body.slice(Math.max(0, m.index - 150), m.index));
      if (lang === "ar") {
        if (/^\/(tr|en)(\/|$)/.test(bare) && !inSwitcher) errors.push(`${tag}: رابط لغة أخرى خارج المبدّل → ${u}`);
      } else {
        if (bare.startsWith(`/${lang}/`)) continue;               /* سليم */
        if (inSwitcher) continue;                                  /* رابط تبديل لغة مقصود */
        errors.push(`${tag}: رابط داخلي بلا بادئة ${lang} → ${u}`);
      }
    }

    /* ---- 3) المبدّل: مرتان (رأس + قائمة) بصيغة صحيحة ---- */
    const switches = [...h.matchAll(/<div class="lang-switch"[^>]*data-lang-switch[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    if (switches.length < 2) errors.push(`${tag}: مبدّل اللغة يجب أن يظهر مرتين (رأس + قائمة)، وُجد ${switches.length}`);
    for (const sw of switches) {
      for (const l of LANGS) {
        const re = new RegExp(`<a class="lang-switch__btn[^"]*" href="([^"]+)" hreflang="${l}"`);
        const mm = sw.match(re);
        if (!mm) { errors.push(`${tag}: رابط المبدّل للغة ${l} مفقود`); continue; }
        const target = l === "ar" ? (slug === "" ? "/" : `/${slug}`) : `/${l}/` + slug;
        if (mm[1] !== target) errors.push(`${tag}: مبدّل ${l} يشير إلى ${mm[1]} بدلًا من ${target}`);
      }
      const currents = (sw.match(/is-current/g) || []).length;
      if (currents !== 1) errors.push(`${tag}: حالة المبدّل الحالية غير مضبوطة (is-current=${currents})`);
    }

    /* ---- 4) الـ head ---- */
    const title = h.match(/<title>([^<]*)<\/title>/)?.[1] || "";
    if (title.length < 8) errors.push(`${tag}: عنوان مفقود أو قصير`);
    if (lang !== "ar" && HAS_AR.test(title)) errors.push(`${tag}: العنوان يحتوي عربية → ${title}`);
    const desc = h.match(/<meta name="description" content="([^"]*)"/)?.[1] || "";
    if (desc.length < 30) errors.push(`${tag}: وصف مفقود`);
    if (lang !== "ar" && HAS_AR.test(desc)) errors.push(`${tag}: الوصف يحتوي عربية`);
    const canon = h.match(/<link rel="canonical" href="([^"]*)"/)?.[1] || "";
    const wanted = `https://tfkir.net/${lang === "ar" ? slug : lang + "/" + slug}`;
    if (canon.replace(/\/$/, "") !== wanted.replace(/\/$/, "")) errors.push(`${tag}: canonical → ${canon} (المتوقع ${wanted})`);
    for (const l of [...LANGS, "x-default"]) {
      const re = new RegExp(`<link rel="alternate" hreflang="${l}" href="([^"]*)">`);
      if (!re.test(h)) errors.push(`${tag}: hreflang ${l} مفقود`);
    }
    if (lang !== "ar") {
      const loc = h.match(/<meta property="og:locale" content="([^"]*)"/)?.[1] || "";
      const wantLoc = { tr: "tr_TR", en: "en_US" }[lang];
      if (loc !== wantLoc) errors.push(`${tag}: og:locale → ${loc} (المتوقع ${wantLoc})`);
    }

    /* ---- 5) بقايا عربية في tr/en (نص مرئي خارج المسموح) ---- */
    if (lang !== "ar") {
      let body = h
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<style[\s\S]*?<\/style>/g, "")
        .replace(/<meta name="keywords"[^>]*>/g, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\sdata-filter="[^"]*"/g, "");
      /* قيم <option> مقصودة بالعربية (رموز النموذج) */
      body = body.replace(/<option value="[^"]*"/g, '<option value=""');
      const texts = stripTags(body).split("\u0000").map((x) => x.trim()).filter(Boolean);
      for (const t of texts) {
        if (!HAS_AR.test(t)) continue;
        if (t === "ت" || t === "ي ح") continue; /* علامة العلامة والشعار */
        errors.push(`${tag}: نص عربي متبقٍ → «${t.slice(0, 60)}»`);
      }
      for (const m of body.matchAll(/(title|placeholder|aria-label|alt)="([^"]*[\u0600-\u06FF][^"]*)"/g)) {
        if (m[2] === "ت" || m[2] === "صفحة tfkir.net الرئيسية") errors.push(`${tag}: سمة عربية متبقية ${m[1]}="${m[2].slice(0, 50)}"`);
      }
    }

    /* ---- 6) نصوص تطويرية ممنوعة ---- */
    for (const bad of ["tools/content.mjs", "npm run build", "tools/build.mjs", "tools/pages.mjs", "TODO", "FIXME", "lorem"]) {
      if (h.includes(bad)) errors.push(`${tag}: نص تطويري «${bad}»`);
    }

    /* ---- 7) JSON-LD صالح وبلغته ---- */
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        const j = JSON.parse(m[1]);
        const flat = JSON.stringify(j);
        if (lang !== "ar" && HAS_AR.test(flat)) {
          const ar = flat.match(/"([^"\\]*[\u0600-\u06FF][^"\\]*)"/g) || [];
          errors.push(`${tag}: JSON-LD يحتوي عربية → ${ar.slice(0, 2).join(", ").slice(0, 80)}`);
        }
        const li = flat.match(/"inLanguage":"([^"]+)"/)?.[1];
        if (li && li !== lang) errors.push(`${tag}: JSON-LD inLanguage=${li} (المتوقع ${lang})`);
      } catch (e) {
        errors.push(`${tag}: JSON-LD غير صالح JSON (${e.message})`);
      }
    }

    /* ---- 8) تغليف الوسوم ---- */
    const opens = (h.match(/<(?:div|section|nav|header|footer|main|article|aside)\b/g) || []).length;
    const closes = (h.match(/<\/(?:div|section|nav|header|footer|main|article|aside)>/g) || []).length;
    if (opens !== closes) errors.push(`${tag}: وسوم كتلية غير متوازنة (${opens}/${closes})`);

    /* ---- 9) ملفات ثابتة موجودة + بصمة ---- */
    for (const m of h.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)) {
      const u = m[1].split("?")[0];
      if (!exists(u)) {
        if (u.endsWith("doctor-yasser.jpg")) warnings.push(`${tag}: صورة الطبيب غير مضافة بعد → ${u}`);
        else errors.push(`${tag}: ملف مفقود → ${m[1]}`);
      }
    }
    if (/<link rel="stylesheet" href="\/assets\/css\/[^"?]+"/.test(h)) errors.push(`${tag}: css بلا بصمة ?v=`);

    /* ---- 10) JS الديناميكي ---- */
    const strIdx = h.indexOf("TFKIR_STR=");
    const appIdx = h.indexOf('/assets/js/app.js');
    if (lang === "ar") {
      if (strIdx !== -1) errors.push(`${tag}: TFKIR_STR يجب ألّا يوجد في النسخة العربية`);
    } else {
      if (strIdx === -1) errors.push(`${tag}: TFKIR_STR مفقود`);
      else if (strIdx > appIdx) errors.push(`${tag}: TFKIR_STR يجب أن يسبق app.js`);
    }
  }
}

/* ---- الخريطة والملفات العامة ---- */
const sm = read("sitemap.xml");
for (const lang of LANGS) for (const p of PAGES) {
  if (p === "404") continue; /* صفحة الخطأ لا تُفهرس */
  const slug = p === "index" ? "" : p;
  const url = `https://tfkir.net/${lang === "ar" ? slug : lang + "/" + slug}`.replace(/\/$/, "");
  if (!sm.includes(`<loc>${url}</loc>`) && !(slug === "" && sm.includes(`<loc>https://tfkir.net/</loc>`))) {
    errors.push(`sitemap.xml: رابط مفقود → ${url}`);
  }
}
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
if (urls !== 36) warnings.push(`sitemap.xml: ${urls} رابطًا (المتوقع 36)`);
if (!exists("feed.xml")) errors.push("feed.xml مفقود");
if (!exists("_headers")) errors.push("_headers مفقود");
if (!exists("_redirects")) warnings.push("_redirects مفقود");

/* ---- لوحة التحرير ---- */
if (!exists("admin.html")) {
  errors.push("admin.html مفقود");
} else {
  const ah = read("admin.html");
  const atag = "admin.html";
  if (!/lang="ar"/.test(ah) || !/dir="rtl"/.test(ah)) errors.push(`${atag}: <html> يجب أن تكون ar/rtl`);
  if (!/<meta name="robots" content="noindex/.test(ah)) errors.push(`${atag}: لا بد من noindex للوحة التحرير`);
  if (/<title>[^<]*<\/title>/.test(ah) === false) errors.push(`${atag}: العنوان مفقود`);
  for (const id of ["view-login", "view-force", "view-app", "view-editor", "ed-content", "ed-toolbar", "login-form", "cred-form"]) {
    if (!ah.includes(`id="${id}"`)) errors.push(`${atag}: عنصر مفقود → #${id}`);
  }
  for (const m of ah.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)) {
    if (!exists(m[1].split("?")[0])) errors.push(`${atag}: ملف مفقود → ${m[1]}`);
  }
  if (!/\?v=[0-9a-f]{8}"/.test(ah)) errors.push(`${atag}: الأصول بلا بصمة ?v=`);
  const aOpens = (ah.match(/<(?:div|section|nav|header|footer|main|article|aside|form|label|button)\b/g) || []).length;
  const aCloses = (ah.match(/<\/(?:div|section|nav|header|footer|main|article|aside|form|label|button)>/g) || []).length;
  if (aOpens !== aCloses) errors.push(`${atag}: وسوم كتلية غير متوازنة (${aOpens}/${aCloses})`);
}

/* ---- دخان جافاسكربت: يشغّل app.js و admin.js على DOM وهمي ---- */
{
  const { execFileSync } = await import("node:child_process");
  try {
    execFileSync(process.execPath, [path.join(ROOT, "tools/smoke.mjs")], { stdio: "pipe" });
  } catch (e) {
    const out = `${e.stdout || ""}${e.stderr || ""}`.trim();
    errors.push(`اختبار الدخان فشل:\n     ${out.split("\n").join("\n     ")}`);
  }
}

/* ---- _routes.json ---- */
if (!exists("_routes.json")) {
  warnings.push("_routes.json مفقود — كل طلبات الصفحات ستستدعي الدوال");
} else {
  try {
    const rj = JSON.parse(read("_routes.json"));
    if (rj.version !== 1 || !Array.isArray(rj.include) || !rj.include.length) errors.push("_routes.json: include غير صالح");
  } catch (e) {
    errors.push(`_routes.json: JSON غير صالح (${e.message})`);
  }
}

/* ---- دوال الخادم ---- */
for (const fn of ["functions/api/auth/login.js", "functions/api/posts/index.js", "functions/article.js", "functions/ideas.js", "functions/_lib.js"]) {
  if (!exists(fn)) errors.push(`دالة مفقودة → ${fn}`);
}

/* ---- التقرير ---- */
console.log(`\n  فُحص ${LANGS.length * PAGES.length} صفحة + الخريطة والملفات العامة`);
if (errors.length) {
  console.log(`\n  ✗ ${errors.length} خطأ:`);
  const seen = new Map();
  for (const e of errors) seen.set(e, (seen.get(e) || 0) + 1);
  [...seen].slice(0, 60).forEach(([e, n]) => console.log(`     ${n > 1 ? "×" + n + "  " : "     "}${e}`));
  if (seen.size > 60) console.log(`     … و${seen.size - 60} خطأ آخر`);
} else {
  console.log("\n  ✓ لا أخطاء");
}
if (warnings.length) {
  console.log(`\n  ⚠︎ ${warnings.length} تنبيه:`);
  [...new Set(warnings)].slice(0, 10).forEach((w) => console.log(`     ${w}`));
}
console.log();
process.exit(errors.length ? 1 : 0);
