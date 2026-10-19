/* ============================================================
   functions/article.js — صفحة المقال (SSR +hydratصION)
   ------------------------------------------------------------
   • GET /article?id=<slug>
   • إذا وُجد المقال في D1 منشورًا: يُعاد بناء الصفحة من الأصل
     مع حقن المحتوى داخل الصفحة (يحصل الزائر وبوت البحث على النص).
   • غير ذلك: نمرّر الطلب إلى أصل الصفحة الساكنة بلا تغيير.
   ============================================================ */
import { esc, dateAr, readLabel, setMeta, articleHref, fetchAsset } from "./_render.js";
import { jsonSafe, sanitizeHtml } from "./_lib.js";

/** يُعيد استجابة الأصل كما هي */
const passthrough = (env, request) => fetchAsset(env, request, "/article.html");

const toPlain = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const slug = (new URL(request.url).searchParams.get("id") || "").trim();
  if (!slug || slug.length > 120) return passthrough(env, request);

  const post = await env.DB.prepare(
    `SELECT slug, title, excerpt, content, content_text, category, tags, cover,
            read_minutes, published_at, updated_at
       FROM posts WHERE slug = ? AND status = 'published'`
  )
    .bind(slug)
    .first();

  if (!post) return passthrough(env, request);

  const base = await passthrough(env, request);
  if (!base || !base.ok) return base;
  let html = await base.text();

  const title = `${post.title} | تفكير.نت`;
  const description = (post.excerpt || toPlain(post.content_text).slice(0, 200) || "").slice(0, 300);
  const canonical = new URL(articleHref(post.slug), origin).toString();

  html = setMeta(html, { title, description, url: canonical });
  /* الصفحة الثابتة تُوسم noindex (قالب فارغ) — نرفعها هنا لمقال حقيقي */
  html = html.replace(
    /<meta name="robots" content="noindex, follow">/,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'
  );

  const tags = (() => {
    try {
      const a = JSON.parse(post.tags || "[]");
      return Array.isArray(a) ? a.filter(Boolean).slice(0, 8) : [];
    } catch {
      return [];
    }
  })();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    articleSection: post.category,
    keywords: tags.join(", ") || undefined,
    inLanguage: "ar",
    author: { "@type": "Person", name: "الدكتور ياسر حسن" },
    publisher: { "@type": "Person", name: "الدكتور ياسر حسن" },
    mainEntityOfPage: canonical,
    isAccessibleForFree: true,
  };

  /* jsonSafe يمنع إغلاق وسم <script> عبر </script> في العنوان أو الوصف */
  const headExtra =
    `<link rel="alternate" type="application/rss+xml" title="${esc(title)}" href="/feed.xml">\n` +
    `<script type="application/ld+json">${jsonSafe(jsonLd)}</script>\n` +
    `<script>window.TFKIR_SSR_POST=${jsonSafe({
      id: post.slug,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      tags,
      read: readLabel(post.read_minutes),
      readMinutes: post.read_minutes,
      dateAr: dateAr(post.published_at || post.updated_at),
      date: (post.published_at || post.updated_at || "").slice(0, 10),
    })};</script>`;

  html = html.replace("</head>", `${headExtra}\n</head>`);

  /* حقن الترويسة */
  html = html
    .replace(
      /(<span class="kicker" id="article-cat">)[^<]*(<\/span>)/,
      (m, a, b) => a + esc(post.category) + b
    )
    .replace(
      /(<h1 class="article__title" id="article-title">)[^<]*(<\/h1>)/,
      (m, a, b) => a + esc(post.title) + b
    )
    .replace(
      /(<time id="article-date"[^>]*>)[^<]*(<\/time>)/,
      (m, a, b) => a + esc(dateAr(post.published_at || post.updated_at)) + b
    )
    .replace(
      /(<span id="article-read">)[^<]*(<\/span>)/,
      (m, a, b) => a + esc(readLabel(post.read_minutes)) + b
    );

  /* إزالة "hidden" من الترويسة (تعتمد عليها JS لإظهارها) */
  html = html.replace(
    /<header class="article__head" id="article-head" hidden>/,
    '<header class="article__head" id="article-head">'
  );

  /* حقن المحتوى + إخفاء مؤشّر التحميل */
  html = html.replace(
    /<div class="prose" id="article-body" hidden>\s*<\/div>/,
    `<div class="prose" id="article-body">${sanitizeHtml(post.content || "")}</div>`
  );
  html = html.replace(
    /<div class="prose" id="article-loading"[\s\S]*?<\/div>\s*<\/section>/,
    '<div class="prose" id="article-loading" hidden></div>\n</section>'
  );

  const headers = new Headers(base.headers);
  headers.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=120");
  headers.set("X-Robots-Tag", "index, follow, max-image-preview:large");
  headers.delete("Content-Length");
  headers.delete("ETag");
  headers.delete("Last-Modified");
  headers.delete("Content-Encoding");

  return new Response(html, { status: 200, headers });
}