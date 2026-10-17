/* ============================================================
   functions/api/contact.js
   Cloudflare Pages Function — استقبال رسائل نموذج التواصل
   ------------------------------------------------------------
   السلوك الافتراضي (بلا أي إعداد):
     • يتحقق من صحة البيانات
     • يردّ بـ 503 ليعود الموقع إلى بريد المستخدم كبديل آمن
   بعد ضبط المتغيّرات السرّية التالية في إعدادات Pages:
     CONTACT_WEBHOOK_URL   → يمرّر البيانات كـ JSON إلى Webhook
     RESEND_API_KEY + CONTACT_TO  → يرسل بريدًا عبر Resend
   ============================================================ */

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;
const MAX = { name: 120, email: 200, phone: 40, subject: 120, message: 5000 };
const RATE = new Map(); // IP → عدد المحاولات
const RATE_MAX = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS, ...extra },
  });
}

function rateLimited(ip) {
  const now = Date.now();
  const hits = (RATE.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  RATE.set(ip, hits);
  if (RATE.size > 5000) RATE.clear(); // تفادي النمو اللانهائي
  return hits.length > RATE_MAX;
}

function clean(v, max) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

  if (rateLimited(ip)) {
    return json({ ok: false, error: "too_many" }, 429);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  // مصيدة الرسائل الآلية — نعيد نجاحًا كاذعًا دون تنفيذ
  if (payload && typeof payload.website === "string" && payload.website.trim() !== "") {
    return json({ ok: true, queued: true }, 200);
  }

  const data = {
    name: clean(payload?.name, MAX.name),
    email: clean(payload?.email, MAX.email),
    phone: clean(payload?.phone, MAX.phone),
    subject: clean(payload?.subject, MAX.subject),
    message: String(payload?.message == null ? "" : payload.message).trim().slice(0, MAX.message),
    consent: payload?.consent === true,
  };

  const errors = [];
  if (data.name.length < 2) errors.push("name");
  if (!EMAIL_RE.test(data.email)) errors.push("email");
  if (!data.subject) errors.push("subject");
  if (data.message.length < 20) errors.push("message");
  if (!data.consent) errors.push("consent");
  if (errors.length) return json({ ok: false, error: "validation", fields: errors }, 422);

  // ---- 1) Webhook ----
  if (env?.CONTACT_WEBHOOK_URL) {
    try {
      const r = await fetch(env.CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source: "tfkir.net", at: new Date().toISOString() }),
      });
      if (r.ok) return json({ ok: true, via: "webhook" }, 200);
    } catch {
      /* نتابع للمحاولة التالية */
    }
  }

  // ---- 2) Resend ----
  if (env?.RESEND_API_KEY && env?.CONTACT_TO) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.CONTACT_FROM || "tfkir.net <onboarding@resend.dev>",
          to: [env.CONTACT_TO],
          reply_to: data.email,
          subject: `[${data.subject}] من ${data.name}`,
          text:
            `${data.message}\n\n—\nالاسم: ${data.name}\nالبريد: ${data.email}` +
            (data.phone ? `\nالهاتف: ${data.phone}` : "") +
            `\nIP: ${ip}`,
        }),
      });
      if (r.ok) return json({ ok: true, via: "resend" }, 200);
    } catch {
      /* نتابع للبديل */
    }
  }

  // ---- 3) لا يوجد قناة إرسال: أبلغ العميل ليعود إلى mailto ----
  return json({ ok: false, error: "no_channel" }, 503);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequest() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}