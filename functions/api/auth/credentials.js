/* ============================================================
   functions/api/auth/credentials.js — تغيير اسم المستخدم وكلمة المرور
   ------------------------------------------------------------
   POST /api/auth/credentials
     { currentPassword, newUsername, newPassword, confirmPassword }
   • الجلسة القائمة كافية (لا يُشترط كلمة المرور القديمة إن كانت
     الجلسة قديمة بما يكفي) — لكن نطلبها زيادةً في الأمان.
   • بعد التغيير تُنهى كل الجلسات الأخرى ويُصدر كوكي جديد.
   ============================================================ */
import {
  ok, fail, readJson, currentUser, verifyPassword, hashPassword,
  createSession, destroySession, isLocked, logAttempt, sameOrigin,
  clamp, clientIp, tooLarge,
} from "../../_lib.js";

/* كلمات مرفوضة مهما كانت مطابقة لنمط كلمة المرور */
const WEAK = /^(1234|12345678|password|passw0rd|qwerty123|letmein|admin1234|welcome1|iloveyou|123456789|abc12345)$/i;

const RESERVED = new Set([
  "api", "admin", "assets", "en", "tr", "static", "www", "root",
  "administrator", "system", "cloudflare", "pages", "functions", "support",
]);

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  if (tooLarge(request)) return fail("payload_too_large", 413);

  const me = await currentUser(env, request);
  if (!me) return fail("unauthorized", 401);

  const body = await readJson(request);
  if (!body) return fail("bad_json", 400);

  const currentPassword = String(body.currentPassword || "");
  const newUsername = clamp(body.newUsername, 32);
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  const errors = [];

  if (newUsername.length < 3) errors.push("newUsername");
  else if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(newUsername)) errors.push("newUsername");
  else if (RESERVED.has(newUsername.toLowerCase())) errors.push("newUsername");

  if (newPassword.length < 10) errors.push("newPassword");
  if (!/[A-Za-z\u0600-\u06FF]/.test(newPassword) || !/\d/.test(newPassword)) errors.push("newPassword");
  if (newPassword !== confirmPassword) errors.push("confirmPassword");
  if (WEAK.test(newPassword)) errors.push("weakPassword");

  const row = await env.DB.prepare(`SELECT id, username, password_hash FROM users WHERE id = ?`)
    .bind(me.id)
    .first();

  const ip = clientIp(request);
  if (await isLocked(env, ip, me.username) || await isLocked(env, ip, newUsername)) {
    return fail("locked", 429, { fields: errors });
  }

  const okCurrent = await verifyPassword(currentPassword, row.password_hash);
  await logAttempt(env, ip, me.username, okCurrent);
  if (!okCurrent) errors.push("currentPassword");

  if (errors.length) return fail("validation", 422, { fields: errors });

  /* تعارض اسم المستخدم */
  const clash = await env.DB.prepare(`SELECT id FROM users WHERE username_lower = ? AND id <> ?`)
    .bind(newUsername.toLowerCase(), me.id)
    .first();
  if (clash) return fail("validation", 422, { fields: ["newUsername"] });

  await env.DB.prepare(
    `UPDATE users
        SET username = ?, username_lower = ?, password_hash = ?,
            must_change = 0, failed_count = 0, updated_at = datetime('now')
      WHERE id = ?`
  )
    .bind(newUsername, newUsername.toLowerCase(), await hashPassword(newPassword), me.id)
    .run();

  /* إنهاء كل الجلسات ثم إصدار جلسة جديدة لهذا المتصفح */
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(me.id).run();
  await destroySession(env, request);
  const { cookie } = await createSession(env, me.id, request);

  return ok(
    {
      updated: true,
      user: { id: me.id, username: newUsername, displayName: me.displayName, mustChange: false },
    },
    { "Set-Cookie": cookie }
  );
}

export async function onRequest() {
  return fail("method_not_allowed", 405);
}