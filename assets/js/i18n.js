/* ============================================================
   assets/js/i18n.js — ترجمات واجهة الموقع (AR / TR / EN)
   يُحمَّل قبل app.js. يُحدّث النصوص المعلَّمة بـ data-i18n.
   ============================================================ */
(function () {
  "use strict";

  var DICT = {
    ar: {
      dir: "rtl", lang: "ar",
      nav: { home: "الرئيسية", about: "عن الدكتور", thinking: "التفكير الطبي", ideas: "الأفكار", projects: "المشاريع", talks: "المحاضرات", links: "الروابط", contact: "اتصل بنا" },
      brand: "تفكير.نت",
      hero: {
        kicker: "الدكتور ياسر حسن",
        title: "إصلاح التفكير مفتاح كل إصلاح",
        lead: "منصة فكرية وتدريبية يقودها الدكتور ياسر حسن: منظّمة حول فرضية واحدة — مشكلات الفرد والمجتمع والأمة تُحلّ حين يُصلَح التفكير وتُقوّى مهاراته. نظريات ومنهجيات ودورات في الطب والمنطق والحِجاج واللغة والنهضة والتحقيق والتجديد.",
        cta1: "ابدأ من الميادين", cta2: "تواصل",
      },
      domains: { kicker: "الميادين", title: "ستة ميادين، خيطٌ واحد", lead: "كل ميدان يبدأ من سؤال واحد: كيف نفكّر فيه؟" },
      intro: { chip: "01 — عن المنصة", title: "إصلاح التفكير مفتاح كل إصلاح", lead: "منصة فكرية وتدريبية: نظريات ومنهجيات ودورات في الطب والمنطق والحِجاج واللغة والنهضة والتحقيق والتجديد — يجمعها خيط واحد. كل ميدان يبدأ من سؤال واحد: كيف نفكّر فيه؟", cta1: "ابدأ من الميادين", cta2: "تواصل" },
      sections: { domains: "الميادين", invite: "دعوة", thinking: "التفكير الطبي", contact: "اتصل بنا", links: "الروابط", ideas: "الأفكار", projects: "المشاريع", talks: "المحاضرات", about: "عن الدكتور", privacy: "سياسة الخصوصية" },
      invite: { kicker: "دعوة", title: "هل أنت منظم مؤتمر أو مركز تدريب؟", text: "أستقبل دعوات الدورات والمحاضرات في التفكير الطبي والمنطق والحِجاج واللغة والنهضة، خصوصًا في كليات الطب وبرامج تدريب المقيمين.", cta1: "أرسل دعوة", cta2: "كل الروابط" },
      footer: { built: "", contact: "التواصل", copy: "جميع الحقوق محفوظة.", tagline: "منصة فكرية وتدريبية يقودها الدكتور ياسر حسن: نظريات ومنهجيات ودورات في الطب والمنطق والحِجاج واللغة والنهضة." },
      contact: { kicker: "تواصل", title: "اتصل بنا", lead: "لطلبات الدورات، ومناقشة الأفكار، واقتراح المصادر، أو أي سؤال concerns المحتوى. الرسالة تصل مباشرة، ويجيبها الدكتور ياسر حسن شخصيًا أو عبر بريده.", submit: "إرسال الرسالة", reset: "تفريغ" },
      empty: { ideas: "لا توجد مقالات منشورة بعد. المقالات ستُضاف لاحقًا.", projects: "لا توجد مشاريع منشورة بعد. المشاريع ستُضاف لاحقًا.", talks: "لا توجد جلسات منشورة بعد. المحاضرات ستُضاف لاحقًا." },
      misc: { copy: "نسخ", copied: "تم النسخ", loading: "جارٍ التحميل…", notfound: "الصفحة غير موجودة", thanks: "تم إرسال رسالتك", langAr: "AR", langTr: "TR", langEn: "EN" },
    },
    tr: {
      dir: "ltr", lang: "tr",
      nav: { home: "Ana Sayfa", about: "Hakkında", thinking: "Tıbbî Düşünce", ideas: "Yazılar", projects: "Projeler", talks: "Konuşmalar", links: "Bağlantılar", contact: "İletişim" },
      brand: "tfkir.net",
      hero: {
        kicker: "Dr. Yasser Hassan",
        title: "Düşünceyi onarmak, her onarımın anahtarıdır",
        lead: "Bu platform tek bir önermeden yola çıkar: Birey, toplum ve ümmetin sorunları, düşünce onarıldığında ve becerileri güçlendiğinde çözülür. Burada tıp, mantık, argümantasyon, dil ve diriliş üzerine kuramlar, yöntemler ve kurslar bulacaksınız; hepsini tek bir iplik birbirine bağlar.",
        cta1: "Alanlardan başlayın", cta2: "İletişim",
      },
      domains: { kicker: "Alanlar", title: "Altı alan, tek iplik", lead: "Her alan aynı soruyla başlar: Bunu nasıl düşünüyoruz?" },
      intro: { chip: "01 — Platform hakkında", title: "Düşünceyi onarmak, her onarımın anahtarıdır", lead: "Düşünce, tahkik ve yenilenme üzerine kuram ve yöntemlerimin ayrıntılı sunumu; hepsini tek bir iplik birbirine bağlar.", cta1: "Alanlardan başlayın", cta2: "İletişim" },
      sections: { domains: "Alanlar", invite: "Davet", thinking: "Tıbbî Düşünce", contact: "İletişim", links: "Bağlantılar", ideas: "Yazılar", projects: "Projeler", talks: "Konuşmalar", about: "Hakkında", privacy: "Gizlilik" },
      invite: { kicker: "Davet", title: "Bir konferans veya eğitim merkezi misiniz?", text: "Tıbbî düşünce, mantık, argümantasyon, dil ve diriliş üzerine kurs ve konferans davetlerini kabul ediyorum; özellikle tıp fakülteleri ve asistan eğitim programları için.", cta1: "Davet gönderin", cta2: "Tüm bağlantılar" },
      footer: { built: "", contact: "İletişim", copy: "Tüm hakları saklıdır.", tagline: "Tıp, mantık, argümantasyon, dil ve diriliş üzerine kuram ve yöntemler." },
      contact: { kicker: "İletişim", title: "İletişim", lead: "Kurs talepleri, fikir tartışmaları, kaynak önerileri veya içerikle ilgili her türlü soru için. Mesaj doğrudan ulaşır; Dr. Yasser Hassan bizzat veya e-posta ile yanıt verir.", submit: "Mesajı gönder", reset: "Temizle" },
      empty: { ideas: "Henüz yayınlanmış yazı yok. Yazılar daha sonra eklenecek.", projects: "Henüz yayınlanmış proje yok. Projeler daha sonra eklenecek.", talks: "Henüz yayınlanmış konuşma yok. Konuşmalar daha sonra eklenecek." },
      misc: { copy: "Kopyala", copied: "Kopyalandı", loading: "Yükleniyor…", notfound: "Sayfa bulunamadı", thanks: "Mesajınız gönderildi", langAr: "AR", langTr: "TR", langEn: "EN" },
    },
    en: {
      dir: "ltr", lang: "en",
      nav: { home: "Home", about: "About", thinking: "Medical Thinking", ideas: "Ideas", projects: "Projects", talks: "Talks", links: "Links", contact: "Contact" },
      brand: "tfkir.net",
      hero: {
        kicker: "Dr. Yasser Hassan",
        title: "Repair thinking, and everything else can be repaired",
        lead: "This platform starts from one premise: the problems of individuals, societies and the Ummah are solved when thinking is repaired and its skills strengthened. Here you will find theories, methods and courses on medicine, logic, argumentation, language and renaissance, tied together by a single thread.",
        cta1: "Start with the fields", cta2: "Contact",
      },
      domains: { kicker: "Fields", title: "Six fields, one thread", lead: "Each field begins with the same question: how do we think about it?" },
      intro: { chip: "01 — About the platform", title: "Repair thinking, and everything else can be repaired", lead: "Theories and methods in thinking, verification and renewal, tied together by a single thread.", cta1: "Start with the fields", cta2: "Contact" },
      sections: { domains: "Fields", invite: "Invitation", thinking: "Medical Thinking", contact: "Contact", links: "Links", ideas: "Ideas", projects: "Projects", talks: "Talks", about: "About", privacy: "Privacy" },
      invite: { kicker: "Invitation", title: "Are you an organiser or a training centre?", text: "I accept invitations for courses and lectures on medical thinking, logic, argumentation, language and renaissance — especially for medical faculties and residency programmes.", cta1: "Send an invitation", cta2: "All links" },
      footer: { built: "", contact: "Contact", copy: "All rights reserved.", tagline: "Theories and methods in thinking, verification and renewal." },
      contact: { kicker: "Contact", title: "Contact", lead: "For course requests, idea discussions, source suggestions, or any question about the content. Messages reach me directly; Dr. Yasser Hassan replies personally or by email.", submit: "Send message", reset: "Clear" },
      empty: { ideas: "No published articles yet. Articles will be added later.", projects: "No published projects yet. Projects will be added later.", talks: "No published talks yet. Talks will be added later." },
      misc: { copy: "Copy", copied: "Copied", loading: "Loading…", notfound: "Page not found", thanks: "Your message was sent", langAr: "AR", langTr: "TR", langEn: "EN" },
    },
  };

  function getLang() {
    try {
      var saved = localStorage.getItem("tfkir-lang");
      if (saved && DICT[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || "ar").toLowerCase();
    if (nav.indexOf("tr") === 0) return "tr";
    if (nav.indexOf("en") === 0) return "en";
    return "ar";
  }

  function applyLang(lang) {
    if (!DICT[lang]) lang = "ar";
    var d = DICT[lang];
    document.documentElement.lang = d.lang;
    document.documentElement.dir = d.dir;
    document.documentElement.setAttribute("data-lang", lang);
    try { localStorage.setItem("tfkir-lang", lang); } catch (e) {}

    // Update every [data-i18n] element
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var parts = key.split(".");
      var v = d;
      for (var i = 0; i < parts.length; i++) { v = v && v[parts[i]]; }
      if (typeof v === "string") el.textContent = v;
    });

    // Update [data-i18n-placeholder]
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      var parts = key.split(".");
      var v = d;
      for (var i = 0; i < parts.length; i++) { v = v && v[parts[i]]; }
      if (typeof v === "string") el.setAttribute("placeholder", v);
    });

    // Toggle buttons state
    document.querySelectorAll("[data-lang-btn]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang-btn") === lang ? "true" : "false");
    });

    // Update <title> if a data-i18n-title is present on <title>
    var t = document.querySelector("title[data-i18n]");
    if (t) {
      var key = t.getAttribute("data-i18n");
      var parts = key.split(".");
      var v = d;
      for (var i = 0; i < parts.length; i++) { v = v && v[parts[i]]; }
      if (typeof v === "string") document.title = v + " | tfkir.net — Dr. Yasser Hassan";
    }
  }

  window.TFKIR_I18N = { dict: DICT, getLang: getLang, apply: applyLang };

  // Auto-apply on DOM ready
  function boot() {
    applyLang(getLang());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Expose global switcher
  window.tfkirSetLang = applyLang;
})();
