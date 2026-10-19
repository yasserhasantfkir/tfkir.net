/* ============================================================
   functions/_lib.js — أدوات مشتركة لدوال الصفحات
   ------------------------------------------------------------
   • تشفير كلمات المرور (PBKDF2-SHA256 عبر Web Crypto)
   • جلسات بكوكي HttpOnly (يُخزَّن SHA-256 من التوكن فقط)
   • تنظيف HTML بقائمة سماح صارمة (HTMLRewriter)
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

export const nowIso = () => new Date().toISOString().replace("T", " ").slice(0, 19);

/* ------------------------------------------------------------
   2) كلمات المرور — pbkdf2_sha256$<iters>$<saltB64>$<hashB64>
   ------------------------------------------------------------ */
/* حد التكرار: دوال Pages على الخطة المجانية تُمنح وقت معالج محدود جدًا،
   فالقيم الكبيرة (مثل 210000) تُسقط الطلب بخطأ معالج. 10000 مناسب هنا،
   ويزيد التكرار متى أُضيفت خطة مدفوعة (تظهر المتغيّرات أدناه). */
const PBKDF2_ITERS = 10000;

const fromB64 = (b64) => {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
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
    if (scheme !== "pbkdf2_sha256") return false;
    const expected = fromB64(hash);
    const actual = await pbkdf2(password, fromB64(salt), Number(iters) || PBKDF2_ITERS);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------
   3) الجلسات
   ------------------------------------------------------------ */
export const COOKIE = "tfkir_sid";
const SESSION_DAYS = 30;

export function cookieHeader(token, days = SESSION_DAYS) {
  /* الموقع يعمل على HTTPS دائمًا (HSTS مفعّل)، فلا حاجة لفحص البروتوكول */
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
  /* تنظيف الجلسات المنتهية (مرة كل تسجيل دخول) */
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
    `SELECT u.id, u.username, u.display_name, u.must_change, u.created_at, u.last_login_at, s.expires_at
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

/* حماية CSRF: الطلبات المغيِّرة للحالة يجب أن تأتي من نفس الأصل */
export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // fetch من نفس الأصل قد لا يرسل Origin في كل الحالات
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   4) حماية من التخمين
   ------------------------------------------------------------ */
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

export async function isLocked(env, ip, username) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts
      WHERE ok = 0 AND at > datetime('now', '-30 minutes')
        AND (ip = ? OR username = ?)`
  )
    .bind(ip, username.toLowerCase())
    .first();
  return (row?.n || 0) >= MAX_FAILS;
}

export async function logAttempt(env, ip, username, okFlag) {
  await env.DB.prepare(
    `INSERT INTO login_attempts (ip, username, ok) VALUES (?, ?, ?)`
  )
    .bind(ip, username.slice(0, 64), okFlag ? 1 : 0)
    .run();
  if (Math.random() < 0.12) {
    env.DB.prepare(`DELETE FROM login_attempts WHERE at < datetime('now', '-1 day')`).run().catch(() => {});
  }
}

/* ------------------------------------------------------------
   5) تنظيف HTML — قائمة سماح صارمة
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

const STYLE_PROPS = new Set([
  "font-size", "color", "background-color", "font-family",
  "text-align", "font-weight", "font-style", "text-decoration",
  "line-height", "letter-spacing",
]);

const STYLE_RE = /^[a-zA-Z0-9#%.,()'"\s+\-/_]+$/;

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
    if (/url\s*\(|expression|@import|javascript:/i.test(val)) continue;
    out.push(`${prop}: ${val}`);
    if (out.length >= 8) break;
  }
  return out.join("; ");
};

const safeUrl = (v, { allowData = false } = {}) => {
  const s = Array.from(String(v || "").trim())
    .filter(function (ch) { var c = ch.charCodeAt(0); return c > 32 && c !== 127; })
    .join("");
  if (!s) return "";
  if (/^(https?:)\/\//i.test(s)) return s;
  if (/^\/(?!\/)/.test(s)) return s;
  if (allowData && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(s)) return s;
  if (/^(mailto|tel):/i.test(s)) return s;
  return "";
};

const sanitizeAttrs = (tag, attrs) => {
  const kept = [];
  for (const [rawName, rawVal] of Object.entries(attrs || {})) {
    const name = rawName.toLowerCase();
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
    if (["colspan", "rowspan", "dir", "lang"].includes(name)) {
      const n = parseInt(rawVal, 10);
      if (!Number.isNaN(n) && name !== "dir" && name !== "lang") kept.push([name, String(Math.min(n, 12))]);
      else if ((name === "dir" || name === "lang") && /^[a-zA-Z-]{2,12}$/.test(String(rawVal))) kept.push([name, String(rawVal)]);
    }
  }
  return kept;
};

/* مُحلِّل وسوم صغير — يحوّل HTML إلى قائمة رموز */
const VOID_TAGS = new Set([
  "br", "hr", "img", "wbr", "col", "area", "base", "input", "link", "meta", "source", "embed", "track",
]);

const TOKEN_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*?)\/?\s*>/g;

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

const escapeText = (s) =>
  String(s).replace(/&(?![a-zA-Z#][a-zA-Z0-9]{0,10};)/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");

const decodeAttr = (v) =>
  String(v == null ? "" : v)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Math.min(parseInt(d, 10), 0x10ffff)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const parseAttrs = (raw) => {
  const out = {};
  const re = new RegExp(ATTR_RE.source, "g");
  let m;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    if (name in out) continue;
    out[name] = decodeAttr(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
};

const renderAttrs = (kept) =>
  kept.map(([k, v]) => ` ${k}="${String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`).join("");

/* وسوم يُسقَط محتواها كاملًا (لا يُبقى نصّه) */
const DROP_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template",
  "svg", "math", "form", "input", "button", "select", "option", "textarea",
  "link", "meta", "base", "title", "head", "applet", "frame", "frameset",
  "audio", "video", "source", "track", "canvas", "map", "dialog", "slot",
]);

/**
 * ينقّي HTML بقائمة سماح صارمة — دون أي اعتماد خارجي.
 * • كل وسم خارج القائمة يُزال، ومحتواهSensitive (script/style/iframe…) يُسقَط كليًا
 * • كل سمة خارج القائمة تُحذف، والروابط تُفلتر
 * • النص بين الوسوم يُهرَّب دائمًا
 */
export function sanitizeHtml(html) {
  const input = String(html == null ? "" : html).slice(0, 400000);
  if (!input.trim()) return "";

  const out = [];
  const open = [];
  let skip = null;          /* اسم الوسم الذي نُسقط محتواه */
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;

  while ((m = TOKEN_RE.exec(input)) !== null) {
    const text = input.slice(last, m.index);
    if (text && !skip) out.push(escapeText(decodeAttr(text)));
    last = TOKEN_RE.lastIndex;

    const whole = m[0];
    if (whole.startsWith("<!")) continue;                 /* تعليقات و doctype و CDATA */

    const rawTag = (m[1] || "").toLowerCase();
    const closing = whole[1] === "/";

    if (skip) {
      if (rawTag === skip) {
        if (closing) skip = null;
        else if (!whole.endsWith("/>")) { /* متداخل: نُبقي الإسقاط إلى وسم الإغلاق */ }
      }
      continue;
    }

    if (closing) {
      const at = open.lastIndexOf(rawTag);
      if (at === -1) continue;                            /* وسم إغلاق بلا فتح */
      while (open.length > at) out.push(`</${open.pop()}>`);
      continue;
    }

    if (DROP_TAGS.has(rawTag)) {
      if (!whole.endsWith("/>") && !VOID_TAGS.has(rawTag)) skip = rawTag;
      continue;
    }
    if (!ALLOWED_TAGS.has(rawTag)) continue;               /* يُسقَط الوسم ويبقى نصّه */

    const attrs = parseAttrs(m[2] || "");
    out.push(`<${rawTag}${renderAttrs(sanitizeAttrs(rawTag, attrs))}>`);
    if (!VOID_TAGS.has(rawTag) && !whole.endsWith("/>")) open.push(rawTag);
  }

  if (!skip) {
    const tail = input.slice(last);
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
  "id, slug, title, excerpt, category, tags, cover, status, featured, read_minutes, created_at, updated_at, published_at";

export const rowToPost = (r) =>
  r && {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    content: r.content_text === undefined ? undefined : r.content,
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

export async function uniqueSlug(env, desired, excludeId = "") {
  let base = slugify(desired);
  let slug = base;
  let i = 2;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const row = await env.DB.prepare(`SELECT id FROM posts WHERE slug = ?`)
      .bind(slug)
      .first();
    if (!row || row.id === excludeId) return slug;
    slug = `${base}-${i++}`;
    if (i > 200) return `${base}-${Date.now()}`;
  }
  /* eslint-enable no-await-in-loop */
}

export function postUrl(slug) {
  return `/article?id=${encodeURIComponent(slug)}`;
}

export async function bumpPublishedCount(env) {
  await env.DB.prepare(
    `INSERT INTO kv_stats (k, v, updated_at) VALUES ('published', '0', datetime('now'))
     ON CONFLICT(k) DO UPDATE SET v = '0', updated_at = datetime('now')`
  ).run();
  await env.DB.prepare(
    `UPDATE kv_stats SET v = (SELECT COUNT(*) FROM posts WHERE status='published'), updated_at = datetime('now') WHERE k='published'`
  ).run();
}

void dec;