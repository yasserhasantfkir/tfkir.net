/* ============================================================
   tools/render.mjs — القوالب والهياكل المشتركة
   ============================================================ */
import {
  site, doctor, nav, footer, faqs,
} from "./content.mjs";
import { icon, socialIcon } from "./icons.mjs";

/* ---------- helpers ---------- */
export const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const attr = (o = {}) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
    .join(" ");

/* ---------- head ---------- */
function head(p) {
  const {
    title,
    desc,
    path,
    type = "website",
    ogImage = "/assets/img/og-cover.svg",
    noIndex = false,
    extraHead = "",
    jsonLd = null,
  } = p;

  const url = site.origin + (path || "/");
  const fullTitle =
    title.includes("tfkir.net") || title.includes(site.shortName)
      ? title
      : `${title} | ${site.shortName} — ${doctor.nameAr}`;
  const img = ogImage.startsWith("http") ? ogImage : site.origin + ogImage;

  return `<!doctype html>
<html lang="${site.lang}" dir="${site.dir}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(doctor.nameAr)}">
<meta name="theme-color" content="${site.themeColor}" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f6f8fa" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="dark light">
<link rel="canonical" href="${esc(url)}">
${noIndex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(site.shortName)}">
<meta property="og:locale" content="${site.locale}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(doctor.nameAr)} — ${esc(site.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(site.shortName)} — الأفكار" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/pages.css">
<script>
/* منع وميض السمة الفاتحة */
(function(){try{var t=localStorage.getItem('tfkir-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>` : ""}
${extraHead}
</head>`;
}

/* ---------- header ---------- */
export function header(active = "/") {
  const links = nav
    .map(
      (n) =>
        `<a class="nav__link" href="${n.href}"${n.href === active ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`
    )
    .join("\n          ");

  const drawerLinks = nav
    .map(
      (n, i) =>
        `<a class="drawer__link" style="--i:${i}" href="${n.href}"${n.href === active ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`
    )
    .join("\n        ");

  return `<a class="skip-link" href="#main">تخطَّ إلى المحتوى</a>

<header class="site-header" id="site-header">
  <div class="shell site-header__bar">
    <a class="brand" href="/" aria-label="${esc(doctor.nameAr)} — الصفحة الرئيسية">
      <span class="brand__mark" aria-hidden="true">ت</span>
      <span class="brand__text">
        <span class="brand__name">${esc(site.shortName)}</span>
        <span class="brand__sub">tfkir.net</span>
      </span>
    </a>

    <nav class="nav" aria-label="التنقل الرئيسي">
          ${links}
    </nav>

    <div class="header-actions">
      <button class="icon-btn" id="theme-toggle" type="button" aria-label="تبديل السمة" title="تبديل السمة الفاتحة/الداكنة">
        ${icon("moon", "i-moon")}${icon("sun", "i-sun")}
      </button>
      <a class="btn btn--primary btn--sm" href="/contact.html">${icon("message")}<span>تواصل</span></a>
      <button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-label="فتح القائمة" aria-expanded="false" aria-controls="drawer" aria-haspopup="dialog">
        ${icon("menu")}
      </button>
    </div>
  </div>
  <span class="scroll-progress" id="scroll-progress" aria-hidden="true"></span>
</header>

<div class="drawer" id="drawer" data-open="false" role="dialog" aria-modal="true" aria-label="قائمة التنقل">
  <div class="drawer__scrim" data-close-drawer></div>
  <nav class="drawer__panel" aria-label="التنقل في الهاتف">
    <div class="drawer__head">
      <span class="brand__name" style="font-family:var(--font-display)">${esc(site.shortName)}</span>
      <button class="icon-btn" type="button" data-close-drawer aria-label="إغلاق القائمة">${icon("close")}</button>
    </div>
        ${drawerLinks}
    <div class="drawer__foot">
      <a class="btn btn--ghost btn--sm" href="/links.html">${icon("link")}<span>الروابط</span></a>
      <a class="btn btn--primary btn--sm" href="/contact.html">${icon("message")}<span>تواصل</span></a>
    </div>
  </nav>
</div>`;
}

/* ---------- footer ---------- */
export function siteFooter() {
  const soc = doctor.socialOrder
    .filter((k) => doctor.socials[k])
    .map(
      (k) =>
        `<a class="social" href="${k === "email" ? `mailto:${doctor.socials[k]}` : esc(doctor.socials[k])}" aria-label="${esc(k)}" target="_blank" rel="noopener noreferrer me">${socialIcon(k)}</a>`
    )
    .join("\n        ");

  const cols = footer.cols
    .map(
      (c) => `<div class="footer-col">
            <h2 class="footer-col__title">${esc(c.title)}</h2>
            <ul>
              ${c.links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join("\n              ")}
            </ul>
          </div>`
    )
    .join("\n          ");

  return `<footer class="site-footer">
  <div class="shell">
    <div class="footer-top">
      <div>
        <a class="brand" href="/" aria-label="الصفحة الرئيسية">
          <span class="brand__mark" aria-hidden="true">ت</span>
          <span class="brand__text">
            <span class="brand__name">${esc(site.shortName)}</span>
            <span class="brand__sub">tfkir.net</span>
          </span>
        </a>
        <p class="footer-brand__text">${esc(footer.tagline)}</p>
        <div class="socials">
        ${soc}
        </div>
      </div>
          ${cols}
    </div>

    <div class="footer-bottom">
      <span>© <span class="latin" id="year">${new Date().getFullYear()}</span> ${esc(doctor.nameAr)} — جميع الحقوق محفوظة.</span>
      <span class="footer-bottom__built"><span class="pulse-dot" aria-hidden="true"></span> مبنيّ بـ <span class="latin">HTML</span> + <span class="latin">Cloudflare Pages</span></span>
    </div>
  </div>
</footer>

<button class="to-top" id="to-top" type="button" aria-label="العودة إلى الأعلى">${icon("arrowUp")}</button>
<div class="toast" id="toast" role="status" aria-live="polite">${icon("checkCircle")}<span id="toast-text"></span></div>`;
}

/* ---------- portrait (hero side image) ---------- */
export function portrait() {
  return `<div class="hero__portrait" data-reveal="scale" style="--d:220ms">
            <span class="portrait__ring" aria-hidden="true"></span>
            <div class="portrait__frame">
              <div class="portrait__fallback" data-portrait-fallback aria-hidden="true">
                <span class="mono">${esc(doctor.initials)}</span>
              </div>
              <img class="portrait__img" src="/${doctor.portrait}"
                   alt="صورة الدكتور ياسر حسن"
                   width="900" height="1125" decoding="async" fetchpriority="high"
                   data-portrait-img>
              <span class="portrait__wash" aria-hidden="true"></span>
            </div>
            <div class="portrait__card">
              <p class="t">${esc(doctor.nameAr)}</p>
              <p class="s">${esc(doctor.roleLine)}</p>
            </div>
          </div>`;
}

/* ---------- pulse svg ---------- */
export const pulseSvg = `<svg class="pulse-line" viewBox="0 0 1200 62" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 40h120l14-1 12-22 10 38 12-30 12 15h120l14-1 12-22 10 38 12-30 12 15h120l14-1 12-22 10 38 12-30 12 15h120l14-1 12-22 10 38 12-30 12 15h120l14-1 12-22 10 38 12-30 12 15h160"/>
</svg>`;

/* ---------- page shell ---------- */
export function layout(p) {
  return `${head(p)}
<body${p.bodyAttrs || ""}>
${header(p.active || p.path)}

<main id="main">
${p.body}
</main>

${siteFooter()}

<script src="/assets/js/app.js" defer></script>
${p.scripts || ""}
</body>
</html>`;
}

/* ---------- page hero (interior pages) ---------- */
export function pageHero({ kicker, title, lead, crumbs = [], aside = "", meta = [] }) {
  const c = crumbs
    .map((x, i) => {
      const last = i === crumbs.length - 1;
      return last
        ? `<span aria-current="page">${esc(x.label)}</span>`
        : `<a href="${x.href}">${esc(x.label)}</a><span class="crumbs__sep" aria-hidden="true">/</span>`;
    })
    .join("\n            ");

  return `<section class="phero">
  <div class="shell">
    <nav class="crumbs" aria-label="مسار التصفح">
            ${c}
    </nav>
    <div class="phero__grid">
      <div>
        <span class="kicker" data-reveal>${esc(kicker)}</span>
        <h1 class="phero__title" data-reveal style="--d:80ms">${title}</h1>
        ${lead ? `<p class="lead phero__lead" data-reveal style="--d:160ms">${lead}</p>` : ""}
        ${
          meta.length
            ? `<div class="post-card__meta" style="margin-top:1.5rem" data-reveal>${meta
                .map((m) => `<span>${m}</span>`)
                .join('<span aria-hidden="true">·</span>')}</div>`
            : ""
        }
      </div>
      ${aside ? `<div class="phero__aside" data-reveal="left" style="--d:200ms">${aside}</div>` : ""}
    </div>
  </div>
</section>`;
}

/* ---------- accordion ---------- */
export function accordion(items, idPrefix = "faq") {
  return `<div class="acc">
          ${items
            .map(
              (f, i) => `<div class="acc__item" data-open="${i === 0}">
            <h3>
              <button class="acc__btn" type="button" aria-expanded="${i === 0}" aria-controls="${idPrefix}-${i}">
                <span>${esc(f.q)}</span>
                <span class="acc__sign" aria-hidden="true"></span>
              </button>
            </h3>
            <div class="acc__panel" id="${idPrefix}-${i}">
              <div><div class="acc__body">${esc(f.a)}</div></div>
            </div>
          </div>`
            )
            .join("\n          ")}
        </div>`;
}

/* ---------- CTA band ---------- */
export function ctaBand({
  title = "لديك فكرة تستحق أن تُكتب؟",
  text = "باب الموقع مفتوح للحوارات الفكرية، وطلبات المحاضرات، ومناقشة أي فكرة طبية أو إنسانية تلتقي عندها الممارسة بالتفكير.",
  primary = { href: "/contact.html", label: "تواصل مع الدكتور" },
  secondary = { href: "/links.html", label: "كل الروابط" },
} = {}) {
  return `<section class="section section--tight">
  <div class="shell">
    <div class="cta-band" data-reveal="scale">
      <span class="kicker" style="justify-content:center">${icon("spark")} تواصل</span>
      <h2 class="cta-band__title" style="margin-top:.8rem">${esc(title)}</h2>
      <p class="lead cta-band__text">${esc(text)}</p>
      <div class="cta-band__actions">
        <a class="btn btn--primary btn--lg" href="${primary.href}">${icon("send")}<span>${esc(primary.label)}</span></a>
        <a class="btn btn--ghost btn--lg" href="${secondary.href}">${icon("link")}<span>${esc(secondary.label)}</span></a>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------- JSON-LD ---------- */
export function personLd() {
  const sameAs = doctor.socialOrder
    .filter((k) => k !== "email" && doctor.socials[k])
    .map((k) => doctor.socials[k]);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: doctor.nameAr,
    alternateName: doctor.nameEn,
    jobTitle: "طبيب",
    description: doctor.subtitle,
    url: site.origin + "/",
    email: `mailto:${doctor.email}`,
    image: site.origin + "/" + doctor.portrait,
    address: { "@type": "PostalAddress", addressLocality: doctor.city, addressCountry: "SA" },
    knowsAbout: ["التفكير السريري", "الأدلة الطبية", "التعليم الطبي", "الفلسفة"],
    sameAs,
  };
}

export { faqs };