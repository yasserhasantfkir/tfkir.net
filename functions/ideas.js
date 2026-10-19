/* ============================================================
   functions/ideas.js — صفحة المقالات (SSR للقائمة)
   ------------------------------------------------------------
   GET /ideas  →  يحقن بطاقات المقالات المنشورة من D1 داخل
   الصفحة الساكنة، فيراها محرك البحث والزائر قبل أي JavaScript.
   ============================================================ */
import { postCard, fetchAsset } from "./_render.js";

export async function onRequestGet({ request, env }) {
  const asset = await fetchAsset(env, request, "/ideas.html");
  if (!asset || !asset.ok) return asset;
  const html = await asset.text();

  if (!html.includes("<!--#POSTS_GRID-->")) {
    return new Response(html, {
      status: asset.status,
      headers: asset.headers,
    });
  }

  const res = await env.DB.prepare(
    `SELECT slug, title, excerpt, category, read_minutes, published_at, updated_at
       FROM posts WHERE status = 'published'
      ORDER BY COALESCE(published_at, updated_at) DESC
      LIMIT 60`
  ).all();

  const cards = (res.results || []).map(postCard).join("\n          ");

  const total = String((res.results || []).length);
  const out = html
    .replace("<!--#POSTS_GRID-->", cards || "")
    .replace(/(<span data-posts-count>)\d+(<\/span>)/, (m, a, b) => a + total + b)
    .replace(
      /<p class="empty-note" id="idea-empty" hidden>/,
      cards ? '<p class="empty-note" id="idea-empty" hidden>' : '<p class="empty-note" id="idea-empty">'
    );

  const headers = new Headers(asset.headers);
  headers.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=120");
  headers.delete("Content-Length");
  headers.delete("ETag");
  headers.delete("Last-Modified");
  headers.delete("Content-Encoding");

  return new Response(out, { status: 200, headers });
}