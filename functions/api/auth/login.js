/* ============================================================
   functions/api/auth/login.js — تسجيل الدخول
   POST /api/auth/login   { username, password }
   ============================================================ */
import {
  json, ok, fail, readJson, verifyPassword, createSession,
  clientIp, isLocked, logAttempt, sameOrigin, clamp,
} from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);

  const body = await readJson(request);
  if (!body) return fail("bad_json", 400);

  const username = clamp(body.username, 64);
  const password = String(body.password == null ? "" : body.password);
  if (!username || !password) return fail("missing_credentials", 422);

  const ip = clientIp(request);
  if (await isLocked(env, ip, username)) {
    return json({ ok: false, error: "locked" }, 429, { "Retry-After": "900" });
  }

  const user = await env.DB.prepare(
    `SELECT id, username, username_lower, display_name, password_hash, must_change
       FROM users WHERE username_lower = ?`
  )
    .bind(username.toLowerCase())
    .first();

  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  await logAttempt(env, ip, username, valid);

  if (!valid) return fail("invalid_credentials", 401);

  const { cookie } = await createSession(env, user.id, request);
  await env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`)
    .bind(user.id)
    .run();

  return ok(
    {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        mustChange: user.must_change === 1,
      },
      message: user.must_change === 1 ? "must_change" : "welcome",
    },
    { "Set-Cookie": cookie }
  );
}

export async function onRequest() {
  return fail("method_not_allowed", 405);
}