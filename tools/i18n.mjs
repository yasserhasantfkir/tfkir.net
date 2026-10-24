/* ============================================================
   tools/i18n.mjs — نظام الترجمة وقت البناء
   يحلّل HTML العربي المولَّد، يستخرج كل وحدة قابلة للترجمة،
   ويطبّق قواميس tr/en على الشجرة ثم يعيد تسلسلها.
   لا مكتبات خارجية.
   ============================================================ */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);
const INLINE = new Set(["a", "abbr", "b", "bdi", "bdo", "br", "cite", "data", "del", "dfn", "em", "i", "ins", "kbd", "mark", "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "svg", "label", "button"]);
const ATTRS = ["title", "placeholder", "aria-label", "alt", "content"];
const SKIP_ELEMENTS = new Set(["script", "style", "pre", "svg", "path", "g", "circle", "rect", "line", "polyline", "polygon", "ellipse", "defs", "clipPath", "symbol", "use", "lineargradient", "radialgradient", "stop", "mask"]);
const AR = /[\u0600-\u06FF]/;
const META_SKIP = (el) => el.name === "meta" && (el.attrs.some((a) => a.name === "name" && (a.value || "").toLowerCase() === "keywords"));

export const hasArabic = (s) => AR.test(s || "");
export const LANGS = ["ar", "tr", "en"];

export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, "\u00A0")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
const encText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const encAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const normWs = (s) => String(s).replace(/[ \t\r\n]+/g, " ").trim();

/* ---------- محلّل HTML متسامح ---------- */
export function parse(html) {
  const root = { type: "element", name: "#root", attrs: [], children: [], parent: null };
  let node = root;
  let i = 0;
  const len = html.length;
  const push = (n) => { n.parent = node; node.children.push(n); return n; };

  while (i < len) {
    const lt = html.indexOf("<", i);
    if (lt === -1) { push({ type: "text", raw: html.slice(i) }); break; }
    if (lt > i) push({ type: "text", raw: html.slice(i, lt) });

    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      const stop = end === -1 ? len : end + 3;
      push({ type: "comment", raw: html.slice(lt, stop) });
      i = stop;
      continue;
    }
    if (html.startsWith("<!", lt)) {
      const end = html.indexOf(">", lt);
      const stop = end === -1 ? len : end + 1;
      push({ type: "doctype", raw: html.slice(lt, stop) });
      i = stop;
      continue;
    }
    if (html.startsWith("</", lt)) {
      const end = html.indexOf(">", lt);
      const stop = end === -1 ? len : end + 1;
      const name = html.slice(lt + 2, end === -1 ? len : end).trim().toLowerCase();
      let target = node;
      while (target && target.type === "element" && target.name.toLowerCase() !== name) target = target.parent;
      if (target && target !== root) node = target.parent;
      i = stop;
      continue;
    }
    const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(lt));
    if (!m) { push({ type: "text", raw: "<" }); i = lt + 1; continue; }

    const name = m[1].toLowerCase();
    const { attrs, selfClose, end } = parseAttrs(html, lt + m[0].length);
    const el = { type: "element", name, attrs, children: [], selfClose };
    push(el);
    i = end;

    if (RAW.has(name)) {
      const close = new RegExp("</" + name + "\\s*>", "i");
      const rest = html.slice(i);
      const cm = close.exec(rest);
      const stop = cm ? i + cm.index : len;
      if (stop > i) { const t = { type: "text", raw: html.slice(i, stop), rawText: true }; t.parent = el; el.children.push(t); }
      i = cm ? i + cm.index + cm[0].length : len;
      continue;
    }
    if (VOID.has(name) || selfClose) continue;
    node = el;
  }
  return root;
}

function parseAttrs(html, start) {
  const attrs = [];
  let i = start;
  const len = html.length;
  while (i < len) {
    while (i < len && /\s/.test(html[i])) i++;
    if (html[i] === ">") return { attrs, selfClose: false, end: i + 1 };
    if (html[i] === "/" && html[i + 1] === ">") return { attrs, selfClose: true, end: i + 2 };
    if (i >= len) break;
    let j = i;
    while (j < len && !/[\s=>/]/.test(html[j])) j++;
    const name = html.slice(i, j).toLowerCase();
    if (!name) { i = j + 1; continue; }
    let value = null, quote = '"';
    let k = j;
    while (k < len && /\s/.test(html[k])) k++;
    if (html[k] === "=") {
      k++;
      while (k < len && /\s/.test(html[k])) k++;
      const q = html[k];
      if (q === '"' || q === "'") {
        quote = q;
        const e = html.indexOf(q, k + 1);
        const stop = e === -1 ? len : e;
        value = html.slice(k + 1, stop);
        k = stop + 1;
      } else {
        let e = k;
        while (e < len && !/[\s>]/.test(html[e])) e++;
        value = html.slice(k, e);
        k = e;
      }
    }
    attrs.push({ name, value, quote, hasValue: value !== null });
    i = k;
  }
  return { attrs, selfClose: false, end: i };
}

/* ---------- تسلسل ---------- */
function openTag(el) {
  const parts = el.attrs.map((a) => {
    if (!a.hasValue) return ` ${a.name}`;
    const v = a.translated !== undefined ? a.translated : decodeEntities(a.value);
    return ` ${a.name}="${encAttr(v)}"`;
  });
  return `<${el.name}${parts.join("")}${el.selfClose ? " /" : ""}>`;
}

function renderOverride(el) {
  const ph = el._ph || [];
  return encText(el.trOverride).replace(/\{(\d+)\}/g, (m, d) => {
    const idx = Number(d);
    return ph[idx] !== undefined ? ph[idx] : m;
  });
}

function serializeInto(node, out) {
  if (node.type === "text") { out.push(node.translated !== undefined ? node.translated : node.raw); return; }
  if (node.type === "comment" || node.type === "doctype") { out.push(node.raw); return; }
  out.push(openTag(node));
  if (VOID.has(node.name) || node.selfClose) return;
  if (node.trOverride !== undefined) out.push(renderOverride(node));
  else for (const c of node.children) serializeInto(c, out);
  out.push(`</${node.name}>`);
}

export function serialize(root) {
  const out = [];
  for (const c of root.children) serializeInto(c, out);
  return out.join("");
}

/* ---------- استخراج ---------- */
function subtreeHasArabic(node) {
  if (node.type === "text") return hasArabic(decodeEntities(node.raw));
  if (node.type !== "element") return false;
  return node.children.some((c) => subtreeHasArabic(c));
}

function isSkipped(node) {
  if (node.type !== "element") return false;
  if (SKIP_ELEMENTS.has(node.name.toLowerCase())) return true;
  return node.attrs.some((a) => a.name === "data-no-translate");
}

function collectInline(el) {
  let rich = "";
  const phEls = [];
  for (const c of el.children) {
    if (c.type === "text") rich += decodeEntities(c.raw);
    else if (c.type === "comment") continue;
    else { rich += `{${phEls.length}}`; phEls.push(c); }
  }
  return { rich: normWs(rich), phEls };
}

export function collectKeys(html) {
  const root = parse(html);
  const blocks = new Set();
  const attrs = new Set();
  const walk = (node) => {
    if (node.type !== "element") return;
    if (isSkipped(node)) return;
    if (!META_SKIP(node)) {
      for (const a of node.attrs) {
        if (!ATTRS.includes(a.name) || !a.hasValue) continue;
        const v = normWs(decodeEntities(a.value));
        if (hasArabic(v)) attrs.add(v);
      }
    }
    const directArabic = node.children.some((c) => c.type === "text" && hasArabic(decodeEntities(c.raw)));
    const hasBlockChild = node.children.some((c) => c.type === "element" && !INLINE.has(c.name.toLowerCase()));
    if (node.name !== "#root" && subtreeHasArabic(node) && (!hasBlockChild || directArabic)) {
      const { rich } = collectInline(node);
      if (hasArabic(rich)) { blocks.add(rich); node._rich = rich; }
    }
    for (const c of node.children) walk(c);
  };
  for (const c of root.children) walk(c);
  return { blocks, attrs };
}

/* ---------- تطبيق ---------- */
function checkPlaceholders(key, tr) {
  const inKey = [...String(key).matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(",");
  const inTr = [...String(tr).matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(",");
  return inKey !== inTr;
}

export function applyDict(html, dict, stats) {
  const root = parse(html);
  const walkApply = (node) => {
    if (node.type !== "element") return;
    if (isSkipped(node)) return;
    for (const c of node.children) walkApply(c);
    if (!META_SKIP(node)) {
      for (const a of node.attrs) {
        if (!ATTRS.includes(a.name) || !a.hasValue) continue;
        const v = normWs(decodeEntities(a.value));
        if (!hasArabic(v)) continue;
        const tr = dict[v];
        if (tr !== undefined) a.translated = normWs(tr);
        else stats.missing.add(v);
      }
    }
    const directArabic = node.children.some((c) => c.type === "text" && hasArabic(decodeEntities(c.raw)));
    const hasBlockChild = node.children.some((c) => c.type === "element" && !INLINE.has(c.name.toLowerCase()));
    if (node.name !== "#root" && subtreeHasArabic(node) && (!hasBlockChild || directArabic)) {
      const { rich, phEls } = collectInline(node);
      if (hasArabic(rich)) {
        const tr = dict[rich];
        if (tr !== undefined) {
          if (checkPlaceholders(rich, tr)) stats.badPh.add(rich);
          else {
            node._ph = phEls.map((p) => {
              const o = [];
              serializeInto(p, o);
              return o.join("");
            });
            node.trOverride = tr;
          }
        } else {
          stats.missing.add(rich);
        }
      }
    }
  };
  for (const c of root.children) walkApply(c);
  let out = serialize(root);
  out = out.replace(/\s+data-i18n(?:-placeholder)?="[^"]*"/g, "");
  return out;
}

/* ---------- الروابط والرأس ---------- */
const PAGE_PATHS = ["about", "thinking", "ideas", "article", "projects", "talks", "links", "contact", "thank-you", "privacy", "404", "now"];
const SKIP_PREFIX = ["/assets/", "/api/", "/functions/", "/admin"];
const SKIP_FILE = /\.(xml|txt|webmanifest|svg|png|jpe?g|webp|ico|css|js)(\?|$)/;

export function pathFor(lang, path) {
  const clean = (path || "/").split(/[?#]/)[0];
  const slug = clean.replace(/^\/+|\/+$/g, "");
  if (slug === "") return lang === "ar" ? "/" : `/${lang}/`;
  return lang === "ar" ? `/${slug}` : `/${lang}/${slug}`;
}

export function prefixLinks(html, lang, origin) {
  return html.replace(/(href|src)="([^"]*)"/g, (m, attrName, val) => {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#)/.test(val)) return m;
    if (!val.startsWith("/")) return m;
    if (SKIP_PREFIX.some((s) => val.startsWith(s))) return m;
    if (SKIP_FILE.test(val)) return m;
    const [p, hash] = val.split("#");
    const [pp, qs] = p.split("?");
    const slug = pp.replace(/^\/+|\/+$/g, "");
    if (slug !== "" && !PAGE_PATHS.includes(slug)) return m;
    let base;
    if (slug === "") base = lang === "ar" ? "/" : `/${lang}/`;
    else base = lang === "ar" ? `/${slug}` : `/${lang}/${slug}`;
    return `${attrName}="${base}${qs ? "?" + qs : ""}${hash ? "#" + hash : ""}"`;
  });
}

export function fillSwitcher(html, lang, path, origin) {
  const mk = (l) => {
    const active = l === lang;
    return `<a class="lang-switch__btn${active ? " is-current" : ""}" href="${pathFor(l, path)}" hreflang="${l}" lang="${l}"${active ? ' aria-current="true"' : ""}>${l.toUpperCase()}</a>`;
  };
  return html.replace(/(<div[^>]*data-lang-switch[^>]*>)<\/div>/g, `$1${mk("ar")}${mk("tr")}${mk("en")}</div>`);
}

export function patchHead(html, lang, path, dict, origin) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const locale = { ar: "ar_AR", tr: "tr_TR", en: "en_US" }[lang];
  const others = ["ar", "tr", "en"].filter((l) => l !== lang).map((l) => ({ ar: "ar_AR", tr: "tr_TR", en: "en_US" }[l]));
  const url = origin + pathFor(lang, path);
  const alt = (l) => `  <link rel="alternate" hreflang="${l}" href="${origin + pathFor(l, path)}">`;

  let out = html;
  out = out.replace(/<html lang="[^"]*" dir="[^"]*"/, `<html lang="${lang}" dir="${dir}"`);
  out = out.replace(/<link rel="canonical" href="[^"]*">/g, `<link rel="canonical" href="${url}">`);
  out = out.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?/g, "");
  out = out.replace(`<link rel="canonical" href="${url}">`, `<link rel="canonical" href="${url}">
${alt("ar")}
${alt("tr")}
${alt("en")}
  <link rel="alternate" hreflang="x-default" href="${origin + pathFor("ar", path)}">`);
  out = out.replace(/<meta property="og:url" content="[^"]*">/g, `<meta property="og:url" content="${url}">`);
  out = out.replace(/<meta property="og:locale" content="[^"]*">\n?/g, "");
  out = out.replace(/<meta property="og:locale:alternate" content="[^"]*">\n?/g, "");
  out = out.replace(`<meta property="og:url" content="${url}">`, `<meta property="og:url" content="${url}">
<meta property="og:locale" content="${locale}">
${others.map((o) => `<meta property="og:locale:alternate" content="${o}">`).join("\n")}`);
  out = out.replace(/<html lang="([^"]+)" dir="([^"]+)" data-theme/, `<html lang="$1" dir="$2" data-theme`);

  /* JSON-LD: ترجمة القيم النصية + توطين الروابط */
  out = out.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (m, body) => {
    try {
      const data = JSON.parse(body);
      const walk = (v) => {
        if (typeof v === "string") {
          if (v === "ar" || v === "tr" || v === "en") return lang;
          if (v.startsWith(origin)) {
            const rest = v.slice(origin.length);
            const [p, hash] = rest.split("#");
            const [pp, qs] = p.split("?");
            const slug = pp.replace(/^\/+|\/+$/g, "");
            if (slug === "" || PAGE_PATHS.includes(slug)) {
              let base = slug === "" ? pathFor(lang, "/") : pathFor(lang, "/" + slug);
              return origin + base + (qs ? "?" + qs : "") + (hash ? "#" + hash : "");
            }
            return v;
          }
          const t = dict ? dict[normWs(v)] : undefined;
          return t !== undefined ? t : v;
        }
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === "object") { for (const k of Object.keys(v)) v[k] = walk(v[k]); return v; }
        return v;
      };
      const patched = walk(data);
      return `<script type="application/ld+json">${JSON.stringify(patched, null, 2)}</script>`;
    } catch (e) { return m; }
  });
  return out;
}
