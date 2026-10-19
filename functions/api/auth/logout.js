/* ============================================================
   functions/api/auth/logout.js — إنهاء الجلسة
   POST /api/auth/logout
   ============================================================ */
import { ok, fail, clearCookie, destroySession, sameOrigin } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  await destroySession(env, request);
  return ok({ loggedOut: true }, { "Set-Cookie": clearCookie() });
}

export async function onRequest({ request, env }) {
  await destroySession(env, request);
  return fail("method_not_allowed", 405, {}, { "Set-Cookie": clearCookie() });
}
