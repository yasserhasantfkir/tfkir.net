/* ============================================================
   tfkir.net — app.js
   كل الوظائف خفيفة، بدون أي مكتبات خارجية.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var STRINGS = window.TFKIR_STR || {};
  var S = function (key, fallback) { return STRINGS[key] || fallback; };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     1) السمة (فاتحة / داكنة)
     --------------------------------------------------------- */
  var THEME_KEY = "tfkir-theme";
  function initTheme() {
    var root = document.documentElement;
    var btn = $("#theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      btn.setAttribute("aria-label", next === "dark" ? S("themeOn","تفعيل السمة الفاتحة") : S("themeOff","تفعيل السمة الداكنة"));
    });
  }

  /* ---------------------------------------------------------
     2) الهيدر: التثبيت + شريط التقدّم
     --------------------------------------------------------- */
  function initHeader() {
    var header = $("#site-header");
    var bar = $("#scroll-progress");
    var toTop = $("#to-top");
    if (!header) return;
    var last = -1;

    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      var stuck = y > 12;
      if (stuck !== (header.dataset.stuck === "true")) header.dataset.stuck = String(stuck);

      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, y / max) : 0;
      if (bar) bar.style.transform = "scaleX(" + pct + ")";

      if (toTop) toTop.dataset.show = String(y > 620);

      /* وقف حلقات الخلفية عندما يغادر البطل الشاشة */
      var hero = document.getElementById("hero");
      if (hero) {
        var inView = String(y < window.innerHeight * 0.9);
        if (inView !== root.dataset.heroInView) root.dataset.heroInView = inView;
      }

      // active nav item
      var path = location.pathname.replace(/\/index\.html$/, "/");
      if (path === "" || path === "/index.html") path = "/";
      if (path !== last) {
        last = path;
        $$(".nav__link").forEach(function (a) {
          var h = a.getAttribute("href");
          var match = h === path || (h !== "/" && path.indexOf(h) === 0);
          if (match) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        });
      }
    }

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });
    onScroll();

    if (toTop) {
      toTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
      });
    }
  }

  /* ---------------------------------------------------------
     3) قائمة الهاتف
     --------------------------------------------------------- */
  function initDrawer() {
    var drawer = $("#drawer");
    var toggle = $("#nav-toggle");
    if (!drawer || !toggle) return;
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      drawer.dataset.open = "true";
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var first = $(".drawer__link", drawer);
      if (first) setTimeout(function () { first.focus(); }, 220);
    }
    function close() {
      drawer.dataset.open = "false";
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    function isOpen() { return drawer.dataset.open === "true"; }

    toggle.addEventListener("click", function () { isOpen() ? close() : open(); });
    $$("[data-close-drawer]", drawer).forEach(function (el) { el.addEventListener("click", close); });
    $$(".drawer__link", drawer).forEach(function (el) { el.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close();
      if (e.key === "Tab" && isOpen()) {
        var f = $$('a[href],button:not([disabled])', drawer);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 1080 && isOpen()) close(); });
  }

  /* ---------------------------------------------------------
     4) الظهور عند التمرير
     --------------------------------------------------------- */
  function initReveal() {
    var items = $$('[data-reveal], .split-line, .is-in');
    if (!items.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) {
      $$('[data-reveal]').forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
    $$('.split-line').forEach(function (el) { io.observe(el.parentElement || el); });
  }

  /* ---------------------------------------------------------
     5) عدّادات
     --------------------------------------------------------- */
  function initCounters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) {
      nums.forEach(function (el) { el.textContent = el.dataset.count; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.dataset.count || "0");
        var dur = 1500;
        var t0 = null;
        function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = String(target);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     6) الأكورديون
     --------------------------------------------------------- */
  function initAccordions() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".acc__btn");
      if (!btn) return;
      var item = btn.closest(".acc__item");
      var open = item.dataset.open === "true";
      item.dataset.open = open ? "false" : "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
  }

  /* ---------------------------------------------------------
     7) التصفية (أفكار / مشاريع / محاضرات)
     --------------------------------------------------------- */
  function initFilters() {
    var sets = [
      { filters: "#idea-filters", grid: "#idea-grid", empty: "#idea-empty", key: "cat" },
      { filters: "#proj-filters", grid: "#proj-grid", empty: "#proj-empty", key: "cat" },
      { filters: "#talk-filters", grid: "#talk-grid", empty: "#talk-empty", key: "cat" },
    ];

    sets.forEach(function (cfg) {
      var bar = $(cfg.filters);
      var grid = $(cfg.grid);
      if (!bar || !grid) return;

      bar.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-filter]");
        if (!btn) return;
        var val = btn.dataset.filter;
        $$("[data-filter]", bar).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });

        var shown = 0;
        $$("[data-cat]", grid).forEach(function (card) {
          var match = val === "*" || card.dataset.cat === val;
          card.hidden = !match;
          if (match) shown++;
        });
        var empty = cfg.empty && $(cfg.empty);
        if (empty) empty.hidden = shown > 0;
      });

      // support ?cat=
      var params = new URLSearchParams(location.search);
      var want = params.get("cat");
      if (want) {
        var hit = $$("[data-filter]", bar).filter(function (b) { return b.dataset.filter === want; })[0];
        if (hit) hit.click();
      }
    });

    /* شبكة بلا بطاقات تُظهر حالة الفراغ فور الإقلاع */
    sets.forEach(function (cfg) {
      var grid = $(cfg.grid);
      if (!grid || $$("[data-cat]", grid).length) return;
      var empty = cfg.empty && $(cfg.empty);
      if (empty) empty.hidden = false;
    });
  }

  /* ---------------------------------------------------------
     8) النسخ إلى الحافظة + التنبيه
     --------------------------------------------------------- */
  function initCopy() {
    var toast = $("#toast");
    var toastText = $("#toast-text");
    var timer;

    function notify(msg) {
      if (!toast) return;
      toastText.textContent = msg;
      toast.dataset.show = "true";
      clearTimeout(timer);
      timer = setTimeout(function () { toast.dataset.show = "false"; }, 2400);
    }

    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function (resolve, reject) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        try {
          var ok = document.execCommand("copy");
          document.body.removeChild(ta);
          ok ? resolve() : reject(new Error("copy failed"));
        } catch (err) {
          document.body.removeChild(ta);
          reject(err);
        }
      });
    }

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-copy]");
      if (!btn) return;
      e.preventDefault();
      var val = btn.dataset.copy;
      copyText(val).then(function () { notify(S("copiedPrefix","نُسخ: ") + val); })
        .catch(function () { notify(S("copyFailed","تعذّر النسخ — انسخ يدويًا: ") + val); });
    });

    window.__tfkirToast = notify;
  }

  /* ---------------------------------------------------------
     9) نموذج التواصل
     --------------------------------------------------------- */
  function initContactForm() {
    var form = $("#contact-form");
    if (!form) return;

    var statusBox = $("#form-status");
    var statusIcon = $("#form-status-icon");
    var statusText = $("#form-status-text");
    var submit = $("#cf-submit");
    var reset = $("#cf-reset");
    var counter = $("#char-count");
    var msg = $("#cf-message");

    // عدّاد الأحرف
    if (counter && msg) {
      var upd = function () { counter.textContent = String(msg.value.length); };
      msg.addEventListener("input", upd);
      upd();
    }

    // ملء الموضوع من ?type=
    var params = new URLSearchParams(location.search);
    var typeMap = {
      talk: "طلب محاضرة أو ورشة",
      resource: "اقتراح مصدر لصفحة الروابط",
      project: "مقترح مشروع أو فكرة",
      general: "رسالة عامة",
    };
    var sel = $("#cf-subject");
    if (params.get("type") && sel && typeMap[params.get("type")]) sel.value = typeMap[params.get("type")];

    function fieldOf(input) { return input.closest(".field"); }

    function validateField(input) {
      var wrap = fieldOf(input);
      if (!wrap) return true;
      var ok = input.checkValidity();
      if (input.type === "checkbox") ok = input.checked;
      else if (input.type === "email") ok = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(input.value.trim());
      else if (input.hasAttribute("minlength")) {
        ok = input.value.trim().length >= parseInt(input.getAttribute("minlength"), 10);
      } else ok = input.value.trim().length > 0;
      wrap.dataset.invalid = ok ? "false" : "true";
      return ok;
    }

    function validateAll() {
      var ok = true;
      $$("input[name], textarea[name], select[name]", form).forEach(function (i) {
        if (i.name === "website") return;
        if (!validateField(i)) ok = false;
      });
      return ok;
    }

    $$("input[name], textarea[name], select[name]", form).forEach(function (input) {
      if (input.name === "website") return;
      input.addEventListener("blur", function () { validateField(input); });
      input.addEventListener("input", function () {
        var w = fieldOf(input);
        if (w && w.dataset.invalid === "true") validateField(input);
      });
      if (input.type === "checkbox") {
        input.addEventListener("change", function () { validateField(input); });
      }
    });

    function setStatus(tone, html) {
      if (!statusBox) return;
      statusBox.dataset.tone = tone;
      statusBox.dataset.show = "true";
      statusIcon.innerHTML = tone === "ok"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.6 2.6L16 9.5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.6v5M12 16.2h.01"/></svg>';
      statusText.innerHTML = html;
    }

    function buildMailto(data) {
      var from = S("mailFrom", "من");
      var lName = S("labelName", "الاسم");
      var lEmail = S("labelEmail", "البريد");
      var lPhone = S("labelPhone", "الهاتف");
      return (
        "mailto:" + form.dataset.email + "?subject=" +
        encodeURIComponent("[" + data.subject + "] " + from + " " + data.name) +
        "&body=" + encodeURIComponent(data.message + "\n\n—\n" + lName + ": " + data.name +
          "\n" + lEmail + ": " + data.email + (data.phone ? "\n" + lPhone + ": " + data.phone : ""))
      );
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateAll()) {
        setStatus("err", S("fixFields", "الرجاء تصحيح الحقول المعلَّمة بالأحمر قبل الإرسال."));
        var bad = $('[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select', form);
        if (bad) bad.focus();
        return;
      }

      // مصيدة الرسائل الآلية (honeypot)
      if (form.elements.website && form.elements.website.value) {
        setStatus("ok",S("thanksSpam", "شكرًا لك، تم استلام رسالتك."));
        return;
      }

      var data = {
        name: $("#cf-name").value.trim(),
        email: $("#cf-email").value.trim(),
        phone: $("#cf-phone").value.trim(),
        subject: (function () { var sl = $("#cf-subject"); return sl && sl.selectedIndex >= 0 ? sl.options[sl.selectedIndex].textContent.trim() : sl.value; })(),
        message: $("#cf-message").value.trim(),
      };

      var btnLabel = submit ? submit.innerHTML : "";
      if (submit) {
        submit.disabled = true;
        submit.innerHTML = '<span>' + S("sending", "جارٍ الإرسال…") + '</span>';
      }

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.ok) {
            setStatus("ok", S("sentOk", "وصلت رسالتك بنجاح. سيُردّ عليها خلال ٢–٧ أيام عمل. شكرًا لك."));
            form.reset();
            if (counter) counter.textContent = "0";
          } else {
            // لا توجد وظيفة خادم: افتح برنامج البريد كبديل آمن
            window.location.href = buildMailto(data);
            setStatus("ok", S("mailtoAuto",
              "لم يتوفّر الإرسال التلقائي، فُتح برنامج البريد برسالتك جاهزة. اضغط <b>إرسال</b> لإتمامها."));
          }
        })
        .catch(function () {
          window.location.href = buildMailto(data);
          setStatus("ok", S("mailtoDirect",
            "تعذّر الاتصال المباشر، فُتح برنامج البريد برسالتك جاهزة. اضغط <b>إرسال</b> لإتمامها."));
        })
        .then(function () {
          if (submit) { submit.disabled = false; submit.innerHTML = btnLabel; }
        });
    });

    if (reset) {
      reset.addEventListener("click", function () {
        form.reset();
        $$(".field", form).forEach(function (w) { w.dataset.invalid = "false"; });
        if (statusBox) statusBox.dataset.show = "false";
        if (counter) counter.textContent = "0";
      });
    }
  }

  /* ---------------------------------------------------------
     10) صفحة المقال
     --------------------------------------------------------- */
  function initArticle() {
    var head = $("#article-head");
    var body = $("#article-body");
    if (!head || !body) return;

    var loading = $("#article-loading");
    var notFound = $("#article-404");

    var slug = new URLSearchParams(location.search).get("id");

    /* ١) مقال محرَّم على الخادم (SSR) */
    var ssr = window.TFKIR_SSR_POST;
    if (ssr && ssr.slug) {
      decorateArticle(ssr);
      if (loading) loading.hidden = true;
      return;
    }

    /* ٢) مقالات البناء الثابت */
    var data = window.TFKIR_IDEAS || [];
    var post = data.filter(function (p) { return p.slug === slug; })[0];
    if (post) {
      renderArticleBody(body, post);
      decorateArticle(post);
      if (loading) loading.hidden = true;
      return;
    }

    /* ٣) مقالات قاعدة البيانات (احتياطي بلا SSR) */
    if (!slug) {
      if (loading) loading.hidden = true;
      showArticleMissing();
      return;
    }
    fetch("/api/posts/" + encodeURIComponent(slug), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (loading) loading.hidden = true;
        if (!d || !d.ok || !d.post) { showArticleMissing(); return; }
        var p = normalisePost(d.post);
        renderArticleBody(body, p);
        decorateArticle(p);
      })
      .catch(function () { if (loading) loading.hidden = true; showArticleMissing(); });

    function showArticleMissing() {
      if (notFound) notFound.hidden = false;
      if (head) head.hidden = true;
      if (body) body.hidden = true;
      document.title = S("articleNotFound", "المقال غير موجود") + " | " + document.title;
    }
  }

  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  function renderArticleBody(body, post) {
    var html = "";
    if (post.excerpt) html += '<p class="lead">' + esc(post.excerpt) + "</p>";
    /* مقالات D1: المحتوى جاهز ومنقّى على الخادم */
    if (post.content) {
      html += post.content;
    } else {
      (post.body || []).forEach(function (sec, i) {
        html += "<h2 id='h" + i + "'>" + esc(sec.h) + "</h2>";
        (sec.p || []).forEach(function (par) { html += "<p>" + esc(par) + "</p>"; });
      });
    }
    if (post.quote) {
      html += '<blockquote><p>' + esc(post.quote.text) + "</p><cite>" + esc(post.quote.cite) + "</cite></blockquote>";
    }
    body.innerHTML = html;
  }

  function decorateArticle(post) {
    var head = $("#article-head");
    var body = $("#article-body");
    var siteName = S("siteShortName", "تفكير.نت");

    document.title = post.title + " | " + siteName;
    var desc = $('meta[name="description"]');
    if (desc && post.excerpt) desc.setAttribute("content", post.excerpt);
    var ogT = $('meta[property="og:title"]'); if (ogT) ogT.setAttribute("content", post.title + " | " + siteName);
    var ogD = $('meta[property="og:description"]'); if (ogD && post.excerpt) ogD.setAttribute("content", post.excerpt);
    var crumb = $("#crumb-title"); if (crumb) crumb.textContent = post.title;
    var url = location.href;

    var set = function (id, value, attr) {
      var el = $(id);
      if (!el || !value) return;
      el.textContent = value;
      if (attr) el.setAttribute(attr, attr === "datetime" ? String(post.date || "") : "");
    };
    set("#article-cat", post.category);
    set("#article-title", post.title);
    set("#article-date", post.dateAr, "datetime");
    set("#article-read", post.read || post.readLabel);

    if (head) head.hidden = false;
    if (body) body.hidden = false;

    /* فهرس المحتويات */
    var toc = $("#toc"), tocList = $("#toc-list");
    if (toc && tocList && body) {
      var heads = $$("h2[id], h3[id]", body);
      var secs = post.body || [];
      if (heads.length) {
        tocList.innerHTML = heads.map(function (h) {
          return '<li><a href="#' + h.id + '">' + esc(h.textContent) + "</a></li>";
        }).join("");
        toc.hidden = false;
        if ("IntersectionObserver" in window) {
          var links2 = $$("a", tocList);
          var obs2 = new IntersectionObserver(function (ents) {
            ents.forEach(function (en) {
              if (!en.isIntersecting) return;
              links2.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
            });
          }, { rootMargin: "-20% 0px -70% 0px" });
          heads.forEach(function (h) { obs2.observe(h); });
        }
      } else if (secs.length > 1) {
        tocList.innerHTML = secs.map(function (s, i) {
          return '<li><a href="#h' + i + '">' + esc(s.h) + "</a></li>";
        }).join("");
        toc.hidden = false;
        if ("IntersectionObserver" in window) {
          var links = $$("a", tocList);
          var obs = new IntersectionObserver(function (ents) {
            ents.forEach(function (en) {
              if (!en.isIntersecting) return;
              links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
            });
          }, { rootMargin: "-20% 0px -70% 0px" });
          secs.forEach(function (_, i) { var el = document.getElementById("h" + i); if (el) obs.observe(el); });
        }
      }
    }

    /* المشاركة */
    var share = $("#article-share");
    if (share) {
      share.hidden = false;
      var enc = encodeURIComponent(url);
      var t = encodeURIComponent(post.title);
      var sx = $("#share-x"); if (sx) sx.href = "https://twitter.com/intent/tweet?url=" + enc + "&text=" + t;
      var si = $("#share-in"); if (si) si.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + enc;
      var sw = $("#share-wa"); if (sw) sw.href = "https://wa.me/?text=" + t + "%20" + enc;
      var sc = $("#share-copy");
      if (sc && !sc.dataset.bound) {
        sc.dataset.bound = "1";
        sc.addEventListener("click", function () {
          var btn = this;
          navigator.clipboard && window.isSecureContext
            ? navigator.clipboard.writeText(url).then(function () {
                btn.innerHTML = '<span>' + S("shareCopied", "تم النسخ ✓") + '</span>';
                setTimeout(function () { btn.innerHTML = S("shareCopyAgain", "نُسخ الرابط"); }, 2000);
              })
            : null;
        });
      }
    }

    /* JSON-LD للمقال (تخطّيه إن حقّنه الخادم أصلًا) */
    if (window.TFKIR_SSR_POST) return;
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      inLanguage: "ar",
      author: { "@type": "Person", name: S("personName", "الدكتور ياسر حسن") },
      publisher: { "@type": "Person", name: S("personName", "الدكتور ياسر حسن") },
      mainEntityOfPage: url,
    });
    document.head.appendChild(ld);
  }

  /* ---------------------------------------------------------
     10b) مقالات قاعدة البيانات في صفحة الأفكار
     --------------------------------------------------------- */
  var escCard = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  var MONTHS = {
    ar: ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    tr: ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],
    en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  };

  function langKey() {
    var l = (document.documentElement.getAttribute("lang") || "ar").toLowerCase();
    return l === "en" || l === "tr" ? l : "ar";
  }

  /* الأرقام العربية-الهندية في النسخة العربية فقط */
  var arDigits = function (n, lang) {
    var v = String(n);
    return (lang || "ar") === "ar" ? v.replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }) : v;
  };

  var postDateAr = function (iso) {
    var lang = langKey();
    var s = String(iso || "");
    var d = new Date(s.length <= 10 ? s + "T12:00:00Z" : s.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return "";
    return arDigits(d.getUTCDate(), lang) + " " + MONTHS[lang][d.getUTCMonth()] + " " + arDigits(d.getUTCFullYear(), lang);
  };

  /* يوحّد شكل المقال القادم من D1 مع شكل مقالات البناء الثابت */
  function normalisePost(p) {
    var iso = p.publishedAt || p.updatedAt || "";
    var mins = Math.max(1, Number(p.readMinutes) || 1);
    return {
      slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content,
      category: p.category, tags: p.tags || [], status: p.status,
      date: iso.slice(0, 10),
      dateAr: postDateAr(iso),
      read: arDigits(mins, langKey()) + " " + S("readMinutesUnit", "دقائق قراءة"),
    };
  }

  function ideaCardHtml(p) {
    /* لا data-reveal هنا: المراقب يعمل قبل الإدراج، والبطاقة الجديدة
       كانت ستبقى بشفافية صفرية إلى الأبد */
    return '<a class="post-card is-in" href="' + articleHref(p.slug) + '" data-cat="' +
      escCard(p.category) + '">' +
      '<div class="post-card__meta">' +
        '<span class="post-card__cat">' + escCard(p.category) + "</span>" +
        "<span>" + escCard(postDateAr(p.publishedAt || p.updatedAt)) + "</span>" +
        "<span>" + arDigits(Math.max(1, p.readMinutes || 1), langKey()) + " " + escCard(S("readMinutesUnit", "دقائق قراءة")) + "</span>" +
      "</div>" +
      '<h2 class="post-card__title">' + escCard(p.title) + "</h2>" +
      '<p class="post-card__excerpt">' + escCard(p.excerpt) + "</p>" +
      '<div class="post-card__foot"><span class="post-card__read">' +
        S("readMore", "اقرأ المقال") +
      "</span></div></a>";
  }

  /* روابط JS ليست مُعالَجة ببادئة اللغة وقت البناء — نضيفها هنا */
  var langPrefix = (function () {
    var seg = (location.pathname.split("/")[1] || "").toLowerCase();
    return seg === "tr" || seg === "en" ? "/" + seg : "";
  })();

  function articleHref(slug) {
    return langPrefix + "/article?id=" + encodeURIComponent(slug);
  }

  function fetchPosts(query) {
    if (!window.fetch || !window.AbortController) return Promise.resolve([]);
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 7000);
    return fetch("/api/posts?limit=60" + (query || ""), {
      headers: { Accept: "application/json" },
      signal: ctl.signal,
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && d.ok ? d.posts : []; })
      .catch(function () { return []; })
      .then(function (v) { clearTimeout(timer); return v; });
  }

  function initDynamicIdeas() {
    var grid = $("#idea-grid");
    if (!grid) return;
    /* الخادم已经把 البطاقات في الصفحة — لا داعي لجلبها مرتين */
    if (grid.querySelector(".post-card")) return;

    fetchPosts().then(function (posts) {
      if (!posts.length) return;
      grid.insertAdjacentHTML("beforeend", posts.map(function (p) { return ideaCardHtml(p); }).join(""));

      /* إعادة تطبيق التصفية النشطة (?cat= أو زر مضغوط) على البطاقات الجديدة */
      var bar = $("#idea-filters");
      var on = bar && $('[data-filter][aria-pressed="true"]', bar);
      var val = on ? on.dataset.filter : "*";
      var shown = 0;
      $$("[data-cat]", grid).forEach(function (c) {
        c.hidden = !(val === "*" || c.dataset.cat === val);
        if (!c.hidden) shown++;
      });
      var empty = $("#idea-empty");
      if (empty) empty.hidden = shown > 0;
      var counter = $("[data-posts-count]");
      if (counter) counter.textContent = String(shown);
    });
  }

  /* ---------------------------------------------------------
     10c) شريط المقالات المتحرك في الرئيسية
     --------------------------------------------------------- */
  var RAIL_MIN = 4;

  function initRail() {
    var section = $("[data-rail]");
    if (!section) return;
    var track = $("[data-rail-track]", section);
    if (!track) return;

    /* زر إيقاف/تشغيل الحركة — يُتاح لكل المستخدمين لا لمن يتhover فقط */
    var toggle = $("[data-rail-toggle]", section);
    if (toggle) {
      var lblOn = toggle.dataset.labelResume || S("pauseMotion", "إيقاف الحركة");
      var lblOff = toggle.dataset.labelPause || S("resumeMotion", "تشغيل الحركة");
      var lbl = $("[data-rail-label]", toggle);
      if (REDUCED) toggle.hidden = true;         /* لا حركة أصلًا: الزر بلا معنى */
      toggle.addEventListener("click", function () {
        var paused = section.dataset.paused === "true";
        section.dataset.paused = paused ? "false" : "true";
        toggle.setAttribute("aria-pressed", String(!paused));
        if (lbl) lbl.textContent = paused ? lblOn : lblOff;
      });
    }

    fetchPosts().then(function (posts) {
      if (posts.length < RAIL_MIN) return;
      var items = posts.slice(0, 18).map(function (p) {
        return '<a class="rail__item" href="' + articleHref(p.slug) + '">' +
          '<span class="rail__cat">' + escCard(p.category) + "</span>" +
          '<span class="rail__title">' + escCard(p.title) + "</span>" +
          '<span class="rail__meta">' + escCard(postDateAr(p.publishedAt || p.updatedAt)) +
          " · " + escCard(S("readMinutesUnit", "دقائق قراءة")) + "</span>" +
          "</a>";
      }).join("");
      var half = document.createElement("div");
      half.className = "rail__half";
      half.innerHTML = items;
      var clone = half.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      $$(".rail__item", clone).forEach(function (a) { a.tabIndex = -1; });
      track.appendChild(half);
      track.appendChild(clone);
      section.hidden = false;
      $$("[data-reveal]", section).forEach(function (el) { el.classList.add("is-in"); });
      if (REDUCED) section.dataset.paused = "true";
    });
  }

  /* ---------------------------------------------------------
     11) صورة البورتريه: بديل إذا لم يوجد الملف
     --------------------------------------------------------- */
  function initPortrait() {
    // مسارات بديلة: إن وُضعت الصورة باسمها الأصلي في أي منها، التقطها الموقع تلقائيًا
    var CANDIDATES = [
      "/assets/img/doctor-yasser.jpg",
      "/assets/img/doctor-yasser.jpeg",
      "/assets/img/doctor-yasser.png",
      "/assets/img/doctor-yasser.webp",
      "/assets/img/IMG-20251209-WA0052.jpg",
      "/IMG-20251209-WA0052.jpg",
    ];

    $$("[data-portrait-img]").forEach(function (img) {
      var frame = img.parentElement;
      var fb = frame && frame.querySelector("[data-portrait-fallback]");
      var list = CANDIDATES.slice();
      var preferred = img.getAttribute("src");
      if (preferred) {
        preferred = preferred.charAt(0) === "/" ? preferred : "/" + preferred;
        list = [preferred].concat(list.filter(function (p) { return p !== preferred; }));
      }
      var i = 0;

      function fail() {
        i++;
        if (i < list.length) {
          img.src = list[i];
          return;
        }
        img.style.display = "none";
        if (fb) fb.style.display = "grid";
      }
      function ok() {
        if (fb) fb.style.display = "none";
        img.style.display = "";
      }

      if (img.complete && img.naturalWidth > 0) ok();
      else if (img.complete) fail();
      img.addEventListener("load", ok);
      img.addEventListener("error", fail);
    });
  }

  /* ---------------------------------------------------------
     12) سنة الفوتر
     --------------------------------------------------------- */
  function initYear() {
    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------
     13) التحديث التلقائي: إن نُشرت نسخة جديدة تُعرض فورًا
     --------------------------------------------------------- */
  function initAutoUpdate() {
    var meta = $('meta[name="site-version"]');
    if (!meta || !window.fetch) return;
    var current = meta.getAttribute("content");
    if (!current) return;
    var checking = false;

    function typing() {
      return $$("input, textarea").some(function (el) {
        var t = (el.getAttribute("type") || "text").toLowerCase();
        if (t === "checkbox" || t === "radio" || t === "hidden" || t === "submit" || t === "button") return false;
        return String(el.value || "").trim() !== "";
      });
    }

    function apply(version) {
      try {
        if (sessionStorage.getItem("tfkir-updated") === version) return;
        sessionStorage.setItem("tfkir-updated", version);
      } catch (e) {}
      window.location.reload();
    }

    function check() {
      if (checking || document.visibilityState === "hidden" || typing()) return;
      checking = true;
      fetch("/version.json?ts=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          checking = false;
          if (d && d.v && d.v !== current) apply(d.v);
        })
        .catch(function () { checking = false; });
    }

    setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", function (e) { if (e.persisted) check(); });
    setTimeout(check, 4000);
  }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  function boot() {
    initTheme();
    initHeader();
    initDrawer();
    initReveal();
    initCounters();
    initAccordions();
    initFilters();
    initCopy();
    initPortrait();
    initContactForm();
    initArticle();
    initDynamicIdeas();
    initRail();
    initYear();
    initAutoUpdate();
    document.documentElement.classList.add("js-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();