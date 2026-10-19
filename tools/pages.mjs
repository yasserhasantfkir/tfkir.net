/* ============================================================
   tools/pages.mjs — بناء صفحات الموقع
   ============================================================ */
import {
  site, doctor, marquee, domains,
  timeline, ideas, ideaCategories, projects, projectFilters, talks, talkTypes,
  linkGroups,
} from "./content.mjs";
import { icon, socialIcon } from "./icons.mjs";
import { esc, layout, pageHero, ctaBand, portrait, pulseSvg, personLd } from "./render.mjs";

const D = doctor;

/* قسم قائمة: يعرض الشبكة، أو بطاقة «قيد الإعداد» إن لم يوجد محتوى بعد */
const listSection = ({ id, chips, cards, empty, title, desc }) => `
<section class="section section--tight">
  <div class="shell">
    ${
      chips
        ? `<div class="chips" id="${id}-filters" role="group" aria-label="التصفية">
            ${chips}
          </div>

          <div class="grid grid--3" id="${id}-grid" style="margin-top:1.8rem">
            ${cards}
          </div>

          <p class="empty-note" id="${id}-empty" hidden>${empty}</p>`
        : `<div class="empty-note empty-note--tall">
            <p class="empty-note__t">${title}</p>
            <p class="empty-note__d">${desc}</p>
          </div>`
    }
  </div>
</section>`;
const articleHref = (slug) => `/article?id=${encodeURIComponent(slug)}`;

/* الوصف التعريفي: كل جملة في سطر مستقل */
const leadHtml = (d = D) => d.leadLines.map((l) => esc(l)).join("<br>\n        ");

/* ============================================================
   1) الرئيسية
   ============================================================ */
export function homePage() {
  const domainCards = domains
    .map(
      (d, i) => `<a class="card" href="/thinking" data-reveal style="--d:${i * 60}ms">
            <span class="card__icon">${icon("compass")}</span>
            <h3 class="card__title">${esc(d.t)}</h3>
            <p class="card__text">${esc(d.p)}</p>
          </a>`
    )
    .join("\n          ");

  const marqueeItems = [...marquee, ...marquee]
    .map((m) => `<span class="marquee__item">${esc(m)}</span>`)
    .join("\n            ");

  const body = `<!-- ===================== HERO ===================== -->
<section class="hero" id="hero">
  <div class="hero__aura" aria-hidden="true">
    <span class="blob blob--1"></span>
    <span class="blob blob--2"></span>
    <span class="blob blob--3"></span>
  </div>
  <div class="hero__grid-lines" aria-hidden="true"></div>

  <div class="hero__rail" aria-hidden="true"><span>tfkir.net — ${esc(D.nameEn)}</span></div>

  <div class="shell hero__grid">
    <div class="hero__text">
      <span class="kicker" data-reveal>${icon("stethoscope")} <span data-i18n="hero.kicker">${esc(D.nameAr)}</span></span>

      <h1 class="hero__title" data-reveal style="--d:90ms">
        <span class="ln"><span class="split-line"><span class="gradient-text" data-i18n="hero.title">${esc(D.title)}</span></span></span>
      </h1>

      <div class="hero__role" data-reveal style="--d:180ms">
        <span class="tag tag--teal">${esc(D.roleLine)}</span>
      </div>
    </div>

          ${portrait()}

    <aside class="hero__note" data-reveal="scale" style="--d:260ms">
      <h2 class="hero__note-title">فلسفة المنصة</h2>
      <p class="hero__note-text">${leadHtml()}</p>
    </aside>

    <div class="hero__cta hero__grid-actions" data-reveal style="--d:340ms">
      <a class="btn btn--primary btn--lg" href="/thinking">${icon("compass")}<span>ابدأ من الميادين</span></a>
      <a class="btn btn--ghost btn--lg" href="/about">${icon("user")}<span>من هو الدكتور؟</span></a>
      <a class="btn btn--quiet btn--lg" href="/ideas">الأفكار${icon("arrowLeft", "btn__arrow")}</a>
    </div>
  </div>

  <div class="hero__cue" aria-hidden="true">
    <span>scroll</span>
    <span class="hero__cue-line"></span>
  </div>
</section>

<div class="marquee" aria-hidden="true">
  <div class="marquee__track">
            ${marqueeItems}
  </div>
</div>

<!-- ===================== من أنا ===================== -->
<section class="section" id="intro">
  <div class="shell">
    <div class="grid grid--2" style="gap:clamp(1.5rem,1rem+3vw,3.5rem);align-items:start">
      <div>
        <span class="chip-num" data-i18n="intro.chip">01 — ميادين المنصة</span>
        <h2 style="margin-top:1rem" data-i18n="intro.title">ميادين المنصة</h2>
        <p class="lead" style="margin-top:1.1rem;color:var(--muted)">
          نظريات ومنهجيات، ودورات في الطب والمنطق والحوار والحِجاج
          واللغة والنهضة والتحقيق والابتكار والتجديد يجمعها خيط واحد إذ يبدأ كل ميدان
          منها بسؤال جوهري ثلاثي الأضلاع يمثل روح التفكير النهضوي الذي نشتغل عليه
          حاليًا، وهذا السؤال هو: 1- كيف نفكر في هذا الميدان، 2- كيف نستثمره،
          3- كيف ننقله للآخرين.
        </p>
        <div class="hero__cta" style="margin-top:1.8rem">
          <a class="btn btn--primary" href="/thinking">${icon("compass")}<span data-i18n="intro.cta1">ابدأ من الميادين</span></a>
          <a class="btn btn--ghost" href="/contact">${icon("message")}<span data-i18n="intro.cta2">تواصل</span></a>
        </div>
      </div>

      <div class="grid" style="gap:1rem">
        <div class="card" data-reveal="left">
          <span class="card__icon">${icon("mail")}</span>
          <h3 class="card__title">${esc(D.email)}</h3>
          <p class="card__text">أسرع طريقة للوصول. اضغط للنسخ.</p>
          <div class="card__foot">
            <button class="tlink" type="button" data-copy="${esc(D.email)}">${icon("copy")}نسخ البريد</button>
          </div>
        </div>
        <div class="card" data-reveal="left" style="--d:110ms">
          <span class="card__icon">${icon("checkCircle")}</span>
          <h3 class="card__title">${esc(D.availability)}</h3>
          <p class="card__text">لطلبات الدورات والحوارات والتعاون الفكري.</p>
          <div class="card__foot"><a class="tlink" href="/contact">قدّم طلبك${icon("arrowLeft", "btn__arrow")}</a></div>
        </div>
        <div class="card" data-reveal="left" style="--d:200ms">
          <span class="card__icon">${icon("phone")}</span>
          <h3 class="card__title">${esc(D.phone)}</h3>
          <p class="card__text">هاتف / واتساب.</p>
          <div class="card__foot">
            <a class="tlink" href="${esc(D.socials.whatsapp)}" target="_blank" rel="noopener">${icon("whatsapp")}فتح واتساب</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== ستة ميادين (محور) ===================== -->
<section class="section" id="domains">
  <div class="shell">
    <div class="sect-head sect-head--center">
      <span class="kicker" data-reveal>${icon("compass")} <span data-i18n="domains.kicker">الميادين</span></span>
      <h2 style="margin-top:.9rem" data-reveal data-i18n="domains.title">ستة ميادين، <span class="gradient-text">خيطٌ واحد</span></h2>
      <p class="lead" data-reveal style="--d:120ms" data-i18n="domains.lead">كل ميدان يبدأ من سؤال واحد: كيف نفكّر فيه؟</p>
    </div>
    <div class="grid grid--3">
          ${domainCards}
    </div>
  </div>
</section>

<!-- ===================== شريط المقالات المتحرك ===================== -->
<section class="section" id="articles-rail" data-rail hidden>
  <div class="shell rail__head">
    <div class="rail__head-text">
      <span class="kicker" data-reveal>${icon("book")} المقالات</span>
      <h2 class="rail__title" data-reveal style="--d:80ms">آخر ما كُتب على المنصة</h2>
    </div>
    <div class="rail__tools">
      <button class="rail__toggle" type="button" data-rail-toggle aria-pressed="false"
              data-label-resume="إيقاف الحركة" data-label-pause="تشغيل الحركة">
        <span class="dot" aria-hidden="true"></span><span data-rail-label>إيقاف الحركة</span>
      </button>
      <a class="tlink" href="/ideas" data-reveal style="--d:160ms">كل المقالات${icon("arrowLeft", "btn__arrow")}</a>
    </div>
  </div>
  <div class="rail" data-rail-viewport role="region" aria-label="أحدث المقالات">
    <div class="rail__track" data-rail-track></div>
  </div>
</section>

${ctaBand()}`;

  return layout({
    active: "/",
    path: "/",
    title: site.tagline,
    desc: D.subtitle,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        personLd(),
        {
          "@type": "WebSite",
          "@id": site.origin + "/#website",
          url: site.origin + "/",
          name: site.shortName,
          inLanguage: "ar",
          publisher: { "@id": site.origin + "/#person" },
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: site.origin + "/ideas?q={search_term_string}" },
            "query-input": "required name=search_term_string",
          },
        },
      ],
    },
  });
}

/* ============================================================
   2) عن الدكتور
   ============================================================ */
export function aboutPage() {
  const chips = D.specialties
    .map((s) => `<span class="tag tag--teal">${esc(s)}</span>`)
    .join("\n            ");

  const body = `${pageHero({
    kicker: "عن الدكتور",
    title: `${esc(D.nameShort)}، <span class="gradient-text">طبيبٌ يفكّر ويكتب</span>`,
    lead:
      "صفحة تعريفية بالمنصة ومؤسسها: الأفكار، والميادين، والدعوة.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "عن الدكتور" }],
    aside: `<div class="contact-method" style="background:var(--grad-brand-soft)">
            <span class="contact-method__ico">${icon("user")}</span>
            <div>
              <p class="contact-method__t">${esc(D.nameAr)}</p>
              <p class="contact-method__v">${esc(D.roleLine)}</p>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.9rem">
            ${chips}
          </div>`,
  })}

<section class="section">
  <div class="shell">
    <div class="grid" style="grid-template-columns:minmax(0,1fr);gap:clamp(1.5rem,1rem+2.5vw,3rem)">
      <div class="sect-head" style="margin-bottom:0">
        <span class="kicker" data-reveal>${icon("quote")} نبذة</span>
        <h2 style="margin-top:.9rem" data-reveal>${esc(D.title)}</h2>
        <p class="lead" data-reveal style="--d:120ms">${leadHtml()}</p>
      </div>

      <div class="grid grid--2">
        <div class="card" data-reveal>
          <span class="card__icon">${icon("book")}</span>
          <h3 class="card__title">القصة باختصار</h3>
          <p class="card__text">
            بدأت الرحلة الطبية وهو السؤال، لا الشهادة. ما يزال هذا الموقع استمرارًا لنفس السؤال بصيغة أخرى:
            ما الذي يحدث للطبيب حين يكتب ما يراه، وما الذي يحدث للطب حين يُناقَش علنًا؟
          </p>
        </div>
        <div class="card" data-reveal style="--d:100ms">
          <span class="card__icon">${icon("pen")}</span>
          <h3 class="card__title">لماذا أكتب؟</h3>
          <p class="card__text">
            لأن الحالة التي لا تُكتب تضيع، ولأن الفكرة التي لا تُختبر تظل اعتقادًا. الكتابة هنا امتدادٌ
            للعيادة، لا هروبٌ منها.
          </p>
        </div>
        <div class="card" data-reveal style="--d:160ms">
          <span class="card__icon">${icon("users")}</span>
          <h3 class="card__title">ما أقدّمه</h3>
          <p class="card__text">
            محاضرات في التفكير السريري، وورش في تدوين الحالات، وحوارات حول الطب والفلسفة، وأحيانًا استشارة
            فكرية لمشروع ناشئ.
          </p>
        </div>
        <div class="card" data-reveal style="--d:220ms">
          <span class="card__icon">${icon("shield")}</span>
          <h3 class="card__title">حدود واضحة</h3>
          <p class="card__text">
            ما يُنشر هنا رأيٌ شخصي لأغراض تثقيفية، ولا يُغني عن استشارة طبية مباشرة، ولا يُستخدم بديلًا عن
            تقدير الطبيب المسؤول.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

${ctaBand({
  title: "لديك حالة تستحق المناقشة؟",
  text: "أحيانًا تكون الفكرة الأكثر قيمة هي الفكرة التي لم تُكتب بعد. أرسلها، وسأقرأها.",
  primary: { href: "/contact", label: "أرسل فكرتك" },
  secondary: { href: "/projects", label: "تصفّح المشاريع" },
})}`;

  return layout({
    active: "/about",
    path: "/about",
    title: `عن ${D.nameShort}`,
    desc: `الملف الشخصي والمهني لـ${D.nameAr}: الميادين، والمنهاج، والدعوة.`,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      mainEntity: personLd(),
    },
  });
}

/* ============================================================
   4) الأفكار
   ============================================================ */
export function thinkingPage() {
  const domainCards = domains
    .map(
      (d, i) => `<a class="card" href="/thinking" data-reveal style="--d:${i * 60}ms">
            <span class="card__icon">${icon("compass")}</span>
            <h3 class="card__title">${esc(d.t)}</h3>
            <p class="card__text">${esc(d.p)}</p>
          </a>`
    )
    .join("\n          ");

  const body = `${pageHero({
    kicker: "المنهجية",
    title: "التفكير <span class=\"gradient-text\">الطبّي</span> كمنهج",
    lead:
      "ليست مجموعة مهارات، بل تعلّم: كيف ننتقي المعطيات، وكيف نبني فرضية يمكن اختبارها، وكيف نعرف أن الوقت مناسب لإغلاق التشخيص.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "التفكير الطبي" }],
    meta: [],
    aside: `<div class="quote" style="padding:1.2rem 1.3rem">
            <p style="font-size:1.05rem">«أخطر لحظة في التشخيص ليست الخطأ، بل اليقين المبكر.»</p>
            <cite>— من ملاحظات العمل</cite>
          </div>`,
  })}

<section class="section">
  <div class="shell">
    <div class="sect-head">
      <span class="kicker" data-reveal>${icon("layers")} المراحل</span>
      <h2 style="margin-top:.9rem" data-reveal>كيف يعمل <span class="mark">العقل السريري</span></h2>
      <p class="lead" data-reveal style="--d:120ms">ستة ميادين، من أول انتباه إلى آخر توثيق.</p>
    </div>
    <div class="grid grid--3">
          ${domainCards}
    </div>
  </div>
</section>

${ctaBand({
  title: "لديك فكرة أو طلب؟",
  text: "أرسل طلبك أو نبذة عن فكرتك، وسأقرأها بتمعّن.",
  primary: { href: "/contact", label: "أرسل طلبك" },
  secondary: { href: "/links", label: "كل الروابط" },
})}`;

  return layout({
    active: "/thinking",
    path: "/thinking",
    title: "التفكير الطبي — المنهجية والمبادئ",
    desc: "منهجية التفكير في الطب: المراحل، والمبادئ، وأدوات التفكير السريري.",
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "التفكير الطبي",
      about: { "@type": "Thing", name: "التفكير السريري" },
    },
  });
}

export function ideasPage() {
  const chips = ideaCategories
    .map(
      (c, i) =>
        `<button class="chip" type="button" data-filter="${c === "الكل" ? "*" : esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`
    )
    .join("\n            ");

  const cards = ideas
    .map(
      (i, idx) => `<a class="post-card" href="${articleHref(i.slug)}" data-reveal
             data-cat="${esc(i.category)}"${i.featured ? ' data-featured="true"' : ""} style="--d:${(idx % 3) * 90}ms">
            <div class="post-card__meta">
              <span class="post-card__cat">${esc(i.category)}</span>
              <span>${esc(i.dateAr)}</span>
              <span>${esc(i.read)}</span>
            </div>
            <h2 class="post-card__title">${esc(i.title)}</h2>
            <p class="post-card__excerpt">${esc(i.excerpt)}</p>
            <div class="post-card__foot">
              <span class="post-card__read">اقرأ المقال${icon("arrowLeft")}</span>
              <span>${i.tags.map(esc).join(" · ")}</span>
            </div>
          </a>`
    )
    .join("\n          ");

  const body = `${pageHero({
    kicker: "الأرشيف",
    title: "أفكار <span class=\"gradient-text\">ومقالات</span>",
    lead:
      `مقالات في التفكير الطبي وقراءة الأدلة وتعليم الطب والكتابة، مكتوبة على مهل ومفتوحة للنقاش: ` +
      "كل مقال رأي شخصي قابل للتصحيح.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "الأفكار" }],
    meta: [
      `<span data-posts-count>${ideas.length}</span> مقالات منشورة`,
      `${ideaCategories.length - 1} تصنيفات`,
    ],
  })}

<section class="section section--tight">
  <div class="shell">
    <div class="chips" id="idea-filters" role="group" aria-label="تصفية المقالات">
            ${chips}
    </div>

    <div class="grid grid--3" id="idea-grid" style="margin-top:1.8rem"><!--#POSTS_GRID-->${cards}
    </div>

    <p class="empty-note" id="idea-empty" hidden>لا توجد مقالات منشورة بعد. المقالات ستُضاف لاحقًا.</p>
  </div>
</section>

${ctaBand({
  title: "هل لديك فكرة أو طلب؟",
  text: "أرسل طلبك أو نبذة عن فكرتك، وسأقرأها بتمعّن.",
  primary: { href: "/contact", label: "أرسل طلبك" },
  secondary: { href: "/links", label: "كل الروابط" },
})}`;

  return layout({
    active: "/ideas",
    path: "/ideas",
    title: "الأفكار والمقالات",
    desc: "مقالات في التفكير الطبي وقراءة الأدلة وتعليم الطب والكتابة. قراءةٌ سريعة في الفهم، بطيئة في الحكم.",
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "الأفكار والمقالات",
      hasPart: ideas.map((i) => ({
        "@type": "Article",
        headline: i.title,
        description: i.excerpt,
        datePublished: i.date,
        url: site.origin + articleHref(i.slug),
        author: { "@type": "Person", name: D.nameAr },
      })),
    },
  });
}

/* ============================================================
   5) صفحة المقال (article.html?id=...)
   ============================================================ */
export function articlePage() {
  const fallbackCards = ideas
    .slice(0, 3)
    .map(
      (i) => `<a class="post-card" href="${articleHref(i.slug)}">
            <div class="post-card__meta"><span class="post-card__cat">${esc(i.category)}</span><span>${esc(i.dateAr)}</span></div>
            <h3 class="post-card__title">${esc(i.title)}</h3>
            <p class="post-card__excerpt">${esc(i.excerpt)}</p>
          </a>`
    )
    .join("\n          ");

  const body = `<article class="article" id="article">
  <div class="shell">
    <nav class="crumbs" aria-label="مسار التصفح" style="margin-bottom:1.5rem">
      <a href="/">الرئيسية</a><span class="crumbs__sep" aria-hidden="true">/</span>
      <a href="/ideas">الأفكار</a><span class="crumbs__sep" aria-hidden="true">/</span>
      <span aria-current="page" id="crumb-title">…</span>
    </nav>

    <div class="article-layout">
      <div>
        <header class="article__head" id="article-head" hidden>
          <span class="kicker" id="article-cat">—</span>
          <h1 class="article__title" id="article-title">—</h1>
          <div class="article__meta">
            <span>${icon("calendar")} <time id="article-date">—</time></span>
            <span>${icon("clock")} <span id="article-read">—</span></span>
            <span>${icon("user")} ${esc(D.nameShort)}</span>
          </div>
        </header>

        <div class="prose" id="article-body" hidden></div>

        <div class="prose" id="article-loading">
          <p class="lead">جارٍ تحميل المقال…</p>
        </div>

        <section id="article-404" hidden style="padding-top:1rem">
          <div class="empty-note" style="margin-bottom:1.5rem">
            <p>تعذّر العثور على هذا المقال.</p>
          </div>
          ${
            fallbackCards.trim()
              ? `<h2 style="font-size:var(--fs-h3);margin-bottom:1rem">مقالات أخرى</h2>
          <div class="grid grid--3">
            ${fallbackCards}
          </div>`
              : ""
          }
        </section>

        <div class="article__share" id="article-share" hidden>
          <span style="font-size:var(--fs-xs);color:var(--faint)">شارك المقال:</span>
          <a class="btn btn--ghost btn--sm" id="share-x" href="#" target="_blank" rel="noopener">${icon("x")}<span>إكس</span></a>
          <a class="btn btn--ghost btn--sm" id="share-wa" href="#" target="_blank" rel="noopener">${icon("whatsapp")}<span>واتساب</span></a>
          <a class="btn btn--ghost btn--sm" id="share-in" href="#" target="_blank" rel="noopener">${icon("linkedin")}<span>لينكدإن</span></a>
          <button class="btn btn--ghost btn--sm" type="button" id="share-copy">${icon("copy")}<span>نسخ الرابط</span></button>
        </div>
      </div>

      <aside class="article-layout__aside">
        <div class="toc" id="toc" hidden>
          <p class="toc__title">في هذا المقال</p>
          <ol id="toc-list"></ol>
        </div>
      </aside>
    </div>
  </div>
</article>

${ctaBand({
  title: "الفكرة تهمّك؟ ناقشها.",
  text: "المقالات مفتوحة للنقاش. إن كان لديك اعتراض أو إضافة أو مثال من عيادتك، الباب مفتوح.",
  primary: { href: "/contact", label: "اكتب ردّك" },
  secondary: { href: "/ideas", label: "كل المقالات" },
})}`;

  return layout({
    active: "/ideas",
    path: "/article",
    noIndex: true,
    title: "مقال",
    desc: "قراءة مقال من أرشيف التفكير الطبي للدكتور ياسر حسن: فكرة كاملة، بأقسامها ومراجعها، قابلة للمناقشة والتصحيح.",
    body,
    /* بيانات المقالات الثابتة (window.TFKIR_IDEAS) — تسبق app.js لأنها تُقرأ عند الإقلاع */
    scripts: '<script src="/assets/js/ideas.data.js" defer></script>',
  });
}

/* ============================================================
   6) المشاريع
   ============================================================ */
export function projectsPage() {
  const chips = projectFilters
    .map(
      (f, i) =>
        `<button class="chip" type="button" data-filter="${f === "الكل" ? "*" : esc(f)}" aria-pressed="${i === 0}">${esc(f)}</button>`
    )
    .join("\n            ");

  const cards = projects
    .map(
      (p, idx) => `<article class="proj" data-reveal data-cat="${esc(p.statusAr)}" style="--d:${(idx % 3) * 90}ms">
            <div class="proj__top">
              <span class="card__icon">${icon("spark")}</span>
              <span class="status status--${p.status}">${esc(p.statusAr)}</span>
            </div>
            <h2 class="proj__title">${esc(p.title)}</h2>
            <p class="proj__text">${esc(p.text)}</p>
            <div class="proj__stack">
              ${p.stack.map((s) => `<span class="tag">${esc(s)}</span>`).join("\n              ")}
            </div>
            <div class="proj__foot">
              <span class="latin">${esc(p.updated)}</span>
              ${
                p.link
                  ? `<a class="post-card__read" href="${esc(p.link)}" target="_blank" rel="noopener">زيارة${icon("external")}</a>`
                  : `<span class="post-card__read" style="opacity:.55">${esc(p.year === "—" ? "قريبًا" : p.updated)}</span>`
              }
            </div>
          </article>`
    )
    .join("\n          ");

  const counts = {
    live: projects.filter((p) => p.status === "live").length,
    wip: projects.filter((p) => p.status === "wip").length,
    idea: projects.filter((p) => p.status === "idea").length,
  };

  const body = `${pageHero({
    kicker: "المسار",
    title: "مشاريع <span class=\"gradient-text\">شخصية</span>",
    lead:
      "كل مشروع هنا بدأ كإزعاج حقيقي يتكرر — عملية يدوية، أو سؤال لا إجابة له، أو أداة ناقصة. البناء الصغير المحدد يتفوّق على الطموح الكبير.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "المشاريع" }],
    meta: projects.length
      ? [`${projects.length} مشروعًا`, `${counts.live} منشور`, `${counts.wip} قيد التطوير`, `${counts.idea} فكرة`]
      : ["قيد الإعداد"],
  })}

${listSection({
    id: "proj",
    chips: projects.length ? chips : null,
    cards,
    empty: "لا توجد مشاريع بعد. ستُضاف هنا أولًا بأول.",
    title: "المشاريع قيد الإعداد",
    desc: "هذه المساحة مخصّصة للمشاريع التي يطبّقها الدكتور بنفسه — أدوات ومنهجيات ودورات. أول مشروع سيُنشر هنا فور اكتماله.",
  })}

<section class="section section--tight">
  <div class="shell">
    <div class="sect-head sect-head--center">
      <span class="kicker" data-reveal>${icon("compass")} فلسفة البناء</span>
      <h2 style="margin-top:.9rem" data-reveal>ثلاث قواعد <span class="gradient-text">لا أخرج عنها</span></h2>
    </div>
    <div class="grid grid--3">
      <div class="card" data-reveal>
        <span class="card__num">01</span>
        <h3 class="card__title">ابدأ من الإزعاج</h3>
        <p class="card__text">المشروع الذي وُلد من تكرار مؤلم في العمل هو الوحيد الذي سيُنجَز.</p>
      </div>
      <div class="card" data-reveal style="--d:90ms">
        <span class="card__num">02</span>
        <h3 class="card__title">الاكتفاء قرار</h3>
        <p class="card__text">ليس بناء ما يكفي سهلًا، بل حكمة. الأداة التي تتغير كل أسبوع لا تُستعمل.</p>
      </div>
      <div class="card" data-reveal style="--d:180ms">
        <span class="card__num">03</span>
        <h3 class="card__title">اكتب قبل أن تبني</h3>
        <p class="card__text">صف المشكلة في صفحة واحدة. إن لم تستطع، فالمشروع ليس جاهزًا بعد.</p>
      </div>
    </div>
  </div>
</section>

${ctaBand({
  title: "لديك مشروع يخرج من فكرة؟",
  text: "أرسل وصف المشكلة في سطرين. أبحث عن المشاريع التي تختصر خطوة مكررة، لا عن أفكار جديدة كليًا.",
  primary: { href: "/contact", label: "ناقش مشروعك" },
  secondary: { href: "/ideas", label: "اقرأ الأفكار" },
})}`;

  return layout({
    active: "/projects",
    path: "/projects",
    title: "المشاريع الشخصية",
    desc: "أدوات وخدمات ومشاريع شخصية يبنّيها الدكتور ياسر حسن في التفكير الطبي والتوثيق وقراءة الأدلة.",
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "المشاريع",
    },
  });
}

/* ============================================================
   7) المحاضرات
   ============================================================ */
export function talksPage() {
  const chips = talkTypes
    .map(
      (t, i) =>
        `<button class="chip" type="button" data-filter="${t === "الكل" ? "*" : esc(t)}" aria-pressed="${i === 0}">${esc(t)}</button>`
    )
    .join("\n            ");

  const cards = talks
    .map(
      (t, idx) => `<article class="proj" data-reveal data-cat="${esc(t.type)}" style="--d:${(idx % 3) * 90}ms">
            <div class="proj__top">
              <span class="tag tag--teal">${esc(t.type)}</span>
              <span class="tag">${icon("location")} ${esc(t.place)}</span>
            </div>
            <h2 class="proj__title" style="margin-top:.8rem">${esc(t.title)}</h2>
            <p class="proj__text">${esc(t.desc)}</p>
            <div class="proj__foot">
              <span>${icon("calendar")} ${esc(t.dateAr)}</span>
              ${
                t.video
                  ? `<a class="post-card__read" href="${esc(t.video)}" target="_blank" rel="noopener">مشاهدة${icon("play")}</a>`
                  : `<span class="post-card__read" style="opacity:.55">${icon("video")} أضف الرابط</span>`
              }
            </div>
            ${
              t.slides
                ? `<div class="proj__stack" style="margin-top:.8rem"><a class="tag tag--brass" href="${esc(t.slides)}" target="_blank" rel="noopener">${icon("doc")} العرض / المادة</a></div>`
                : ""
            }
          </article>`
    )
    .join("\n          ");

  const body = `${pageHero({
    kicker: "الجلسات",
    title: "المحاضرات <span class=\"gradient-text\">والحوارات</span>",
    lead:
      "جلسات في التفكير السريري وقراءة الأدلة وتدوين الحالات، وحوارات في الطب والفلسفة. مواد العرض متاحة حيثما رُخّص.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "المحاضرات" }],
    meta: talks.length ? [`${talks.length} جلسة`] : ["قيد التوثيق"],
  })}

${listSection({
    id: "talk",
    chips: talks.length ? chips : null,
    cards,
    empty: "لا توجد جلسات منشورة بعد. المحاضرات ستُضاف لاحقًا.",
    title: "الجلسات قيد التوثيق",
    desc: "المواد والعروض تُضاف هنا بعد كل محاضرة أو حوار، مع رابط مباشر للمادة كلما نُشرت بإذن.",
  })}

<section class="section section--tight">
  <div class="shell">
    <div class="cta-band" data-reveal="scale">
      <span class="kicker" style="justify-content:center">${icon("mic")} دعوة</span>
      <h2 class="cta-band__title" style="margin-top:.8rem">دعوة لمحاضرة أو ورشة؟</h2>
      <p class="lead cta-band__text">
        أستقبل دعوات المحاضرات وورش العمل في التفكير السريري، خصوصًا في كليات الطب وبرامج تدريب المقيمين.
      </p>
      <div class="cta-band__actions">
        <a class="btn btn--primary btn--lg" href="/contact?type=talk">${icon("send")}<span>أرسل دعوة</span></a>
        <a class="btn btn--ghost btn--lg" href="/contact">${icon("message")}<span>تواصل عام</span></a>
      </div>
    </div>
  </div>
</section>`;

  return layout({
    active: "/talks",
    path: "/talks",
    title: "المحاضرات والحوارات",
    desc: "محاضرات وورش وحوارات الدكتور ياسر حسن في التفكير السريري وقراءة الأدلة وتدوين الحالات.",
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "المحاضرات والحوارات",
    },
  });
}

/* ============================================================
   8) صفحة الروابط
   ============================================================ */
export function linksPage() {
  const groups = linkGroups
    .map((g) => {
      const rows = g.links
        .map((l) => {
          const href = l.url || "#todo";
          const dead = !l.url;
          const copy = l.url && /^https?:/i.test(l.url) ? `data-copy="${esc(l.url)}"` : "";
          return `<div class="hub__row"${dead ? ' data-todo="true"' : ""}>
            <span class="hub__ico">${icon(l.icon)}</span>
            <div>
              <p class="hub__name">${esc(l.name)}${l.primary ? ` <span class="tag tag--teal" style="margin-inline-start:.4rem">أساسي</span>` : ""}</p>
              <p class="hub__desc">${esc(l.desc)}</p>
            </div>
            <div class="hub__acts">
              ${
                dead
                  ? `<span class="tag" title="قيد الإضافة">${icon("pen")} يُضاف لاحقًا</span>`
                  : `<a class="hub__act" href="${href}" aria-label="فتح ${esc(l.name)}"${/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ""}>${icon("external")}</a>
                 <button class="hub__act" type="button" ${copy} aria-label="نسخ رابط ${esc(l.name)}">${icon("copy")}</button>`
              }
            </div>
          </div>`;
        })
        .join("\n          ");

      return `<section>
        <h2 class="hub__group-title">${esc(g.title)}</h2>
        <div class="hub" style="margin-top:.9rem">
          ${rows}
        </div>
      </section>`;
    })
    .join("\n        ");

  const pending = linkGroups.flatMap((g) => g.links).filter((l) => !l.url).length;

  const body = `${pageHero({
    kicker: "مركز الروابط",
    title: "كل <span class=\"gradient-text\">الروابط</span>",
    lead:
      "صفحة واحدة تجمع كل ما يوصلك إلى محتوى الموقع وحساباتي: روابط داخلية، حسابات، ومصادر أوصي بها. اضغط أيقونة النسخ لتأخذ الرابط مباشرة.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "الروابط" }],
    meta: [`${linkGroups.length} مجموعات`, pending ? `${pending} رابط بانتظار الإضافة` : "كل الروابط جاهزة"],
  })}

<section class="section section--tight">
  <div class="shell shell--narrow" style="padding-inline:0;margin-inline:auto">
        ${groups}

    <div class="cta-band" style="margin-top:3rem" data-reveal="scale">
      <span class="kicker" style="justify-content:center">${icon("link")} طلب رابط</span>
      <h2 class="cta-band__title" style="margin-top:.8rem">اقترح رابطًا يستحق التوثيق</h2>
      <p class="lead cta-band__text">
        إن كان هناك كتاب، أو إرشاد، أو أداة، أو موقع يستحق أن يكون في هذه القائمة — أرسله لي.
      </p>
      <div class="cta-band__actions">
        <a class="btn btn--primary btn--lg" href="/contact?type=resource">${icon("send")}<span>اقترح مصدرًا</span></a>
        <a class="btn btn--ghost btn--lg" href="/sitemap.xml">${icon("layers")}<span>خريطة الموقع</span></a>
      </div>
    </div>
  </div>
</section>`;

  return layout({
    active: "/links",
    path: "/links",
    title: "كل الروابط",
    desc: "صفحة مركزية تجمع روابط الموقع وحسابات الدكتور ياسر حسن ومصادره الموصى بها.",
    body,
  });
}

/* ============================================================
   9) اتصل بنا
   ============================================================ */
export function contactPage() {
  const subjects = [
    "رسالة عامة",
    "طلب محاضرة أو ورشة",
    "مقترح مشروع أو فكرة",
    "اقتراح مصدر لصفحة الروابط",
    "طلب توضيحي حول مقال",
    "إعلام وتعاون",
  ]
    .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
    .join("\n                  ");

  const soc = doctor.socialOrder
    .filter((k) => doctor.socials[k])
    .map(
      (k) =>
        `<a class="social" href="${k === "email" ? `mailto:${doctor.socials[k]}` : esc(doctor.socials[k])}" aria-label="${esc(k)}" target="_blank" rel="noopener noreferrer me">${socialIcon(k)}</a>`
    )
    .join("\n            ");

  const body = `${pageHero({
    kicker: "تواصل",
    title: "اتصل <span class=\"gradient-text\">بنا</span>",
    lead:
      "لطلبات المحاضرات، ومناقشة الأفكار، واقتراح المصادر، أو أي سؤال يتعلّق بالمحتوى. الرسالة تصل مباشرة، ويجيبها الدكتور ياسر شخصيًا أو عبر بريده.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "اتصل بنا" }],
    aside: `<span class="availability"><span class="pulse-dot" aria-hidden="true"></span>${esc(D.availability)}</span>`,
  })}

<section class="section">
  <div class="shell">
    <div class="contact-layout">
      <!-- ============ النموذج ============ -->
      <div class="form-panel" data-reveal="right">
        <span class="kicker">${icon("send")} النموذج</span>
        <h2 style="margin-top:.8rem;font-size:var(--fs-h3)">اكتب رسالتك</h2>
        <p style="margin-top:.5rem;color:var(--muted);font-size:.95rem">
          الحقول المعلّمة بـ <span style="color:var(--teal-400)">*</span> مطلوبة. لا تُرسل أي بيانات حسّاسة.
        </p>

        <form class="form-grid" id="contact-form" data-email="${esc(D.email)}" style="margin-top:1.6rem" novalidate>
          <div class="hp" aria-hidden="true">
            <label>لا تملأ هذا الحقل<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
          </div>

          <div class="form-grid form-grid--2">
            <div class="field" data-field="name">
              <label class="field__label" for="cf-name">الاسم <span class="req">*</span></label>
              <input class="input" id="cf-name" name="name" type="text" required autocomplete="name"
                     placeholder="اكتب اسمك كاملًا" minlength="2">
              <span class="field__err">اكتب اسمًا من حرفين على الأقل.</span>
            </div>

            <div class="field" data-field="email">
              <label class="field__label" for="cf-email">البريد الإلكتروني <span class="req">*</span></label>
              <input class="input" id="cf-email" name="email" type="email" required autocomplete="email"
                     placeholder="name@example.com" inputmode="email">
              <span class="field__err">اكتب بريدًا إلكترونيًا صحيحًا.</span>
            </div>

            <div class="field" data-field="subject">
              <label class="field__label" for="cf-subject">موضوع الرسالة <span class="req">*</span></label>
              <select class="select" id="cf-subject" name="subject" required>
                  ${subjects}
              </select>
              <span class="field__err">اختر موضوعًا.</span>
            </div>

            <div class="field" data-field="phone">
              <label class="field__label" for="cf-phone">الهاتف أو واتساب</label>
              <input class="input" id="cf-phone" name="phone" type="tel" autocomplete="tel"
                     placeholder="اختياري" inputmode="tel">
              <span class="field__hint">اختياري.</span>
            </div>
          </div>

          <div class="field" data-field="message">
            <label class="field__label" for="cf-message">نص الرسالة <span class="req">*</span></label>
            <textarea class="textarea" id="cf-message" name="message" required minlength="20"
                      placeholder="اشرح طلبك باختصار: ما الذي تريد مناقشته؟ وما الإطار الزمني المناسب؟"></textarea>
            <span class="field__err">اكتب ٢٠ حرفًا على الأقل.</span>
            <span class="field__hint"><span class="latin" id="char-count">0</span> حرف</span>
          </div>

          <div class="field" data-field="consent" data-invalid="false">
            <label style="display:flex;gap:.65rem;align-items:flex-start;cursor:pointer;font-size:.92rem;color:var(--text-soft)">
              <input type="checkbox" id="cf-consent" name="consent" required style="margin-top:.35rem;accent-color:var(--teal-500);width:17px;height:17px;flex:none">
              <span>أوافق على معالجة هذه البيانات للرد على طلبي، وفق <a href="/privacy" class="tlink">سياسة الخصوصية</a>. <span class="req">*</span></span>
            </label>
            <span class="field__err">الموافقة مطلوبة لإرسال الرسالة.</span>
          </div>

          <div class="form-status" id="form-status" role="status" aria-live="polite">
            <span id="form-status-icon"></span>
            <span id="form-status-text"></span>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:.75rem;align-items:center">
            <button class="btn btn--primary btn--lg" type="submit" id="cf-submit">
              ${icon("send")}<span>إرسال الرسالة</span>
            </button>
            <button class="btn btn--ghost" type="button" id="cf-reset">${icon("refresh")}<span>تفريغ</span></button>
          </div>

          <p class="form-note">
            ${icon("lock")} لا تُخزَّن هذه البيانات على أي خادم خارجي إلا ما يلزم لإرسالها بالبريد.
            النموذج محمي بحقل خفي يمنع الرسائل الآلية.
          </p>
        </form>
      </div>

      <!-- ============ قنوات التواصل ============ -->
      <aside data-reveal="left">
        <span class="kicker">${icon("message")} قنوات مباشرة</span>
        <h2 style="margin-top:.8rem;font-size:var(--fs-h3)">أسرع طريقة</h2>
        <p style="margin-top:.5rem;color:var(--muted);font-size:.95rem">
          إن كان الأمر عاجلًا أو قصيرًا، البريد المباشر أسرع من النموذج.
        </p>

        <div class="grid" style="gap:.75rem;margin-top:1.4rem">
          <div class="contact-method">
            <span class="contact-method__ico">${icon("mail")}</span>
            <div style="flex:1;min-width:0">
              <p class="contact-method__t">البريد الإلكتروني</p>
              <p class="contact-method__v latin">${esc(D.email)}</p>
            </div>
            <button class="hub__act" type="button" data-copy="${esc(D.email)}" aria-label="نسخ البريد">${icon("copy")}</button>
          </div>

          <div class="contact-method">
            <span class="contact-method__ico">${icon("doc")}</span>
            <div style="flex:1;min-width:0">
              <p class="contact-method__t">للإعلام والتعاون</p>
              <p class="contact-method__v latin">${esc(D.emailPress)}</p>
            </div>
            <button class="hub__act" type="button" data-copy="${esc(D.emailPress)}" aria-label="نسخ البريد">${icon("copy")}</button>
          </div>

          ${
            D.city || D.country
              ? `<div class="contact-method">
            <span class="contact-method__ico">${icon("location")}</span>
            <div style="flex:1;min-width:0">
              <p class="contact-method__t">الموقع</p>
              <p class="contact-method__v">${[D.city, D.country].filter(Boolean).map(esc).join(" — ")}</p>
            </div>
          </div>`
              : ""
          }

          <div class="contact-method">
            <span class="contact-method__ico">${icon("clock")}</span>
            <div style="flex:1;min-width:0">
              <p class="contact-method__t">وقت الرد</p>
              <p class="contact-method__v">خلال ٢–٧ أيام عمل</p>
            </div>
          </div>
        </div>

        <div class="divider" style="margin-block:1.8rem"></div>

        <p class="footer-col__title">على الشبكة</p>
        <div class="socials" style="margin-top:.9rem">
            ${soc}
        </div>

        <div class="divider" style="margin-block:1.8rem"></div>

        <p class="footer-col__title">قبل أن ترسل</p>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:.7rem;color:var(--muted);font-size:.92rem">
          <li>${icon("check")} اكتب ما تريده في سطرين — التصريح يختصر الوقت.</li>
          <li>${icon("check")} لا ترسل بيانات مريض أو أي معلومات سرّية.</li>
          <li>${icon("check")} للاستفسارات العاجلة استعمل البريد المباشر.</li>
          <li>${icon("check")} المحتوى الطبي هنا تثقيفي وليس استشارة.</li>
        </ul>
      </aside>
    </div>
  </div>
</section>

`;

  return layout({
    active: "/contact",
    path: "/contact",
    title: "اتصل بنا",
    desc: "تواصل مع الدكتور ياسر حسن: طلبات محاضرات، مناقشة أفكار، اقتراح مصادر، أو أي سؤال حول المحتوى.",
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      mainEntity: {
        "@type": "Organization",
        name: site.shortName,
        url: site.origin,
        email: D.email,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: D.email,
          availableLanguage: ["Arabic"],
        },
      },
    },
  });
}

/* ============================================================
   10) صفحة الشكر
   ============================================================ */
export function thankYouPage() {
  const body = `<section class="err">
  <div class="shell">
    <span class="kicker" style="justify-content:center">${icon("checkCircle")} تم الإرسال</span>
    <h1 class="err__code" style="font-size:clamp(3rem,2rem+7vw,7rem);margin-top:1rem">شكرًا<span class="gradient-text"> لك</span></h1>
    <p class="lead" style="max-width:52ch;margin-inline:auto;margin-top:1rem">
      وصلت رسالتك بنجاح. سيُقرأ الردّ بتمعّن، وغالبًا ما يستغرق بين يومين وسبعة أيام عمل.
    </p>
    <div class="err__actions">
      <a class="btn btn--primary btn--lg" href="/">${icon("arrowRight")}<span>العودة للرئيسية</span></a>
      <a class="btn btn--ghost btn--lg" href="/ideas">${icon("book")}<span>تصفّح الأفكار</span></a>
    </div>
  </div>
</section>`;

  return layout({
    active: "/contact",
    path: "/thank-you",
    noIndex: true,
    title: "تم إرسال رسالتك",
    desc: "شكرًا لتواصلك مع الدكتور ياسر حسن. وصلت رسالتك وسيُردّ عليها خلال يومين إلى سبعة أيام عمل.",
    body,
  });
}

/* ============================================================
   11) 404
   ============================================================ */
export function notFoundPage() {
  const quick = [
    { href: "/", label: "الرئيسية", icon: "arrowRight" },
    { href: "/about", label: "عن الدكتور", icon: "user" },
    { href: "/ideas", label: "الأفكار", icon: "book" },
    { href: "/projects", label: "المشاريع", icon: "spark" },
    { href: "/links", label: "الروابط", icon: "link" },
    { href: "/contact", label: "اتصل بنا", icon: "message" },
  ]
    .map(
      (q) =>
        `<a class="btn btn--ghost" href="${q.href}">${icon(q.icon)}<span>${esc(q.label)}</span></a>`
    )
    .join("\n        ");

  const body = `<section class="err">
  <div class="shell">
    <span class="kicker" style="justify-content:center">${icon("compass")} ضائع</span>
    <h1 class="err__code">404</h1>
    <p class="lead" style="max-width:52ch;margin-inline:auto;margin-top:1rem">
      الصفحة التي تبحث عنها غير موجودة، أو نُقلت إلى مكان آخر. لا بأس — هذا يحدث في كل موقع،
      والمهم أن تجد طريقك من جديد.
    </p>
    <div class="err__actions">
        ${quick}
    </div>
    <p class="form-note" style="margin-top:2.5rem">
      ${icon("search")} جرّب البحث في <a href="/ideas" class="tlink">الأرشيف</a>، أو انتقل مباشرة إلى
      <a href="/links" class="tlink">صفحة الروابط</a>.
    </p>
  </div>
</section>`;

  return layout({
    path: "/404",
    noIndex: true,
    title: "الصفحة غير موجودة",
    desc: "الصفحة المطلوبة غير موجودة على tfkir.net.",
    body,
  });
}

/* ============================================================
   12) الخصوصية
   ============================================================ */
export function privacyPage() {
  const body = `${pageHero({
    kicker: "معلومات قانونية",
    title: "سياسة <span class=\"gradient-text\">الخصوصية</span>",
    lead: "وصف موجز وواضح بكيفية التعامل مع البيانات المرسلة عبر هذا الموقع.",
    crumbs: [{ label: "الرئيسية", href: "/" }, { label: "سياسة الخصوصية" }],
    meta: [`آخر تحديث: ${site.updatedAt}`],
  })}

<section class="section">
  <div class="shell">
    <div class="prose">
      <h2>1. ما البيانات التي يُجمعها هذا الموقع</h2>
      <p>
        هذا موقع ثابت (Static) لا يملك قاعدة بيانات ولا حسابات مستخدمين. لا يُطلب منك تسجيل الدخول،
        ولا تُخزَّن تفضيلاتك إلا في ذاكرة المتصفح نفسها (مثل سمة الفاتحة/الداكنة).
      </p>

      <h2>2. نموذج التواصل</h2>
      <p>
        عند إرسال النموذج، تُرسل البيانات (الاسم، البريد، الهاتف إن وُجد، الموضوع، ونص الرسالة)
        إلى بريد الموقع، لأجل الردّ عليها، ولا تُستخدم هذه البيانات لأي غرض تسويقي، ولا تُشارك مع طرف ثالث.
      </p>
      <ul>
        <li>حقل خفي (honeypot) يمنع الرسائل الآلية ويُردّ عليه بصمت.</li>
        <li>لا يُطلب منك أي بيانات طبية أو سرّية. الرجاء عدم إرسالها.</li>
      </ul>

      <h2>3. ملفات تعريف الارتباط (Cookies)</h2>
      <p>
        لا يستخدم الموقع أي ملفات ارتباط للتتبّع أو الإعلانات. يُستخدم <span class="latin">localStorage</span>
        فقط لتذكّر سمة العرض (فاتحة/داكنة)، ويمكنك مسحه من إعدادات المتصفح في أي وقت.
      </p>

      <h2>4. الخطوط الخارجية</h2>
      <p>
        يُحمَّل الموقع الخطوط من خدمة Google Fonts. عند تحميلها، يتلقّى مزوّد الخدمة عنوان IP
        الخاص بك كأي طلب شبكي عادي. يمكن منع ذلك باستخدام إضافة حجب في المتصفح.
      </p>

      <h2>5. أدوات التحليل</h2>
      <p>
        في حال إضافة أدوات تحليل (مثل Cloudflare Web Analytics) ستُوضَّح هنا طبيعة البيانات المجمَّعة وهويتها.
      </p>

      <h2>6. المحتوى الطبي</h2>
      <p>
        كل ما يُنشر في الموقع رأيٌ شخصي لأغراض تثقيفية، ولا يُغني عن استشارة طبية مباشرة ولا يُغني عن
        تقدير الطبيب المسؤول عن حالتك. في حالات الطوارئ لا تنتظر ردًّا من هذا الموقع.
      </p>

      <h2>7. حقوقك</h2>
      <p>
        يمكنك في أي وقت طلب حذف رسالتك أو تعديلها، أو الاعتراض على معالجة بياناتك. راسل
        <a href="mailto:${esc(D.email)}">${esc(D.email)}</a> وسيُنفَّذ الطلب.
      </p>

      <h2>8. تحديث السياسة</h2>
      <p>
        قد تُحدَّث هذه السياسة عند تغيّر الموقع. آخر تحديث: <span class="latin">${site.updatedAt}</span>.
      </p>

    </div>
  </div>
</section>`;

  return layout({
    active: "/privacy",
    path: "/privacy",
    title: "سياسة الخصوصية",
    desc: "سياسة خصوصية موقع tfkir.net: البيانات المرسلة عبر نموذج التواصل، وملفات الارتباط، والخطوط الخارجية.",
    body,
  });
}