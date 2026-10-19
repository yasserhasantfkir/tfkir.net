/* ============================================================
   functions/api/posts/index.js
   ------------------------------------------------------------
   GET  /api/posts?scope=published|all&q=…&category=…&limit=…
        • بلا جلسة → المنشور فقط، ودون متن المقالات إطلاقًا
        • مع جلسة  → الكل + المسودات + المتن الكامل للتحرير
   POST /api/posts   (يتطلب جلسة، ويُمنع قبل تغيير بيانات الدخول)
   ============================================================ */
import {
  ok, fail, readJson, requireEditor, sameOrigin, clamp, tooLarge,
  sanitizeHtml, toPlainText, readMinutes, slugify, uniqueSlug,
  parseTags, rowToPost, bumpPublishedCount, isoDate, idOf,
  LIST_COLS, LIST_COLS_FULL, MAX_CONTENT,
} from "../../_lib.js";

export const CATEGORIES = [
  "التفكير الطبي", "الأدلة", "التعليم", "الكتابة",
  "الممارسة", "المشاريع", "تأملات", "الصحة العامة", "أخرى",
];

/* ---------------- GET ---------------- */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const gate = await requireEditor(env, request);
  const me = gate.user;                      // غير مسجّل = منشور فقط
  const wantAll = me && url.searchParams.get("scope") === "all";

  const q = clamp(url.searchParams.get("q"), 80);
  const category = clamp(url.searchParams.get("category"), 60);
  const max = me ? 300 : 60;
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit"), 10) || max, max));

  const where = [];
  const params = [];

  if (!wantAll) where.push("status = 'published'");
  if (category && category !== "*" && category !== "الكل") {
    where.push("category = ?");
    params.push(category);
  }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    /* البحث في المتن متاح للمحرِّر فقط — يوفّر قراءة الأعمدة الثقيلة */
    if (me) {
      where.push("(title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\' OR content_text LIKE ? ESCAPE '\\')");
      params.push(like, like, like);
    } else {
      where.push("(title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\')");
      params.push(like, like);
    }
  }

  const sql =
    `SELECT ${me ? LIST_COLS_FULL : LIST_COLS}
       FROM posts
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY (status = 'published') DESC, COALESCE(published_at, updated_at) DESC
      LIMIT ?`;
  params.push(limit);

  const res = await env.DB.prepare(sql).bind(...params).all();
  const posts = (res.results || []).map(rowToPost);

  /* العدّادات:.no تُكشف إلا للمحرِّر */
  const counts = me
    ? await env.DB.prepare(
        `SELECT SUM(status = 'published') AS published, SUM(status = 'draft') AS drafts,
                COUNT(*) AS total FROM posts`
      ).first()
    : await env.DB.prepare(`SELECT COUNT(*) AS published FROM posts WHERE status = 'published'`).first();

  return ok({
    posts,
    counts: me
      ? { published: counts?.published || 0, drafts: counts?.drafts || 0, total: counts?.total || 0 }
      : { published: counts?.published || 0 },
    categories: CATEGORIES,
    scope: wantAll ? "all" : "published",
  });
}

/* ---------------- POST: إنشاء ---------------- */
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  if (tooLarge(request)) return fail("payload_too_large", 413);

  const gate = await requireEditor(env, request);
  if (gate.response) return gate.response;
  const me = gate.user;

  const body = await readJson(request);
  if (!body) return fail("bad_json", 400);

  const title = clamp(body.title, 200);
  const clean = sanitizeHtml(body.content);
  const text = toPlainText(clean);

  if (!title && !clean.trim()) {
    return fail("validation", 422, { fields: ["title"], message: "اكتب عنوانًا أو نصًّا أولًا" });
  }

  const id = idOf();
  const slug = await uniqueSlug(env, clamp(body.slug, 100) || slugify(title, `post-${id.slice(0, 6)}`));
  const publish = body.status === "published";

  const category = CATEGORIES.includes(body.category) ? body.category : "تأملات";
  const excerpt = clamp(body.excerpt, 600) || text.slice(0, 240);
  const cover = clamp(body.cover, 400) || null;
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
    `SELECT ${LIST_COLS_FULL} FROM posts WHERE id = ?`
  )
    .bind(id)
    .first();

  return ok({ post: rowToPost(row) }, { status: 201 });
}

export async function onRequest() {
  return fail("method_not_allowed", 405);
}

export { MAX_CONTENT };