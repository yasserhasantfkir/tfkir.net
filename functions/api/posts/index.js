/* ============================================================
   functions/api/posts/index.js
   ------------------------------------------------------------
   GET  /api/posts?scope=published|all|search=…&category=…&limit=…
        • بلا جلسة → المنشور فقط (محتوى مختصر للقوائم)
        • مع جلسة  → الكل + المسودات + المحتوى الكامل للتحرير
   POST /api/posts   (يتطلب جلسة)  → إنشاء مقال جديد
   ============================================================ */
import {
  ok, fail, readJson, currentUser, sameOrigin, clamp, idOf,
  sanitizeHtml, toPlainText, readMinutes, slugify, uniqueSlug,
  parseTags, rowToPost, bumpPublishedCount, isoDate,
} from "../../_lib.js";

const CATEGORIES = [
  "التفكير الطبي", "الأدلة", "التعليم", "الكتابة",
  "الممارسة", "المشاريع", "تأملات", "الصحة العامة", "أخرى",
];

const MAX = { title: 200, excerpt: 600, content: 300000, cover: 400 };

/* ---------------- GET ---------------- */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const me = await currentUser(env, request);
  const wantAll = url.searchParams.get("scope") === "all";
  const q = clamp(url.searchParams.get("q"), 80);
  const category = clamp(url.searchParams.get("category"), 60);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 300);

  const where = [];
  const params = [];

  if (!me || !wantAll) {
    where.push("status = 'published'");
  }
  if (category && category !== "*" && category !== "الكل") {
    where.push("category = ?");
    params.push(category);
  }
  if (q) {
    where.push("(title LIKE ? OR excerpt LIKE ? OR content_text LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const sql =
    `SELECT id, slug, title, excerpt, category, tags, cover, status, featured,
            read_minutes, created_at, updated_at, published_at, content, content_text
       FROM posts
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY (status = 'published') DESC, COALESCE(published_at, updated_at) DESC
      LIMIT ?`;
  params.push(limit);

  const res = await env.DB.prepare(sql).bind(...params).all();
  const rows = res.results || [];
  const posts = rows.map(rowToPost);

  const counts = await env.DB.prepare(
    `SELECT
       SUM(status = 'published') AS published,
       SUM(status = 'draft')     AS drafts,
       COUNT(*)                  AS total
     FROM posts`
  ).first();

  return ok({
    posts: posts.map((p) => (me ? p : { ...p, content: undefined })),
    counts: {
      published: counts?.published || 0,
      drafts: counts?.drafts || 0,
      total: counts?.total || 0,
    },
    categories: CATEGORIES,
    scope: me && wantAll ? "all" : "published",
  });
}

/* ---------------- POST: إنشاء ---------------- */
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  const me = await currentUser(env, request);
  if (!me) return fail("unauthorized", 401);

  const body = await readJson(request);
  if (!body) return fail("bad_json", 400);

  const title = clamp(body.title, MAX.title);
  const rawContent = String(body.content || "");
  const clean = await sanitizeHtml(rawContent);
  const text = toPlainText(clean);
  const id = idOf();
  const slug = await uniqueSlug(env, clamp(body.slug, 100) || slugify(title, `post-${id.slice(0, 6)}`));
  const publish = body.status === "published";

  if (!title && !clean.trim()) {
    return fail("validation", 422, { fields: ["title"], message: "اكتب عنوانًا أو نصًّا أولًا" });
  }

  const category = CATEGORIES.includes(body.category) ? body.category : "تأملات";
  const excerpt = clamp(body.excerpt, MAX.excerpt) || text.slice(0, 240);
  const cover = clamp(body.cover, MAX.cover) || null;
  const minutes = readMinutes(text);
  const tags = JSON.stringify(parseTags(body.tags));

  await env.DB.prepare(
    `INSERT INTO posts
       (id, slug, title, excerpt, content, content_text, category, tags, cover,
        status, featured, read_minutes, author_id, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
  )
    .bind(
      id, slug, title || "مقال بلا عنوان", excerpt, clean, text,
      category, tags, cover,
      publish ? "published" : "draft", minutes, me.id,
      publish ? isoDate(new Date()) : null
    )
    .run();

  if (publish) await bumpPublishedCount(env);

  const row = await env.DB.prepare(
    `SELECT id, slug, title, excerpt, content, content_text, category, tags, cover,
            status, featured, read_minutes, created_at, updated_at, published_at
       FROM posts WHERE id = ?`
  )
    .bind(id)
    .first();

  return ok({ post: rowToPost(row) }, { status: 201 });
}

export async function onRequest() {
  return fail("method_not_allowed", 405);
}

export { CATEGORIES, MAX };