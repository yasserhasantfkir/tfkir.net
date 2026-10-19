/* ============================================================
   functions/api/auth/session.js — حالة الجلسة الحالية
   GET /api/auth/session
   ============================================================ */
import { ok, currentUser } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  return ok({ authenticated: !!user, user });
}