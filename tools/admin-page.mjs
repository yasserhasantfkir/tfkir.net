/* ============================================================
   tools/admin-page.mjs — لوحة تحرير المقالات (/admin)
   ------------------------------------------------------------
   صفحة مستقلة (بلا هيدر/فوتر الموقع) تستخدم رموز التصميم نفسها.
   ============================================================ */
import { site, doctor } from "./content.mjs";
import { icon } from "./icons.mjs";
import { esc } from "./render.mjs";

const CATEGORIES = [
  "التفكير الطبي", "الأدلة", "التعليم", "الكتابة",
  "الممارسة", "المشاريع", "تأملات", "الصحة العامة", "أخرى",
];

const catOptions = CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");

/* ---------- شريط أدوات المحرّر ---------- */
const TB = (cmd, label, { title = "", cls = "", glyph = "" } = {}) =>
  `<button class="tb-btn ${cls}" type="button" data-cmd="${cmd}" title="${esc(title || label)}" aria-label="${esc(title || label)}">${glyph || esc(label)}</button>`;

const toolbar = `
  <div class="tb" role="toolbar" aria-label="أدوات التنسيق" id="ed-toolbar">
    <div class="tb__group">
      <select class="tb-sel" id="tb-block" aria-label="نمط الفقرة" title="نمط الفقرة">
        <option value="p">نص عادي</option>
        <option value="h2">عنوان كبير</option>
        <option value="h3">عنوان متوسط</option>
        <option value="h4">عنوان صغير</option>
        <option value="blockquote">اقتباس</option>
        <option value="pre">شيفرة</option>
      </select>
      <select class="tb-sel" id="tb-font" aria-label="الخط" title="نوع الخط">
        <option value="">الخط</option>
        <option value="IBM Plex Sans Arabic">عصري</option>
        <option value="Noto Naskh Arabic">نسخ تقليدي</option>
        <option value="Georgia, serif">لاتيني كلاسيكي</option>
        <option value="ui-monospace, monospace">أحادي المسافة</option>
      </select>
      <select class="tb-sel" id="tb-size" aria-label="حجم الخط" title="حجم الخط">
        <option value="">الحجم</option>
        <option value="0.82em">صغير جدًا</option>
        <option value="0.95em">صغير</option>
        <option value="1.15em">كبير</option>
        <option value="1.4em">كبير جدًا</option>
        <option value="1.9em">عنوان</option>
      </select>
    </div>

    <div class="tb__group">
      ${TB("bold", "عريض", { glyph: '<b style="font-size:1.05em">B</b>', cls: "tb-btn--latin", title: "عريض (Ctrl+B)" })}
      ${TB("italic", "مائل", { glyph: '<i style="font-family:Georgia,serif;font-size:1.05em">I</i>', cls: "tb-btn--latin", title: "مائل (Ctrl+I)" })}
      ${TB("underline", "تحته خط", { glyph: '<u style="font-size:1.05em">U</u>', cls: "tb-btn--latin", title: "تحته خط (Ctrl+U)" })}
      ${TB("strikeThrough", "يتوسطه خط", { glyph: '<s style="font-size:1.05em">S</s>', cls: "tb-btn--latin", title: "يتوسطه خط" })}
      <span class="tb-sep" aria-hidden="true"></span>
      <label class="tb-color" title="لون النص">
        <span class="tb-color__a" aria-hidden="true">A</span>
        <input type="color" id="tb-fore" value="#6fe3d0" aria-label="لون النص">
      </label>
      <label class="tb-color tb-color--hl" title="لون التمييز">
        <span class="tb-color__a" aria-hidden="true">■</span>
        <input type="color" id="tb-back" value="#f8eecd" aria-label="لون التمييز">
      </label>
    </div>

    <div class="tb__group">
      <select class="tb-sel" id="tb-align" aria-label="المحاذاة" title="المحاذاة">
        <option value="">المحاذاة</option>
        <option value="right">يمين</option>
        <option value="center">وسط</option>
        <option value="left">يسار</option>
        <option value="justify">ضبط</option>
      </select>
      ${TB("insertUnorderedList", "", { glyph: icon("listUl", "tb-ico"), title: "قائمة نقطية" })}
      ${TB("insertOrderedList", "", { glyph: icon("listOl", "tb-ico"), title: "قائمة مرقّمة" })}
      ${TB("outdent", "", { glyph: icon("outdent", "tb-ico"), title: "إنقاص المسافة البادئة" })}
      ${TB("indent", "", { glyph: icon("indent", "tb-ico"), title: "زيادة المسافة البادئة" })}
    </div>

    <div class="tb__group">
      ${TB("createLink", "", { glyph: icon("link", "tb-ico"), title: "إدراج رابط" })}
      ${TB("insertImage", "", { glyph: icon("image", "tb-ico"), title: "إدراج صورة" })}
      ${TB("insertHorizontalRule", "", { glyph: icon("hr", "tb-ico"), title: "فاصل" })}
      ${TB("removeFormat", "", { glyph: icon("eraser", "tb-ico"), title: "إزالة التنسيق" })}
    </div>

    <div class="tb__group tb__group--end">
      ${TB("undo", "", { glyph: icon("undo", "tb-ico"), title: "تراجع (Ctrl+Z)" })}
      ${TB("redo", "", { glyph: icon("redo", "tb-ico"), title: "إعادة (Ctrl+Y)" })}
    </div>
  </div>`;

/* ---------- المحتوى ---------- */
export function adminPage() {
  const body = `
<div class="adm-bg" aria-hidden="true"><span class="adm-bg__glow"></span><span class="adm-bg__grid"></span></div>

<header class="adm-top" id="adm-top" hidden>
  <div class="adm-top__bar">
    <a class="brand" href="/" aria-label="الصفحة الرئيسية">
      <span class="brand__mark" aria-hidden="true">ت</span>
      <span class="brand__text">
        <span class="brand__name">${esc(site.shortName)}</span>
        <span class="brand__sub">لوحة التحرير</span>
      </span>
    </a>
    <div class="adm-top__actions">
      <span class="adm-user" id="adm-user" hidden></span>
      <button class="icon-btn" id="adm-settings" type="button" aria-label="إدارة الحساب" title="إدارة الحساب">${icon("settings")}</button>
      <button class="icon-btn" id="adm-theme" type="button" aria-label="تبديل السمة" title="تبديل السمة">${icon("moon", "i-moon")}${icon("sun", "i-sun")}</button>
      <button class="btn btn--ghost btn--sm" id="adm-logout" type="button">${icon("logout")}<span>خروج</span></button>
    </div>
  </div>
</header>

<main class="adm-main" id="adm-main">

  <!-- ============ تسجيل الدخول ============ -->
  <section class="adm-view adm-view--center" id="view-login" hidden>
    <div class="adm-card adm-card--auth">
      <span class="kicker">${icon("lock")} لوحة التحرير</span>
      <h1 class="adm-h1">تسجيل الدخول</h1>
      <p class="adm-sub">ادخل باسم المستخدم وكلمة المرور للوصول إلى مقالاتك.</p>

      <form class="adm-form" id="login-form" novalidate>
        <label class="adm-field" data-field="username">
          <span class="adm-label">اسم المستخدم</span>
          <input class="adm-input" id="lg-user" name="username" type="text" autocomplete="username"
                 autocapitalize="none" spellcheck="false" required dir="ltr">
        </label>
        <label class="adm-field" data-field="password">
          <span class="adm-label">كلمة المرور</span>
          <input class="adm-input" id="lg-pass" name="password" type="password" autocomplete="current-password" required dir="ltr">
        </label>
        <p class="adm-alert" id="login-error" hidden role="alert"></p>
        <button class="btn btn--primary btn--block btn--lg" id="login-submit" type="submit">دخول</button>
      </form>
    </div>
  </section>

  <!-- ============ تغيير إجباري ============ -->
  <section class="adm-view adm-view--center" id="view-force" hidden>
    <div class="adm-card adm-card--auth">
      <span class="kicker">${icon("shield")} خطوة إلزامية</span>
      <h1 class="adm-h1">غيّر بيانات الدخول أولًا</h1>
      <p class="adm-sub">
        هذه أول مرة تسجّل فيها الدخول. لأمانك يجب تغيير اسم المستخدم وكلمة المرور
        الافتراضية قبل أن تتمكّن من كتابة أي مقال.
      </p>

      <form class="adm-form" id="force-form" novalidate>
        <label class="adm-field" data-field="currentPassword">
          <span class="adm-label">كلمة المرور الحالية</span>
          <input class="adm-input" id="fc-old" type="password" autocomplete="current-password" required dir="ltr">
        </label>
        <label class="adm-field" data-field="newUsername">
          <span class="adm-label">اسم المستخدم الجديد</span>
          <input class="adm-input" id="fc-user" type="text" autocomplete="username" dir="ltr"
                 autocapitalize="none" spellcheck="false" required minlength="3">
          <span class="adm-hint">حروف وأرقام فقط، ٣ خانات فأكثر.</span>
        </label>
        <label class="adm-field" data-field="newPassword">
          <span class="adm-label">كلمة المرور الجديدة</span>
          <input class="adm-input" id="fc-pass" type="password" autocomplete="new-password" required minlength="8" dir="ltr">
          <span class="adm-hint">٨ خانات فأكثر. لا تستخدم كلمة المرور الافتراضية.</span>
        </label>
        <label class="adm-field" data-field="confirmPassword">
          <span class="adm-label">تأكيد كلمة المرور</span>
          <input class="adm-input" id="fc-pass2" type="password" autocomplete="new-password" required dir="ltr">
        </label>
        <p class="adm-alert" id="force-error" hidden role="alert"></p>
        <button class="btn btn--primary btn--block btn--lg" id="force-submit" type="submit">حفظ ودخول</button>
      </form>
    </div>
  </section>

  <!-- ============ اللوحة ============ -->
  <section class="adm-view adm-view--wide" id="view-app" hidden>
    <div class="adm-hero">
      <div class="adm-hero__text">
        <span class="kicker">${icon("book")} المقالات</span>
        <h1 class="adm-h1">مكتبة المقالات</h1>
        <p class="adm-sub">اكتب، احفظ كمسودة، ثم انشر عندما يجهز. كل حفظ تلقائي يُنقذ مسودتك على الخادم.</p>
      </div>
      <button class="btn btn--primary btn--lg" id="adm-new" type="button">${icon("plus")}<span>مقال جديد</span></button>
    </div>

    <div class="adm-stats" id="adm-stats">
      <button class="stat-card is-active" type="button" data-tab="drafts" aria-pressed="true">
        <span class="stat-card__n" id="c-drafts">0</span>
        <span class="stat-card__l">مسودة</span>
      </button>
      <button class="stat-card" type="button" data-tab="published" aria-pressed="false">
        <span class="stat-card__n" id="c-published">0</span>
        <span class="stat-card__l">منشور</span>
      </button>
      <button class="stat-card" type="button" data-tab="all" aria-pressed="false">
        <span class="stat-card__n" id="c-total">0</span>
        <span class="stat-card__l">الكل</span>
      </button>
    </div>

    <div class="adm-tools">
      <label class="adm-search">
        ${icon("search")}
        <input id="adm-search" type="search" placeholder="ابحث في العناوين والمتن…" aria-label="بحث">
      </label>
      <select class="adm-select" id="adm-cat" aria-label="تصفية حسب التصنيف">
        <option value="*">كل التصنيفات</option>
        ${catOptions}
      </select>
      <button class="icon-btn" id="adm-refresh" type="button" aria-label="تحديث" title="تحديث">${icon("refresh")}</button>
    </div>

    <div class="adm-list" id="adm-list"></div>
    <p class="adm-empty" id="adm-empty" role="status" aria-live="polite" hidden></p>
  </section>

  <!-- ============ المحرّر ============ -->
  <section class="adm-editor" id="view-editor" hidden>
    <header class="ed-top">
      <button class="icon-btn" id="ed-back" type="button" aria-label="رجوع إلى القائمة" title="رجوع">${icon("arrowLeft")}</button>
      <span class="ed-status" id="ed-status" data-state="idle" role="status" aria-live="polite">مسودة جديدة</span>
      <div class="ed-top__actions">
        <button class="btn btn--ghost btn--sm" id="ed-preview" type="button">${icon("eye")}<span>معاينة</span></button>
        <button class="btn btn--ghost btn--sm" id="ed-draft" type="button">${icon("save")}<span>حفظ كمسودة</span></button>
        <button class="btn btn--primary btn--sm" id="ed-publish" type="button">${icon("send")}<span>نشر</span></button>
        <button class="icon-btn icon-btn--danger" id="ed-delete" type="button" aria-label="حذف المقال" title="حذف المقال">${icon("trash")}</button>
      </div>
    </header>

    <div class="ed-fields">
      <input class="ed-title" id="ed-title" type="text" placeholder="عنوان المقال…" aria-label="عنوان المقال" autocomplete="off">
      <input class="ed-excerpt" id="ed-excerpt" type="text" placeholder="ملخّص المقال — يظهر في البطاقات ومحركات البحث (سيُولَّد تلقائيًا إن تُرك فارغًا)" aria-label="ملخّص المقال" autocomplete="off">
      <div class="ed-fields__row">
        <label class="ed-sel">
          <span>التصنيف</span>
          <select class="adm-select" id="ed-category">${catOptions}</select>
        </label>
        <label class="ed-sel ed-sel--grow">
          <span>الوسوم</span>
          <input class="adm-input" id="ed-tags" type="text" placeholder="طبي، تفكير، أدلة" aria-label="الوسوم">
        </label>
        <label class="ed-sel ed-sel--grow">
          <span>الرابط</span>
          <input class="adm-input" id="ed-slug" type="text" dir="ltr" placeholder="article-slug" aria-label="الرابط">
        </label>
      </div>
    </div>

    ${toolbar}

    <div class="ed-paper">
      <div class="prose ed-prose" id="ed-content" contenteditable="true" spellcheck="true"
           role="textbox" aria-multiline="true" aria-label="متن المقال"></div>
    </div>

    <footer class="ed-foot">
      <span id="ed-counts">٠ كلمة · ٠ دقيقة</span>
      <span class="ed-foot__sep" aria-hidden="true">·</span>
      <span id="ed-autosave">الحفظ التلقائي مفعّل كل ٣٠٠ حرف</span>
    </footer>
  </section>
</main>

<!-- ============ نافذة إدارة الحساب ============ -->
<div class="modal" id="modal" hidden role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal__scrim" data-close-modal></div>
  <div class="adm-card adm-card--auth modal__box">
    <h2 class="adm-h2" id="modal-title">إدارة الحساب</h2>
    <p class="adm-sub">غيّر اسم المستخدم أو كلمة المرور في أي وقت.</p>
    <form class="adm-form" id="cred-form" novalidate>
      <label class="adm-field" data-field="currentPassword">
        <span class="adm-label">كلمة المرور الحالية</span>
        <input class="adm-input" id="cc-old" type="password" autocomplete="current-password" required dir="ltr">
      </label>
      <label class="adm-field" data-field="newUsername">
        <span class="adm-label">اسم المستخدم</span>
        <input class="adm-input" id="cc-user" type="text" autocomplete="username" dir="ltr" required minlength="3">
      </label>
      <label class="adm-field" data-field="newPassword">
        <span class="adm-label">كلمة المرور الجديدة</span>
        <input class="adm-input" id="cc-pass" type="password" autocomplete="new-password" minlength="8" dir="ltr"
               placeholder="اتركها فارغة للإبقاء على الحالية">
        <span class="adm-hint">٨ خانات فأكثر.</span>
      </label>
      <label class="adm-field" data-field="confirmPassword">
        <span class="adm-label">تأكيد كلمة المرور</span>
        <input class="adm-input" id="cc-pass2" type="password" autocomplete="new-password" dir="ltr">
      </label>
      <p class="adm-alert" id="cred-error" hidden role="alert"></p>
      <div class="adm-row">
        <button class="btn btn--primary" id="cred-submit" type="submit">حفظ التغييرات</button>
        <button class="btn btn--ghost" type="button" data-close-modal>إلغاء</button>
      </div>
    </form>
  </div>
</div>

<!-- ============ نافذة المعاينة ============ -->
<div class="modal" id="preview" hidden role="dialog" aria-modal="true" aria-label="معاينة المقال">
  <div class="modal__scrim" data-close-preview></div>
  <article class="pv" id="pv">
    <header class="pv__bar">
      <span class="pv__label">معاينة</span>
      <button class="icon-btn" type="button" data-close-preview aria-label="إغلاق">${icon("close")}</button>
    </header>
    <div class="pv__scroll">
      <div class="article__head pv__head">
        <span class="kicker" id="pv-cat">—</span>
        <h1 class="article__title" id="pv-title">بلا عنوان</h1>
        <div class="article__meta">
          <span>${icon("user")} ${esc(doctor.nameAr)}</span>
          <span>${icon("clock")} <span id="pv-read">—</span></span>
        </div>
      </div>
      <div class="prose" id="pv-body"></div>
    </div>
  </article>
</div>

<!-- ============ تأكيد ============ -->
<div class="modal" id="confirm" hidden role="dialog" aria-modal="true" aria-labelledby="confirm-title">
  <div class="modal__scrim" data-close-confirm></div>
  <div class="adm-card adm-card--auth modal__box">
    <h2 class="adm-h2" id="confirm-title">تأكيد</h2>
    <p class="adm-sub" id="confirm-text"></p>
    <div class="adm-row">
      <button class="btn btn--primary" id="confirm-yes" type="button">تأكيد</button>
      <button class="btn btn--ghost" type="button" data-close-confirm>إلغاء</button>
    </div>
  </div>
</div>

<div class="toast" id="toast" role="status" aria-live="polite">${icon("checkCircle")}<span id="toast-text"></span></div>
`;

  return `<!doctype html>
<html lang="ar" dir="rtl" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>لوحة التحرير | ${esc(site.shortName)}</title>
<meta name="description" content="لوحة تحرير المقالات">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="site-version" content="__SITE_VERSION__">
<meta name="theme-color" content="${site.themeColor}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/pages.css">
<link rel="stylesheet" href="/assets/css/admin.css">
<script>
(function(){try{var t=localStorage.getItem('tfkir-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
</script>
</head>
<body class="adm-body">
${body}
<script src="/assets/js/admin.js" defer></script>
</body>
</html>`;
}