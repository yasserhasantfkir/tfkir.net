/* ============================================================
   functions/api/auth/logout.js — إنهاء الجلسة
   POST /api/auth/logout
   ============================================================ */
import { ok, clearCookie, destroySession, sameOrigin } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return { ok: false };
  await destroySession(env, request);
  return ok({ loggedOut: true }, { "Set-Cookie": clearCookie() });
}

export async function onRequest() {
  return ok({}, { "Set-Cookie": clearCookie() });
}