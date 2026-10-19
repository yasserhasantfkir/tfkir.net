/* ============================================================
   functions/api/posts/[id].js
   ------------------------------------------------------------
   GET    /api/posts/:id            (منشور للجميع، المسودات للمحرِّر فقط)
   PUT    /api/posts/:id            تعديل كامل (نص/عنوان/تصنيف/وسوم/نشر)
   PATCH  /api/posts/:id            تغيير الحالة فقط (نشر ↔ مسودة)
   DELETE /api/posts/:id            حذف نهائي
   ============================================================ */
import {
  ok, fail, readJson, requireEditor, sameOrigin, clamp, tooLarge,
  sanitizeHtml, toPlainText, readMinutes, uniqueSlug, slugify,
  parseTags, rowToPost, bumpPublishedCount, isoDate, LIST_COLS_FULL,
} from "../../_lib.js";

const CATEGORIES = [
  "التفكير الطبي", "الأدلة", "التعليم", "الكتابة",
  "الممارسة", "المشاريع", "تأملات", "الصحة العامة", "أخرى",
];

const SELECT = `SELECT ${LIST_COLS_FULL} FROM posts WHERE id = ?`;

export async function onRequestGet({ request, env, params }) {
  const me = await requireEditor(env, request).then((g) => g.user || null);

  /* نقبل المعرّف أو slug — لاستدعاءات الزائر بلا جلسة */
  const row = await env.DB.prepare(
    `SELECT ${LIST_COLS_FULL} FROM posts WHERE id = ? OR slug = ? LIMIT 1`
  )
    .bind(params.id, params.id)
    .first();

  /* 404 في الحالتين حتى لا يُستدل على وجود المسودات */
  if (!row) return fail("not_found", 404);
  if (row.status !== "published" && (!me || me.id !== row.author_id)) return fail("not_found", 404);
  return ok({ post: rowToPost(row) });
}

export async function onRequestPut({ request, env, params }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  if (tooLarge(request)) return fail("payload_too_large", 413);

  const gate = await requireEditor(env, request);
  if (gate.response) return gate.response;

  const existing = await env.DB.prepare(SELECT).bind(params.id).first();
  if (!existing) return fail("not_found", 404);

  const body = await readJson(request);
  if (!body) return fail("bad_json", 400);

  const title = clamp(body.title, 200);
  const clean = sanitizeHtml(body.content ?? existing.content ?? "");
  const text = toPlainText(clean);
  if (!title && !clean.trim()) return fail("validation", 422, { fields: ["title"] });

  const wantedSlug = clamp(body.slug, 100);
  const slug = wantedSlug
    ? await uniqueSlug(env, wantedSlug, existing.id)
    : existing.slug || (await uniqueSlug(env, slugify(title, `post-${params.id.slice(0, 6)}`), existing.id));

  const category = CATEGORIES.includes(body.category) ? body.category : existing.category;
  const excerpt = clamp(body.excerpt, 600) || text.slice(0, 240);
  const cover = body.cover === undefined ? existing.cover : clamp(body.cover, 400) || null;
  const tags = JSON.stringify(parseTags(body.tags ?? parseTags(existing.tags)));
  const minutes = readMinutes(text);
  const featured = body.featured ? 1 : 0;
  const nextStatus = body.status === "published" || body.status === "draft" ? body.status : existing.status;

  let publishedAt = existing.published_at;
  if (nextStatus === "published" && !existing.published_at) publishedAt = isoDate(new Date());
  if (nextStatus === "draft") publishedAt = null;

  await env.DB.prepare(
    `UPDATE posts
        SET slug = ?, title = ?, excerpt = ?, content = ?, content_text = ?,
            category = ?, tags = ?, cover = ?, status = ?, featured = ?,
            read_minutes = ?, published_at = ?, updated_at = datetime('now')
      WHERE id = ?`
  )
    .bind(
      slug, title || "مقال بلا عنوان", excerpt, clean, text, category, tags,
      cover, nextStatus, featured, minutes, publishedAt, params.id
    )
    .run();

  await bumpPublishedCount(env);
  return ok({ post: rowToPost(await env.DB.prepare(SELECT).bind(params.id).first()) });
}

export async function onRequestPatch({ request, env, params }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  if (tooLarge(request)) return fail("payload_too_large", 413);
  const gate = await requireEditor(env, request);
  if (gate.response) return gate.response;

  const body = await readJson(request);
  if (!body) return fail("bad_json", 400);

  const status = body.status === "published" ? "published" : "draft";
  const existing = await env.DB.prepare(`SELECT id, status, published_at FROM posts WHERE id = ?`)
    .bind(params.id)
    .first();
  if (!existing) return fail("not_found", 404);

  await env.DB.prepare(
    `UPDATE posts
        SET status = ?, published_at = ?, updated_at = datetime('now')
      WHERE id = ?`
  )
    .bind(status, status === "published" ? existing.published_at || isoDate(new Date()) : null, params.id)
    .run();

  await bumpPublishedCount(env);
  return ok({ post: rowToPost(await env.DB.prepare(SELECT).bind(params.id).first()) });
}

export async function onRequestDelete({ request, env, params }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  if (tooLarge(request)) return fail("payload_too_large", 413);
  const gate = await requireEditor(env, request);
  if (gate.response) return gate.response;

  const res = await env.DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(params.id).run();
  await env.DB.prepare(`DELETE FROM revisions WHERE post_id = ?`).bind(params.id).run();
  if (!res.meta?.changes) return fail("not_found", 404);

  await bumpPublishedCount(env);
  return ok({ deleted: true, id: params.id });
}

export async function onRequest() {
  return fail("method_not_allowed", 405);
}