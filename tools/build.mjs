import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  site, doctor, marquee, domains,
  timeline, ideas, ideaCategories, projects, projectFilters, talks, talkTypes,
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

/* بصمة محتوى لكل ملف ثابت: تكسر كاش المتصفح وCloudflare عند كل تغيير */
const assetHash = (absUrl) => {
  const p = path.join(ROOT, absUrl.replace(/^\//, "").split("?")[0]);
  if (!fs.existsSync(p)) return "0";
  return createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 8);
};
const versionAssets = (html) =>
  html.replace(/(\/assets\/(?:css|js)\/[\w.-]+\.(?:css|js))"/g, (m, url) => `${url}?v=${assetHash(url)}"`);

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
const jsFor = (lang) =>
  Object.fromEntries(Object.entries(jsStrings).map(([k, v]) => [k, v[lang]]).filter(([, v]) => v));
const stripI18nAttrs = (html) => html.replace(/\s+data-i18n(?:-placeholder)?="[^"]*"/g, "");

const emitPage = (file, rawHtml, urlPath) => {
  /* توحيد الروابط (إزالة .html) قبل أي معالجة، حتى تنجح تثبيت البادئة */
  const html = cleanUrls(rawHtml);
  /* النسخة العربية: بلا معالجة شجرية — نفس المخرجات السابقة */
  let ar = stripI18nAttrs(html);
  ar = fillSwitcher(ar, "ar", urlPath, site.origin);
  ar = patchHead(ar, "ar", urlPath, null, site.origin);
  done(write(file, versionAssets(ar)));

  /* TR / EN: شجرة ترجمة كاملة */
  for (const lang of LOCALES) {
    let h = applyDict(html, dicts[lang], i18nStats);
    h = prefixLinks(h, lang, site.origin);
    h = fillSwitcher(h, lang, urlPath, site.origin);
    h = patchHead(h, lang, urlPath, dicts[lang], site.origin);
    h = h.replace(
      '<script src="/assets/js/app.js" defer></script>',
      `<script>window.TFKIR_STR=${JSON.stringify(jsFor(lang))};</script>
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
  ["ideas.html", P.ideasPage(), "/ideas"],
  ["article.html", P.articlePage(), "/article"],
  ["projects.html", P.projectsPage(), "/projects"],
  ["talks.html", P.talksPage(), "/talks"],
  ["links.html", P.linksPage(), "/links"],
  ["contact.html", P.contactPage(), "/contact"],
  ["thank-you.html", P.thankYouPage(), "/thank-you"],
  ["404.html", P.notFoundPage(), "/404"],
  ["privacy.html", P.privacyPage(), "/privacy"],
];
for (const [file, html, urlPath] of PAGES) emitPage(file, html, urlPath);

if (i18nStats.missing.size) {
  console.warn(`\n  ⚠  ترجمات ناقصة: ${i18nStats.missing.size} مفتاحًا بقي بالعربية في tr/en`);
  [...i18nStats.missing].slice(0, 20).forEach((k) => console.warn(`     · ${k.slice(0, 90)}`));
  if (i18nStats.missing.size > 20) console.warn(`     … و${i18nStats.missing.size - 20} غيرها`);
}
if (i18nStats.badPh.size) {
  console.warn(`\n  ⚠  مواضع {0} غير متطابقة: ${i18nStats.badPh.size}`);
  [...i18nStats.badPh].slice(0, 10).forEach((k) => console.warn(`     · ${k.slice(0, 90)}`));
}

/* ---------------- بيانات المقالات للعميل ---------------- */
done(
  write(
    "assets/js/ideas.data.js",
    `/* مولَّد آليًا من tools/content.mjs — لا تعدّله يدويًا */
window.TFKIR_IDEAS = ${JSON.stringify(
      ideas.map((i) => ({
        slug: i.slug,
        title: i.title,
        excerpt: i.excerpt,
        category: i.category,
        date: i.date,
        dateAr: i.dateAr,
        read: i.read,
        tags: i.tags,
        body: i.body,
        quote: i.quote || null,
      })),
      null,
      0
    )};
`
  )
);

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
  { loc: "/article", pri: "0.6", freq: "monthly" },
  { loc: "/thank-you", pri: "0.2", freq: "yearly" },
  { loc: "/thinking", pri: "0.9", freq: "monthly" },
  { loc: "/ideas", pri: "0.8", freq: "weekly" },
  { loc: "/projects", pri: "0.8", freq: "monthly" },
  { loc: "/talks", pri: "0.7", freq: "monthly" },
  { loc: "/links", pri: "0.6", freq: "monthly" },
  { loc: "/contact", pri: "0.7", freq: "yearly" },
  { loc: "/privacy", pri: "0.3", freq: "yearly" },
];
const articleUrls = ideas.map((i) => ({ loc: `/article?id=${encodeURIComponent(i.slug)}`, pri: "0.7", freq: "monthly", mod: i.date }));
const allStatics = [...statics, ...articleUrls];
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

/* ---------------- feed.xml (RSS) ---------------- */
done(
  write(
    "feed.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${site.shortName} — ${site.tagline}</title>
    <link>${site.origin}/</link>
    <description>${doctor.subtitle}</description>
    <language>ar</language>
    <lastBuildDate>${new Date(today).toUTCString()}</lastBuildDate>
    <atom:link href="${site.origin}/feed.xml" rel="self" type="application/rss+xml"/>
${ideas
  .map(
    (i) => `    <item>
      <title><![CDATA[${i.title}]]></title>
      <link>${site.origin}/article?id=${encodeURIComponent(i.slug)}</link>
      <guid isPermaLink="true">${site.origin}/article?id=${encodeURIComponent(i.slug)}</guid>
      <category>${i.category}</category>
      <pubDate>${new Date(i.date).toUTCString()}</pubDate>
      <description><![CDATA[${i.excerpt}]]></description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>
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
  X-Robots-Tag: index, follow
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; form-action 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests

/api/*
  Cache-Control: no-store
  X-Robots-Tag: noindex

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

/rss             /feed.xml      301
/feed            /feed.xml      301
/feed.xml        /feed.xml      200

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
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/assets/img/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/assets/img/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
        shortcuts: nav.slice(1, 4).map((n) => ({ name: n.label, url: n.href })),
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

موقع شخصي لـ${doctor.nameAr}: تفكير طبي، أفكار ومقالات، مشاريع شخصية، ومحاضرات.
مبني كصفحات ثابتة (Static) بدون أي إطار عمل، ومنشور على **Cloudflare Pages**.

---

## البنية

\`\`\`
index.html …            الصفحات المولَّدة (المحتوى النهائي)
assets/css/             base · components · pages
assets/js/app.js        كل الوظائف (سمة، قائمة، كشف، تصفية، نموذج…)
assets/js/ideas.data.js بيانات المقالات (مولَّدة آليًا)
assets/img/             الصور والأيقونات
functions/api/contact.js Cloudflare Pages Function — استقبال رسائل النموذج
tools/content.mjs       ← المصدر الوحيد للمحتوى (عدّله أولًا)
tools/pages.mjs         قوالب الصفحات
tools/render.mjs        الهيكل العام (هيدر، فوتر، SEO، JSON-LD)
tools/icons.mjs         أيقونات SVG
tools/build.mjs         مُولّد الموقع
\`\`\`

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
| \`phone\` | فارغ | الرقم الذي يُعرض في صفحة الاتصال |
| \`whatsapp\` | فارغ | يُستخدم في صفحة الروابط |
| \`socials.x\` | فارغ | |
| \`socials.linkedin\` | فارغ | |
| \`socials.instagram\` | فارغ | |
| \`socials.youtube\` | فارغ | |
| \`socials.telegram\` | فارغ | |
| \`socials.github\` | فارغ | |
| \`emailPress\` | موجود | بدّله ببريد الإعلام |
| \`portrait\` | مسار | ضع الصورة في \`assets/img/doctor-yasser.jpg\` |

## ٢) الصورة الشخصية

ضع ملف الصورة هنا:

\`\`\`
assets/img/doctor-yasser.jpg     (يُفضَّل 1200×1500 px، عمودي، أقل من 300KB)
\`\`\`

الأصل المتاح حاليًا: \`IMG-20251209-WA0052.jpg\` في جذر المشروع.
انسخه مباشرة:

\`\`\`bash
cp IMG-20251209-WA0052.jpg assets/img/doctor-yasser.jpg
# ثم اضغطه إن لزم (أداة disponibles: macOS sips / Linux imagemagick / اونلاين squoosh)
\`\`\`

الصورة في الهيرو تظهر **خافتة** (grayscale + opacity) وتظهر أوضح عند تمرير المؤشر فوقها.
إن لم يوجد الملف، يظهر بديل أنيق بالحرف الأول تلقائيًا.

## ٣) السيرة — \`timeline\`

خمسة محطات. \`when\` فيها \`TODO\` — ضع السنوات الحقيقية، واكتب نصًا موجزًا لكل محطة.

## ٤) الإحصاءات — \`stats\`

الأرقام الحالية (١٢+، ٨+، ٣٤، ٦) **افتراضية**. بدّلها بأرقامك الحقيقية.

## ٥) الأفكار — \`ideas\`

٧ مقالات مكتوبة كنماذج. لكل مقالة \`body\` مقسّم إلى أقسام. لإضافة مقالة:

\`\`\`js
{
  slug: "unique-slug",
  featured: false,
  category: "التفكير الطبي",      // من ideaCategories
  title: "…",
  excerpt: "…",                     // ٢٠٠–٣٠٠ حرف
  date: "2026-10-01",
  dateAr: "١ أكتوبر ٢٠٢٦",
  read: "٧ دقائق",
  tags: ["…", "…"],
  body: [ { h: "عنوان القسم", p: ["فقرة", "فقرة"] } ],
  quote: { text: "…", cite: "…" },  // اختياري
}
\`\`\`

## ٦) المشاريع — \`projects\`

ستة مشاريع. لكل مشروع: \`status\` (\`live\` / \`wip\` / \`idea\`)، \`link\` (فارغ حاليًا)، \`text\`.
حدّث \`updated\` و\`year\` والقائمة \`stack\`.

## ٧) المحاضرات — \`talks\`

خمس جلسات. أضف \`video\` و\`slides\` (روابط YouTube / Vimeo / PDF).

## ٨) صفحة الروابط — \`linkGroups\`

كل رابط بلا \`url\` يظهر بشارة **«يُضاف لاحقًا»**. املأ:

- واتساب
- إكس / لينكدإن / إنستغرام / يوتيوب / تيليجرام
- المصادر الأربعة (إرشادات، أرشيف أدلة، أداة، قائمة قراءة)

## ٩) التذييل والفوتر — \`footer\`

الترويسة، والعمودان الثلاثة. راجع أن تبقى متوافقة مع خريطة التنقل في القائمة الجانبية.

## ١٠) الخصوصية — قسم التحليلات

في \`privacyPage()\` قسم **«أدوات التحليل»** فيه \`TODO\`. إن أضفت Cloudflare Web Analytics
صف ما يُجمَّع بدقة، وإلا احذف القسم.

## ١١) إرسال النموذج (اختياري)

الافتراضي: النموذج يفتح برنامج بريد الزائر (يعمل بلا إعداد).
للإرسال الحقيقي إلى بريدك، راجع قسم **نموذج التواصل** في \`README.md\`.

## ١٢) صور إضافية (اختياري)

| الملف | الاستخدام | الحالة |
|---|---|---|
| \`assets/img/doctor-yasser.jpg\` | صورة الهيرو | فارغ |
| \`assets/img/og-cover.svg\` | صورة المشاركة | مولَّد (بديل) |
| \`assets/img/og-cover.png\` | صورة المشاركة ١٢٠٠×٦٣٠ | بديل |
| \`assets/img/icon-192.png\` | أيقونة PWA | بديل |
| \`assets/img/icon-512.png\` | أيقونة PWA | بديل |
| \`assets/img/apple-touch-icon.png\` | أيقونة iOS | بديل |

## ١٣) SEO

- \`site.origin\` — اضبطه إن تغيّر الدومين.
- \`sitemap.xml\` و\`feed.xml\` — تُولَّدان تلقائيًا من المحتوى.
- \`_headers\` — CSP وHSTS جاهزة.
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