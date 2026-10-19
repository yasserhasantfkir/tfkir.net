/* ============================================================
   functions/_lib.js — أدوات مشتركة لدوال الصفحات
   ------------------------------------------------------------
   • تشفير كلمات المرور (PBKDF2-SHA256 عبر Web Crypto)
   • جلسات بكوكي HttpOnly (يُخزَّن SHA-256 من التوكن فقط)
   • تنظيف HTML بقائمة سماح صارمة (مُحلِّل خطّي بلا regex متشعّبة)
   • توليد الـ slug، النص الصِرف، وقت القراءة، التواريخ العربية
   ============================================================ */

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ------------------------------------------------------------
   1) أدوات عامة
   ------------------------------------------------------------ */
export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers,
    },
  });

export const ok = (body = {}, headers) => json({ ok: true, ...body }, 200, headers);
export const fail = (error, status = 400, extra = {}) => json({ ok: false, error, ...extra }, status);

/** JSON آمن للحقن داخل <script>: يمنع إغلاق الوسم عبر </script> */
export const jsonSafe = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export const b64url = (bytes) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const randomToken = (n = 32) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return b64url(a);
};

export const sha256hex = async (str) => {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const clamp = (v, max, fallback = "") => {
  const s = String(v == null ? "" : v).trim();
  return s.length > max ? s.slice(0, max) : s || fallback;
};

/* الحد الأقصى لحجم متن المقال ولقاعدة طلب JSON */
export const MAX_CONTENT = 300000;
export const MAX_BODY = 1200000;

/* ------------------------------------------------------------
   2) كلمات المرور — pbkdf2_sha256$<iters>$<saltB64>$<hashB64>
   ------------------------------------------------------------ */
/* حد التكرار: دوال Pages على الخطة المجانية تُمنح وقت معالج محدود جدًا،
   فالقيم الكبيرة (مثل 210000) تُسقط الطلب بخطأ معالج. 10000 مناسب هنا،
   ويُرفع إلى 210000 أو أكثر بعد الترقية إلى خطة مدفوعة. */
const PBKDF2_ITERS = 10000;
const ITERS_CAP = 210000;

/* بصمة وهمية تُستخدم عند عدم وجود المستخدم، حتى يستغرق المسار
  tle نفس الزمن ولا يُستدل على وجود اسم المستخدم من التأخير. */
const DUMMY_HASH = "pbkdf2_sha256$10000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const fromB64 = (b64) => {
  const bin = atob(String(b64).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function pbkdf2(password, salt, iters) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iters },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERS);
  return `pbkdf2_sha256$${PBKDF2_ITERS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, iters, salt, hash] = String(stored).split("$");
    if (scheme !== "pbkdf2_sha256" || !salt || !hash) return false;
    const n = Math.min(Math.max(parseInt(iters, 10) || PBKDF2_ITERS, 1000), ITERS_CAP);
    const expected = fromB64(hash);
    const actual = await pbkdf2(password, fromB64(salt), n);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

/** يشغّل KDF دائمًا حتى لا يكشف التأخيرُ وجودَ اسم المستخدم */
export async function checkPassword(password, stored) {
  const valid = await verifyPassword(password, stored || DUMMY_HASH);
  return stored ? valid : false;
}

/* ------------------------------------------------------------
   3) الجلسات
   ------------------------------------------------------------ */
export const COOKIE = "__Host-tfkir_sid";
const SESSION_DAYS = 30;

export function cookieHeader(token, days = SESSION_DAYS) {
  /* البادئة __Host- تجعل المتصفح يفرض: Secure + بلا Domain + Path=/ */
  return [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Secure",
    `Max-Age=${Math.floor(days * 86400)}`,
  ].join("; ");
}

export const clearCookie = () =>
  `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`;

const readCookie = (request) => {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return "";
};

export const clientIp = (request) =>
  request.headers.get("CF-Connecting-IP") ||
  (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
  "0.0.0.0";

export async function createSession(env, userId, request) {
  const token = randomToken(32);
  const tokenHash = await sha256hex(token);
  const days = SESSION_DAYS;
  const expires = new Date(Date.now() + days * 86400 * 1000).toISOString().replace("T", " ").slice(0, 19);
  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, ip, agent)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(tokenHash, userId, expires, clientIp(request), clamp(request.headers.get("User-Agent"), 200))
    .run();
  env.DB.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run().catch(() => {});
  return { token, cookie: cookieHeader(token, days) };
}

export async function destroySession(env, request) {
  const token = readCookie(request);
  if (token) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`)
      .bind(await sha256hex(token))
      .run();
  }
}

/** يُعيد بيانات المستخدم إن وُجدت جلسة صالحة، وإلا null */
export async function currentUser(env, request) {
  const token = readCookie(request);
  if (!token) return null;
  const tokenHash = await sha256hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.must_change, u.created_at, u.last_login_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now')`
  )
    .bind(tokenHash)
    .first();
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    mustChange: row.must_change === 1,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

/**
 * بوابة التحرير: يجب أن تكون الجلسة صالحة **و** أن تكون بيانات الدخول
 * قد غُيّرت بالفعل. يُعيد { user } أو { response } (استجابة خطأ جاهزة).
 */
export async function requireEditor(env, request) {
  const user = await currentUser(env, request);
  if (!user) return { response: fail("unauthorized", 401) };
  if (user.mustChange) return { response: fail("must_change", 403) };
  return { user };
}

/* حماية CSRF: الطلبات المغيِّرة للحالة يجب أن تأتي من نفس الأصل */
export function sameOrigin(request) {
  const host = new URL(request.url).host;
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin" && site !== "none") return false;

  const origin = request.headers.get("Origin");
  if (!origin) return true; // عميل غير متصفّح: لا يمكن تنفيذ CSRF عليه
  if (origin === "null") return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** يمنع القراءات/الكتابات الضخمة قبل أي تحليل */
/** فحص سريع من ترويسة Content-Length (قد تكون غائبة مع chunked) */
export const tooLarge = (request) =>
  Number(request.headers.get("Content-Length") || 0) > MAX_BODY;

/**
 * يقرأ JSON مع سقف حقيقي على عدد البايتات (لا يثق بترويسة Content-Length).
 * يُعيد null عند تجاوز السقف أو الفشل.
 */
export async function readJson(request, max = MAX_BODY) {
  try {
    if (!request.body) return await request.json();
    const reader = request.body.getReader();
    const chunks = [];
    let total = 0;
    /* eslint-disable no-constant-condition */
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        try { await reader.cancel(); } catch {}
        return null;
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { merged.set(c, at); at += c.byteLength; }
    return JSON.parse(dec.decode(merged));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   4) حماية من التخمين
   ------------------------------------------------------------ */
const IP_MAX = 12;         // محاولة لكل IP / ١٥ دقيقة
const USER_MAX = 20;       // محاولة لكل اسم مستخدم / ٣٠ دقيقة
const USER_MIN_IPS = 3;    // ومن ٣ عناوين مختلفة (حماية من حجب الخدمة)

export async function isLocked(env, ip, username) {
  const byIp = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts
      WHERE ok = 0 AND ip = ? AND at > datetime('now', '-15 minutes')`
  )
    .bind(ip)
    .first();
  if ((byIp?.n || 0) >= IP_MAX) return true;

  const byUser = await env.DB.prepare(
    `SELECT COUNT(*) AS n, COUNT(DISTINCT ip) AS ips FROM login_attempts
      WHERE ok = 0 AND username = ? AND at > datetime('now', '-30 minutes')`
  )
    .bind(String(username || "").toLowerCase())
    .first();
  return (byUser?.n || 0) >= USER_MAX && (byUser?.ips || 0) >= USER_MIN_IPS;
}

export async function logAttempt(env, ip, username, okFlag) {
  await env.DB.prepare(`INSERT INTO login_attempts (ip, username, ok) VALUES (?, ?, ?)`)
    .bind(ip, String(username || "").toLowerCase().slice(0, 64), okFlag ? 1 : 0)
    .run();
  if (Math.random() < 0.12) {
    env.DB.prepare(`DELETE FROM login_attempts WHERE at < datetime('now', '-1 day')`).run().catch(() => {});
  }
}

/* ------------------------------------------------------------
   5) تنظيف HTML — قائمة سماح صارمة، مُحلِّل خطّي
   ------------------------------------------------------------ */
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "div", "span", "section", "article",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike", "del", "ins",
  "sub", "sup", "small", "mark", "abbr", "cite", "q",
  "ul", "ol", "li", "dl", "dt", "dd",
  "blockquote", "pre", "code", "kbd", "samp",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "font", "center",
]);

/* وسوم يُسقَط محتواها كاملًا (لا يُبقى نصّه) */
const DROP_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template",
  "svg", "math", "form", "input", "button", "select", "option", "textarea",
  "link", "meta", "base", "title", "head", "applet", "frame", "frameset",
  "audio", "video", "source", "track", "canvas", "map", "dialog", "slot",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "wbr", "col", "area", "base", "link", "meta", "source", "track", "embed"]);

const STYLE_PROPS = new Set([
  "font-size", "color", "background-color", "font-family",
  "text-align", "font-weight", "font-style", "text-decoration",
  "line-height", "letter-spacing",
]);

/* قيم CSS بلا أقواس ودوال إطلاقًا: يمنع url() و expression() و var() */
const STYLE_RE = /^[a-zA-Z0-9#%.,'"+\-/_ ]+$/;

const cleanStyle = (style) => {
  const out = [];
  for (const decl of String(style).split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (!STYLE_PROPS.has(prop)) continue;
    if (!val || val.length > 80) continue;
    if (!STYLE_RE.test(val)) continue;
    out.push(`${prop}: ${val}`);
    if (out.length >= 8) break;
  }
  return out.join("; ");
};

const safeUrl = (v, { allowData = false } = {}) => {
  /* إزالة محارف التحكم والمساند داخل الرابط */
  const s = Array.from(String(v == null ? "" : v).trim())
    .filter(function (ch) { var c = ch.charCodeAt(0); return c > 32 && c !== 127; })
    .join("");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/(?!\/)/.test(s)) return s;
  if (allowData && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(s)) return s;
  if (/^(mailto|tel):/i.test(s)) return s;
  return "";
};

const decodeAttr = (v) =>
  String(v == null ? "" : v)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Math.min(parseInt(d, 10), 0x10ffff)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const escapeText = (s) =>
  String(s)
    .replace(/&(?![a-zA-Z#][a-zA-Z0-9]{0,10};)/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttr = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sanitizeAttrs = (tag, attrs) => {
  const kept = [];
  for (const [rawName, rawVal] of Object.entries(attrs || {})) {
    const name = String(rawName).toLowerCase();
    if (name.startsWith("on") || name === "srcdoc" || name === "formaction") continue;
    if (name === "style") {
      const s = cleanStyle(rawVal);
      if (s) kept.push(["style", s]);
      continue;
    }
    if (tag === "a") {
      if (name === "href") {
        const u = safeUrl(rawVal);
        if (u) kept.push(["href", u], ["rel", "noopener noreferrer"], ["target", "_blank"]);
      } else if (name === "title") kept.push(["title", clamp(rawVal, 160)]);
      continue;
    }
    if (tag === "img") {
      if (name === "src") {
        const u = safeUrl(rawVal, { allowData: true });
        if (u) kept.push(["src", u]);
      } else if (name === "alt") kept.push(["alt", clamp(rawVal, 220)]);
      else if (name === "title") kept.push(["title", clamp(rawVal, 160)]);
      else if (name === "width" || name === "height") {
        const n = parseInt(rawVal, 10);
        if (Number.isFinite(n) && n > 0 && n <= 2400) kept.push([name, String(n)]);
      }
      continue;
    }
    if (["colspan", "rowspan"].includes(name)) {
      const n = parseInt(rawVal, 10);
      if (Number.isFinite(n) && n > 0) kept.push([name, String(Math.min(n, 12))]);
    } else if (name === "dir" || name === "lang") {
      if (/^[a-zA-Z-]{2,12}$/.test(String(rawVal))) kept.push([name, String(rawVal)]);
    }
  }
  return kept;
};

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

const ATTR_SCAN = new RegExp(ATTR_RE.source, "g");

const parseAttrs = (raw) => {
  const out = {};
  if (!raw) return out;
  ATTR_SCAN.lastIndex = 0;
  let m;
  while ((m = ATTR_SCAN.exec(raw)) !== null) {
    const name = m[1].toLowerCase();
    if (name in out) continue;
    out[name] = decodeAttr(m[2] ?? m[3] ?? m[4] ?? "");
    if (m.index === ATTR_SCAN.lastIndex) ATTR_SCAN.lastIndex += 1;
  }
  return out;
};

const renderAttrs = (kept) => kept.map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join("");

/* آخر استدعاء sanitizeHtml: هل قُصّ الإدخال؟ */
let wasTruncated = false;
export const wasHtmlTruncated = () => wasTruncated;

const isNameChar = (c) =>
  (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === ":" || c === "-";

/**
 * ينقّي HTML بقائمة سماح صارمة — مُحلِّل خطّي (بلا regex متشعّبة،
 * فلا مجال لهجوم ReDoS مهما كان الإدخال).
 * • كل وسم خارج القائمة يُزال، ومحتواه الحسّاس (script/style/iframe…) يُسقَط كليًا
 * • كل سمة خارج القائمة تُحذف، والروابط تُفلتر
 * • النص بين الوسوم يُهرَّب دائمًا
 */
export function sanitizeHtml(html, max = MAX_CONTENT) {
  const raw = String(html == null ? "" : html);
  const input = raw.slice(0, max);
  wasTruncated = raw.length > max;
  if (!input.trim()) return "";

  const n = input.length;
  const out = [];
  const open = [];
  const depth = new Map();     /* وسم → أعمق فهرس له في المكدّس */
  let skip = null;
  let i = 0;

  const pushText = (t) => {
    if (t && !skip) out.push(escapeText(decodeAttr(t)));
  };

  while (i < n) {
    const lt = input.indexOf("<", i);
    if (lt === -1) break;                       /* الذيل يُدرَج بعد الحلقة */
    pushText(input.slice(i, lt));

    /* تعليقات و CDATA و doctype */
    if (input.startsWith("<!--", lt)) {
      const e = input.indexOf("-->", lt + 4);
      i = e === -1 ? n : e + 3;
      continue;
    }
    if (input.startsWith("<![CDATA[", lt)) {
      const e = input.indexOf("]]>", lt + 9);
      i = e === -1 ? n : e + 3;
      continue;
    }
    if (input.startsWith("<!", lt) || input.startsWith("<?", lt)) {
      const e = input.indexOf(">", lt);
      i = e === -1 ? n : e + 1;
      continue;
    }

    let j = lt + 1;
    let closing = false;
    if (input[j] === "/") { closing = true; j += 1; }
    const nameStart = j;
    while (j < n && isNameChar(input[j])) j += 1;
    if (j === nameStart) { pushText("<"); i = lt + 1; continue; }

    const rawTag = input.slice(nameStart, j).toLowerCase();

    /* مسح حتى '>' مع احترام علامات التنصيص */
    let k = j;
    let quote = "";
    while (k < n) {
      const c = input[k];
      if (quote) {
        if (c === quote) quote = "";
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === ">") {
        break;
      }
      k += 1;
    }
    const selfClosing = k < n && input[k - 1] === "/";
    const attrRaw = input.slice(j, selfClosing ? k - 1 : k);
    i = k < n ? k + 1 : n;

    if (skip) {
      if (rawTag === skip && closing) skip = null;
      continue;
    }
    if (closing) {
      const at = depth.get(rawTag);
      if (at === undefined) continue;
      while (open.length > at) {
        const closed = open.pop();
        depth.delete(closed);
        out.push(`</${closed}>`);
      }
      continue;
    }
    if (DROP_TAGS.has(rawTag)) {
      if (!selfClosing && !VOID_TAGS.has(rawTag)) skip = rawTag;
      continue;
    }
    if (!ALLOWED_TAGS.has(rawTag)) continue;

    out.push(`<${rawTag}${renderAttrs(sanitizeAttrs(rawTag, parseAttrs(attrRaw)))}>`);
    if (!selfClosing && !VOID_TAGS.has(rawTag)) {
      open.push(rawTag);
      depth.set(rawTag, open.length - 1);
    }
  }

  if (!skip) {
    const tail = input.slice(i);
    if (tail) out.push(escapeText(decodeAttr(tail)));
  }
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("");
}

/** HTML → نص صِرف (للبحث + وقت القراءة) */
export const toPlainText = (html, max = 60000) =>
  String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

export const readMinutes = (text) => {
  const words = String(text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 190));
};

/* ------------------------------------------------------------
   6) slug + التواريخ العربية
   ------------------------------------------------------------ */
const DIACRITICS = /[ً-ْٰـ]/g;

export function slugify(input, fallback = "post") {
  let s = String(input || "")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[\s_/\\]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return s || fallback;
}

export const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

export function dateAr(iso) {
  const d = iso ? new Date(String(iso).replace(" ", "T") + (String(iso).length <= 10 ? "T12:00:00Z" : "Z")) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return `${toArabicDigits(d.getUTCDate())} ${AR_MONTHS[d.getUTCMonth()]} ${toArabicDigits(d.getUTCFullYear())}`;
}

export function isoDate(v) {
  const s = String(v || "").slice(0, 10).replace(/\//g, "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10);
}

export const idOf = () => crypto.randomUUID();

export function parseTags(v) {
  let arr = v;
  if (typeof v === "string") {
    try { arr = JSON.parse(v); } catch { arr = v.split(","); }
  }
  if (!Array.isArray(arr)) arr = String(v || "").split(/[,،]/);
  return [...new Set(arr.map((t) => clamp(t, 40)).filter(Boolean))].slice(0, 12);
}

/* ------------------------------------------------------------
   7) المقالات
   ------------------------------------------------------------ */
export const LIST_COLS =
  "id, slug, title, excerpt, category, tags, cover, status, featured, read_minutes, created_at, updated_at, published_at, author_id";

export const LIST_COLS_FULL = `${LIST_COLS}, content`;

export const rowToPost = (r) =>
  r && {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    content: r.content === undefined ? undefined : r.content,
    category: r.category,
    tags: parseTags(r.tags),
    cover: r.cover || null,
    status: r.status,
    featured: r.featured === 1,
    readMinutes: r.read_minutes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
  };

/** استعلام واحد يجمع كل الـ slugs المشغولة، ثم يُختار المتاح */
export async function uniqueSlug(env, desired, excludeId = "") {
  const base = slugify(desired);
  const res = await env.DB.prepare(`SELECT id, slug FROM posts WHERE slug = ? OR slug GLOB ?`)
    .bind(base, base + "-*")
    .all();
  const taken = new Set(
    (res.results || []).filter((r) => r.id !== excludeId).map((r) => r.slug)
  );
  if (!taken.has(base)) return base;
  for (let i = 2; i < 40; i++) {
    const cand = `${base}-${i}`;
    if (!taken.has(cand)) return cand;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export const postUrl = (slug) => `/article?id=${encodeURIComponent(slug)}`;

export async function bumpPublishedCount(env) {
  await env.DB.prepare(
    `INSERT INTO kv_stats (k, v, updated_at) VALUES ('published', '0', datetime('now'))
     ON CONFLICT(k) DO UPDATE SET v = (SELECT COUNT(*) FROM posts WHERE status = 'published'),
                                updated_at = datetime('now')`
  ).run();
}