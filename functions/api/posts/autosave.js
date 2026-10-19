/* ============================================================
   functions/api/posts/autosave.js — الحفظ التلقائي (Auto-draft)
   ------------------------------------------------------------
   POST /api/posts/autosave
     { id?, title, excerpt, content, category, tags }
   • ينشئ مقالًا إن لم يوجد id، ويحفظه كمسودة دائمًا.
   • يحتفظ بآخر ٣٠ لقطة في جدول revisions (شبكة أمان).
   • يُرجع: { post, chars, words, readMinutes, savedAt }
   ============================================================ */
import {
  ok, fail, readJson, currentUser, sameOrigin, clamp, idOf,
  sanitizeHtml, toPlainText, readMinutes, uniqueSlug, slugify,
  parseTags, rowToPost,
} from "../../_lib.js";

const MAX = { title: 200, excerpt: 600, content: 300000 };
const KEEP_REVISIONS = 30;

const SELECT = `SELECT id, slug, title, excerpt, content, content_text, category, tags, cover,
                       status, featured, read_minutes, created_at, updated_at, published_at
                  FROM posts WHERE id = ?`;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  const me = await currentUser(env, request);
  if (!me) return fail("unauthorized", 401);

  const body = await readJson(request);
  if (!body) return fail("bad_json", 400);

  const title = clamp(body.title, MAX.title);
  const raw = String(body.content || "");
  const clean = await sanitizeHtml(raw);
  const text = toPlainText(clean);
  const chars = raw.length;

  /* لا نلمس أي شيء فارغ — حتى لا تتكدّس مسودات فارغة */
  if (!title && !clean.trim()) {
    return ok({ skipped: true, chars, reason: "empty" });
  }

  const excerpt = clamp(body.excerpt, MAX.excerpt) || text.slice(0, 240);
  const minutes = readMinutes(text);
  const tags = JSON.stringify(parseTags(body.tags));
  const category = clamp(body.category, 60) || "تأملات";
  const id = clamp(body.id, 40);

  const existing = id ? await env.DB.prepare(SELECT).bind(id).first() : null;

  let postId = existing?.id;
  if (!postId) {
    postId = idOf();
    const slug = await uniqueSlug(env, slugify(title, `post-${postId.slice(0, 6)}`));
    await env.DB.prepare(
      `INSERT INTO posts (id, slug, title, excerpt, content, content_text, category, tags, status, read_minutes, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
    )
      .bind(postId, slug, title || "مقال بلا عنوان", excerpt, clean, text, category, tags, minutes, me.id)
      .run();
  } else {
    const slug = existing.slug || (await uniqueSlug(env, slugify(title, `post-${postId.slice(0, 6)}`), postId));
    await env.DB.prepare(
      `UPDATE posts
          SET title = ?, excerpt = ?, content = ?, content_text = ?, category = ?,
              tags = ?, read_minutes = ?, slug = ?, updated_at = datetime('now')
        WHERE id = ?`
    )
      .bind(title || "مقال بلا عنوان", excerpt, clean, text, category, tags, minutes, slug, postId)
      .run();
  }

  /* لقطة أمان */
  await env.DB.prepare(
    `INSERT INTO revisions (post_id, title, excerpt, content, content_text, chars)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(postId, title, excerpt, clean, text, chars)
    .run();
  await env.DB.prepare(
    `DELETE FROM revisions WHERE post_id = ? AND id NOT IN
       (SELECT id FROM revisions WHERE post_id = ? ORDER BY id DESC LIMIT ${KEEP_REVISIONS})`
  )
    .bind(postId, postId)
    .run();

  const row = await env.DB.prepare(SELECT).bind(postId).first();
  return ok({
    post: rowToPost(row),
    chars,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
    readMinutes: minutes,
    savedAt: new Date().toISOString(),
  });
}

export async function onRequest() {
  return fail("method_not_allowed", 405);
}