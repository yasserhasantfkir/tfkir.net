import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  site, doctor, marquee, domains,
  timeline, projects, projectFilters, talks, talkTypes,
  linkGroups, footer, nav,
} from "./content.mjs";
import * as P from "./pages.mjs";
import { applyDict, fillSwitcher, patchHead, prefixLinks } from "./i18n.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Cloudflare Pages يخدم /about مباشرةً ويحوّل /about.html إليها (308).
   لذلك نجعل كل الروابط والـ canonical بلا امتداد: صفر قفزات. */
const cleanUrls = (html) =>
  html
    .replace(/href="(\/[\w-]+)\.html(#[^"]*)?"/g, 'href="$1$2"')
    .replace(/(<link rel="canonical" href="https?:\/\/[^"]+)\.html(")/g, "$1$2")
    .replace(/(og:url" content="https?:\/\/[^"]+)\.html(")/g, "$1$2");

const write = (rel, content) => {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return rel;
};

/* بصمة النسخة: تتغيّر مع أي تعديل في الأدوات أو الأصول — تخدم التحديث التلقائي */
const SITE_VERSION = (() => {
  const hash = createHash("sha1");
  const walk = (dir) => {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = `${dir}/${ent.name}`;
      if (ent.isDirectory()) walk(rel);
      else hash.update(rel).update(fs.readFileSync(path.join(ROOT, rel)));
    }
  };
  walk("tools");
  walk("assets");
  return hash.digest("hex").slice(0, 12);
})();

/* بصمة محتوى لكل ملف ثابت: تكسر كاش المتصفح وCloudflare عند كل تغيير */
const assetHash = (absUrl) => {
  const p = path.join(ROOT, absUrl.replace(/^\//, "").split("?")[0]);
  if (!fs.existsSync(p)) return "0";
  return createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 8);
};
const versionAssets = (html) =>
  html.replace(
    /(\/(?:assets\/(?:css\/[\w.-]+\.css|js\/[\w.-]+\.js|img\/[\w.-]+\.(?:png|jpe?g|webp|svg|ico|avif))|favicon\.svg))(?=")/g,
    (m, url) => `${url}?v=${assetHash(url)}`
  );

const log = [];
const done = (rel) => log.push(rel);

/* ---------------- الترجمة ---------------- */
const LOCALES = ["tr", "en"];
const dicts = Object.fromEntries(
  LOCALES.map((l) => {
    const file = path.join(ROOT, "tools/locales", `${l}.json`);
    return [l, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {}];
  })
);
const i18nStats = { missing: new Set(), badPh: new Set() };
const jsStrings = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/locales/js.json"), "utf8"));
/* JSON آمن للحقن داخل <script> */
const jsonSafe = (v) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
const jsFor = (lang) =>
  Object.fromEntries(Object.entries(jsStrings).map(([k, v]) => [k, v[lang]]).filter(([, v]) => v));
const stripI18nAttrs = (html) => html.replace(/\s+data-i18n(?:-placeholder)?="[^"]*"/g, "");

const emitPage = (file, rawHtml, urlPath) => {
  /* توحيد الروابط (إزالة .html) قبل أي معالجة، حتى تنجح تثبيت البادئة */
  const html = cleanUrls(rawHtml).replace(
    '<meta charset="utf-8">',
    `<meta charset="utf-8">\n<meta name="site-version" content="${SITE_VERSION}">`
  );
  /* النسخة العربية: بلا معالجة شجرية — نفس المخرجات السابقة */
  let ar = stripI18nAttrs(html);
  ar = fillSwitcher(ar, "ar", urlPath, site.origin);
  ar = patchHead(ar, "ar", urlPath, null, site.origin);
  done(write(file, versionAssets(ar)));

  /* TR / EN: شجرة ترجمة كاملة */
  for (const lang of LOCALES) {
    let h = applyDict(html, dicts[lang], i18nStats);
    h = h.replace(/<!--#[A-Z_]+-->/g, "");
    h = prefixLinks(h, lang, site.origin);
    h = fillSwitcher(h, lang, urlPath, site.origin);
    h = patchHead(h, lang, urlPath, dicts[lang], site.origin);
    h = h.replace(
      '<script src="/assets/js/app.js" defer></script>',
      `<script>window.TFKIR_STR=${jsonSafe(jsFor(lang))};</script>
<script src="/assets/js/app.js" defer></script>`
    );
    done(write(`${lang}/${file}`, versionAssets(h)));
  }
};

/* ---------------- الصفحات ---------------- */
const PAGES = [
  ["index.html", P.homePage(), "/"],
  ["about.html", P.aboutPage(), "/about"],
  ["thinking.html", P.thinkingPage(), "/thinking"],
  ["projects.html", P.projectsPage(), "/projects"],
  ["talks.html", P.talksPage(), "/talks"],
  ["links.html", P.linksPage(), "/links"],
  ["contact.html", P.contactPage(), "/contact"],
  ["thank-you.html", P.thankYouPage(), "/thank-you"],
  ["404.html", P.notFoundPage(), "/404"],
  ["privacy.html", P.privacyPage(), "/privacy"],
];
for (const [file, html, urlPath] of PAGES) emitPage(file, html, urlPath);

/* ---------------- _routes.json — الدوال على المسارات المطلوبة فقط ---------------- */
done(
  write(
    "_routes.json",
    JSON.stringify(
      {
        version: 1,
        include: ["/api/*"],
        exclude: [],
      },
      null,
      2
    ) + "\n"
  )
);

if (i18nStats.missing.size) {
  console.warn(`\n  ⚠  ترجمات ناقصة: ${i18nStats.missing.size} مفتاحًا بقي بالعربية في tr/en`);
  [...i18nStats.missing].slice(0, 20).forEach((k) => console.warn(`     · ${k.slice(0, 90)}`));
  if (i18nStats.missing.size > 20) console.warn(`     … و${i18nStats.missing.size - 20} غيرها`);
}
if (i18nStats.badPh.size) {
  console.warn(`\n  ⚠  مواضع {0} غير متطابقة: ${i18nStats.badPh.size}`);
  [...i18nStats.badPh].slice(0, 10).forEach((k) => console.warn(`     · ${k.slice(0, 90)}`));
}

/* ---------------- version.json — النسخة الحيّة (يتحقق منها app.js) ---------------- */
done(write("version.json", JSON.stringify({ v: SITE_VERSION })));

/* ---------------- robots.txt ---------------- */
done(
  write(
    "robots.txt",
    `# ${site.domain} — robots.txt
User-agent: *
Allow: /
Disallow: /functions/
Disallow: /api/

# Major crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

Sitemap: ${site.origin}/sitemap.xml
Host: ${site.domain}
`
  )
);

/* ---------------- sitemap.xml ---------------- */
const today = site.updatedAt;
const statics = [
  { loc: "/", pri: "1.0", freq: "weekly" },
  { loc: "/about", pri: "0.9", freq: "monthly" },
  { loc: "/thank-you", pri: "0.2", freq: "yearly" },
  { loc: "/thinking", pri: "0.9", freq: "monthly" },
  { loc: "/projects", pri: "0.8", freq: "monthly" },
  { loc: "/talks", pri: "0.7", freq: "monthly" },
  { loc: "/links", pri: "0.6", freq: "monthly" },
  { loc: "/contact", pri: "0.7", freq: "yearly" },
  { loc: "/privacy", pri: "0.3", freq: "yearly" },
];
const allStatics = statics;
const localized = (lang, loc) => {
  const [p, qs] = loc.split("?");
  const base = lang === "ar" ? p : `/${lang}${p === "/" ? "/" : p}`;
  return site.origin + base + (qs ? "?" + qs : "");
};
const urlEntries = [];
for (const u of allStatics) {
  for (const lang of ["ar", "tr", "en"]) {
    urlEntries.push(`  <url>
    <loc>${localized(lang, u.loc)}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${localized("ar", u.loc)}"/>
    <xhtml:link rel="alternate" hreflang="tr" href="${localized("tr", u.loc)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${localized("en", u.loc)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${localized("ar", u.loc)}"/>
    <lastmod>${u.mod || today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${lang === "ar" ? u.pri : (Number(u.pri) * 0.9).toFixed(1)}</priority>
  </url>`);
  }
}
done(
  write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join("\n")}
</urlset>
`
  )
);

/* ---------------- _headers (Cloudflare Pages) ---------------- */
done(
  write(
    "_headers",
    `# Cloudflare Pages — رؤوس الاستجابات
# ملاحظة مهمة: يُسمح بقسم واحد فقط لكل مسار؛ لذلك كل ما هو عام في كتلة /* أدناه.

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  X-DNS-Prefetch-Control: off
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; form-action 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests

/api/*
  Cache-Control: no-store
  X-Robots-Tag: noindex

/version.json
  Cache-Control: no-store

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=604800

/*.js
  Cache-Control: public, max-age=604800

/*.svg
  Cache-Control: public, max-age=604800

/*.jpg
  Cache-Control: public, max-age=604800
  Accept-Ranges: bytes

/*.jpeg
  Cache-Control: public, max-age=604800
  Accept-Ranges: bytes

/*.png
  Cache-Control: public, max-age=604800
  Accept-Ranges: bytes

/*.webp
  Cache-Control: public, max-age=604800
  Accept-Ranges: bytes
`
  )
);

/* ---------------- _redirects ---------------- */
done(
  write(
    "_redirects",
    `# Cloudflare Pages — إعادة التوجيه
# ملاحظة: لا تُستخدم اختصارات بلا امتداد هنا، لأن Pages يخدمها أصلًا
# (/about ← about.html مباشرة). الاختصارات أدناه تخص مسارات أخرى فقط.

# www ← النطاق الأساسي (نسخة واحدة فقط للمحتوى، أفضل لمحركات البحث)
https://www.tfkir.net/*   https://tfkir.net/:splat   301

/index.html      /            301
/index           /            301
/home            /            301
/الرئيسية        /            301

# صفحات أُزيلت (المقالات ولوحة التحرير وطبقة الآن) — تحويل دائم إلى الرئيسية
/ideas           /            301
/ideas.html      /            301
/article         /            301
/article.html    /            301
/now             /            301
/now.html        /            301
/admin           /            301
/admin.html      /            301
/feed.xml        /            301
/rss             /            301
/feed            /            301

# اختصار عربي إضافي
/ابدأ-من-هنا   /            301
`
  )
);

/* ---------------- webmanifest ---------------- */
done(
  write(
    "site.webmanifest",
    JSON.stringify(
      {
        name: `${site.shortName} — ${doctor.nameAr}`,
        short_name: site.shortName,
        description: doctor.subtitle,
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: "ar",
        dir: "rtl",
        background_color: site.themeColor,
        theme_color: site.themeColor,
        icons: [
          { src: `/assets/img/icon-192.png?v=${assetHash("/assets/img/icon-192.png")}`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `/assets/img/icon-512.png?v=${assetHash("/assets/img/icon-512.png")}`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `/assets/img/icon-maskable-512.png?v=${assetHash("/assets/img/icon-maskable-512.png")}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: nav.slice(1, 4).map((n) => ({ name: n.label, url: n.href.replace(/\.html$/, "") })),
      },
      null,
      2
    )
  )
);

/* ---------------- README ---------------- */
done(
  write(
    "README.md",
    `# tfkir.net — ${doctor.nameAr}

موقع شخصي لـ${doctor.nameAr}: التفكير الطبي، والمشاريع، والمحاضرات.
موقع ثابت (Static) بلا إطار عمل وبلا قاعدة بيانات، ومنشور على **Cloudflare Pages**.

---

## البنية

\`\`\`
index.html …            الصفحات المولَّدة (المحتوى النهائي)
assets/css/             base · components · pages
assets/js/app.js        الوظائف العامة (سمة، قائمة، كشف، نموذج…)
assets/js/cloud.js      نافذة الخدمة الحالية العائمة
assets/img/             الصور والأيقونات
functions/api/contact.js Cloudflare Pages Function — استقبال رسائل النموذج
tools/content.mjs       ← المصدر الوحيد للمحتوى (عدّله أولًا)
tools/pages.mjs         قوالب الصفحات
tools/render.mjs        الهيكل العام (هيدر، فوتر، SEO، JSON-LD)
tools/icons.mjs         أيقونات SVG
tools/build.mjs         مُولّد الموقع
\`\`\`

## الخدمة الحالية

تظهر الخدمة (الدورة) الحالية في **نافذة عائمة فقط**، تُعرَّف في \`tools/content.mjs\` تحت \`now\`.
لا يوجد عدّاد ولا موعد إغلاق: تبقى معروضة حتى تُحدَّث أو تُحذف يدويًا.

## تعديل المحتوى

1. عدّل \`tools/content.mjs\` فقط.
2. شغّل:

\`\`\`bash
npm run build
\`\`\`

3. ادفع التغييرات — Cloudflare Pages سيعيد النشر تلقائيًا.

> markers على شكل \`TODO\` في \`content.mjs\` هي الفراغات المخصّصة لملء المحتوى.
> راجع \`CONTENT.md\` لقائمة ما يجب تعبئته.

## النشر

- المستودع: GitHub
- المشروع: Cloudflare Pages (تكامل Git)
- النطاق: \`tfkir.net\` مربوط بالمشروع
- أمر البناء: **فارغ** (المخرجات جاهزة في الجذر)
- مجلد الإخراج: \`/\`

## التحديث التلقائي بعد النشر

- صفحات HTML تُقدَّم بـ \`Cache-Control: max-age=0, must-revalidate\` — كل زيارة تتحقق من النسخة الجديدة.
- الأصول (CSS/JS/الصور/الأيقونات) تُحمَّل ببصمة \`?v=<hash>\` فلا تختلط نسخة قديمة بأخرى جديدة في المتصفح.
- \`version.json\` (بلا تخزين) + فحص دوري في \`app.js\`: إذا كانت الصفحة مفتوحة ونُشرت نسخة جديدة تُعاد تحميلها تلقائيًا، ويتأجّل التحديث مؤقتًا إن كان الزائر يكتب في حقل نصي.

## نموذج التواصل

يعمل عبر Cloudflare Pages Function في \`functions/api/contact.js\`.
بدون إعداد إضافي يعمل التحقق والمصيدة، ويعيد الموقع الردّ بـ \`503\`
فتتح رسالة \`mailto:\` عند الزائر كبديل آمن.

لتفعيل الإرسال الحقيقي، اضبط متغيّرًا سرّيًا في إعدادات Pages:

\`\`\`
CONTACT_WEBHOOK_URL   رابط Webhook (Make / Zapier / n8n / Cloudflare Worker)
\`\`\`

أو أضف مفتاح \`RESEND_API_KEY\` + \`CONTACT_TO\` للإرسال عبر Resend
(يتطلب إضافة سطر واحد في الدالة).

## الدومين

\`\`\`
tfkir.net      CNAME  <project>.pages.dev
www.tfkir.net  CNAME  <project>.pages.dev
\`\`\`
`
  )
);

/* ---------------- CONTENT.md ---------------- */
done(
  write(
    "CONTENT.md",
    `# ما يبقى لملئه — TODO Checklist

كل ما يلي placeholders جاهزة في \`tools/content.mjs\`، وكل ما tagged بـ \`TODO\`
يُعرض في الموقع بشكل واضح. بعد التعديل: \`npm run build\` ثم push.

## ١) هوية الدكتور — \`doctor\`

| الحقل | الحالة | ملاحظة |
|---|---|---|
| \`phone\` | موجود | الرقم الذي يُعرض في صفحة الاتصال |
| \`whatsapp\` | موجود | يُستخدم في صفحة الروابط |
| \`socials.x\` | فارغ | |
| \`socials.linkedin\` | فارغ | |
| \`socials.youtube\` | فارغ | |
| \`socials.telegram\` | فارغ | |
| \`socials.github\` | فارغ | |
| \`emailPress\` | موجود | بدّله ببريد الإعلام |
| \`portrait\` | مسار | الصورة في \`assets/img/doctor-yasser.jpg\` |

## ٢) الصورة الشخصية

\`\`\`
assets/img/doctor-yasser.jpg     (يُفضَّل 1200×1500 px، عمودي، أقل من 300KB)
\`\`\`

الصورة في الهيرو تظهر **خافتة** (grayscale + opacity) وتظهر أوضح عند تمرير المؤشر فوقها.
إن لم يوجد الملف، يظهر بديل أنيق بالحرف الأول تلقائيًا.

## ٣) السيرة — \`timeline\`

خمسة محطات. \`when\` فيها \`TODO\` — ضع السنوات الحقيقية، واكتب نصًا موجزًا لكل محطة.

## ٤) المشاريع — \`projects\`

أضف المشاريع المنشورة أو قيد التطوير، مع الحالة والرابط إن وُجد.

## ٥) المحاضرات — \`talks\`

أضف المحاضرات والحوارات والورش، مع النوع والتاريخ والرابط.

## ٦) الخدمة الحالية — \`now\`

تُعرض الدورة الحالية في النافذة العائمة. عدّل الاسم والوصف ورابط التسجيل في
\`now.items[0]\`، أو أفرغ \`now.items\` لإخفاء النافذة.

## ٧) الروابط — \`linkGroups\`

أضف روابط المنصات والحسابات، أو أزل ما لا تريده.
`
  )
);

/* ---------------- .gitignore ---------------- */
done(
  write(
    ".gitignore",
    `# نظام
.DS_Store
Thumbs.db
node_modules/
npm-debug.log*

# محرّرات
.vscode/
.idea/
.and-code/
*.swp

# مؤقت
.cache/
tmp/
__pycache__/
*.pyc
*.log

# بيانات اعتماد محلية (لا تُرفع أبدًا)
.env
.env.*
!.env.example
.gh/
.wrangler/

# الصورة الأصلية غير المقروءة داخل بيئة البناء
IMG-20251209-WA0052.jpg
`
  )
);

/* ---------------- package.json ---------------- */
done(
  write(
    "package.json",
    JSON.stringify(
      {
        name: "tfkir-net",
        version: "1.0.0",
        private: true,
        description: `${site.shortName} — موقع شخصي للدكتور ياسر حسن`,
        type: "module",
        scripts: {
          build: "node tools/build.mjs",
          verify: "node tools/verify.mjs",
          smoke: "node tools/smoke.mjs",
          dev: "node tools/serve.mjs",
          watch: "node tools/build.mjs --watch",
        },
        engines: { node: ">=18" },
      },
      null,
      2
    )
  )
);

/* ---------------- console summary ---------------- */
const bytes = log.reduce((n, f) => n + (fs.existsSync(path.join(ROOT, f)) ? fs.statSync(path.join(ROOT, f)).size : 0), 0);
console.log(`\n  ✓ ${log.length} ملفًا تم توليده  (${(bytes / 1024).toFixed(1)} KB)`);
log.forEach((f) => console.log("    · " + f));
console.log("");