/* ============================================================
   functions/_render.js — بناء HTML للمقالات المنشورة (SSR)
   ------------------------------------------------------------
   يُستخدم في /article و /ideas حتى يظهر المحتوى في مصدر الصفحة
   لمحركات البحث، Working بدون JavaScript أيضًا.
   ============================================================ */

export const esc = (s = "") =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const arDigits = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

export function dateAr(iso) {
  const s = String(iso || "");
  const d = new Date(s.length <= 10 ? s + "T12:00:00Z" : s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  return `${arDigits(d.getUTCDate())} ${AR_MONTHS[d.getUTCMonth()]} ${arDigits(d.getUTCFullYear())}`;
}

export const readLabel = (n) => `${arDigits(Math.max(1, Number(n) || 1))} دقائق قراءة`;

export const articleHref = (slug) => `/article?id=${encodeURIComponent(slug)}`;

/** بطاقة مقال في الشبكة — تطابق بنية .post-card في الموقع */
export function postCard(p) {
  return `<a class="post-card" href="${esc(articleHref(p.slug))}" data-reveal data-cat="${esc(p.category)}">
            <div class="post-card__meta">
              <span class="post-card__cat">${esc(p.category)}</span>
              <span>${esc(dateAr(p.published_at || p.updated_at))}</span>
              <span>${esc(readLabel(p.read_minutes))}</span>
            </div>
            <h2 class="post-card__title">${esc(p.title)}</h2>
            <p class="post-card__excerpt">${esc(p.excerpt)}</p>
            <div class="post-card__foot">
              <span class="post-card__read">اقرأ المقال</span>
            </div>
          </a>`;
}

/** يستبدل نصًّا واحدًا فقط، ويعيد null إن لم يوجد */
export function replaceOnce(html, needle, replacement) {
  if (!html.includes(needle)) return null;
  return html.replace(needle, () => replacement);
}

/**
 * يجلب صفحة ساكنة من طبقة الأصول.
 * الطبقة تحوّل /page.html ← /page، لذا نتبع التحويلات حتى ٣ قفزات
 * (مع منع التكرار اللانهائي).
 */
export async function fetchAsset(env, request, path) {
  const origin = new URL(request.url).origin;
  let url = new URL(path, origin).toString();
  for (let hop = 0; hop < 3; hop++) {
    const res = await env.ASSETS.fetch(new Request(url, { redirect: "manual" }));
    if (res.status < 300 || res.status >= 400) return res;
    const loc = res.headers.get("location");
    if (!loc) return res;
    let next;
    try { next = new URL(loc, url).toString(); } catch { return res; }
    if (next === url || !next.startsWith(origin)) return res;   /* نلتزم بنفس الأصل */
    url = next;
  }
  return new Response("", { status: 404 });
}

/** تحديث وسوم <head> لصفحة المقال */
export function setMeta(html, patch) {
  let out = html;
  /* نستعمل دالة استبدال دائمًا: $& و $` داخل النص لهما معنى خاص */
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(patch.title)}</title>`);
  out = out.replace(
    /(<meta name="description" content=")[^"]*(")/,
    (m, a, b) => a + esc(patch.description || "") + b
  );
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, a, b) => a + esc(patch.url) + b);
  const og = [
    ["og:title", patch.title],
    ["og:description", patch.description || ""],
    ["og:url", patch.url],
    ["og:type", "article"],
  ];
  for (const [prop, value] of og) {
    out = out.replace(
      new RegExp(`(<meta property="${prop}" content=")[^"]*(")`),
      (m, a, b) => a + esc(value) + b
    );
  }
  return out;
}