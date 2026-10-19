/* ============================================================
   assets/js/admin.js — لوحة تحرير المقالات
   ------------------------------------------------------------
   بدون أي مكتبات خارجية.
   • تسجيل دخول + تغيير إجباري لبيانات الدخول
   • قائمة المسودات والمنشورات مع بحث وتصفية
   • محرّر نصوص غني + معاينة + حذف + نشر/إرجاع لمسودة
   • حفظ تلقائي: محليًا فورًا، وعلى الخادم كل ٣٠٠ حرف أو ٢٠ ثانية
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var AUTOSAVE_CHARS = 300;
  var AUTOSAVE_MS = 20000;
  var LS_PREFIX = "tfkir-draft:";

  var state = {
    user: null,
    posts: [],
    categories: [],
    tab: "drafts",
    cat: "*",
    q: "",
    current: null,
    dirty: false,
    pushing: false,
    lastPush: 0,
    lastPushChars: 0,
    saving: false,
  };

  /* ---------------------------------------------------------
     0) أدوات صغيرة
     --------------------------------------------------------- */
  var AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  var AR_D = "٠١٢٣٤٥٦٧٨٩";

  function ar(n) { return String(n == null ? "" : n).replace(/\d/g, function (d) { return AR_D[d]; }); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function parseDate(v) {
    var s = String(v || "");
    if (!s) return null;
    var d = new Date(s.length <= 10 ? s + "T12:00:00Z" : s.replace(" ", "T") + "Z");
    return isNaN(d.getTime()) ? null : d;
  }

  function dateLabel(v) {
    var d = parseDate(v);
    if (!d) return "—";
    return ar(d.getUTCDate()) + " " + AR_MONTHS[d.getUTCMonth()] + " " + ar(d.getUTCFullYear());
  }

  function agoLabel(v) {
    var d = parseDate(v);
    if (!d) return "";
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 0) diff = 0;
    if (diff < 60) return "الآن";
    if (diff < 3600) return "منذ " + ar(Math.floor(diff / 60)) + " دقيقة";
    if (diff < 86400) return "منذ " + ar(Math.floor(diff / 3600)) + " ساعة";
    if (diff < 86400 * 30) return "منذ " + ar(Math.floor(diff / 86400)) + " يوم";
    return dateLabel(v);
  }

  var toastTimer;
  function toast(msg, tone) {
    var box = $("#toast");
    var txt = $("#toast-text");
    if (!box || !txt) return;
    txt.textContent = msg;
    box.dataset.tone = tone || "ok";
    box.dataset.show = "true";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.dataset.show = "false"; }, 2600);
  }

  /* ---------------------------------------------------------
     1) الاتصال بالخادم
     --------------------------------------------------------- */
  function api(path, opts) {
    opts = opts || {};
    var init = {
      method: opts.method || "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (opts.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.status === 401 && path.indexOf("/api/auth/session") === -1) {
          state.user = null;
          showView("login");
        }
        if (!res.ok || !data || data.ok === false) {
          var e = new Error((data && data.error) || "network_error");
          e.code = data && data.error;
          e.fields = (data && data.fields) || [];
          e.status = res.status;
          throw e;
        }
        return data;
      });
    });
  }

  var ERROR_TEXT = {
    invalid_credentials: "اسم المستخدم أو كلمة المرور غير صحيحة.",
    locked: "تم إيقاف المحاولات مؤقتًا بعد تكرار الخطأ. انتظر ١٥ دقيقة ثم أعد المحاولة.",
    unauthorized: "انتهت الجلسة. سجّل الدخول من جديد.",
    not_found: "العنصر غير موجود (ربما حُذف).",
    validation: "راجع الحقول المعلَّمة ثم أعد المحاولة.",
    bad_origin: "طلب غير مصرّح به (أصل مختلف).",
    network_error: "تعذّر الاتصال بالخادم. تحقّق من الإنترنت ثم أعد المحاولة.",
  };

  function errText(e) {
    if (e && ERROR_TEXT[e.code]) return ERROR_TEXT[e.code];
    if (e && e.code === "validation") return "راجع الحقول المعلَّمة ثم أعد المحاولة.";
    return "حدث خطأ غير متوقع. أعد المحاولة.";
  }

  function showFieldErrors(form, fields) {
    $$("[data-field]", form).forEach(function (w) { w.dataset.invalid = "false"; });
    (fields || []).forEach(function (f) {
      var w = form.querySelector('[data-field="' + f + '"]');
      if (w) w.dataset.invalid = "true";
    });
  }

  function setAlert(el, msg) {
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.textContent = msg;
    el.hidden = false;
  }

  /* ---------------------------------------------------------
     2) التنقل بين الشاشات
     --------------------------------------------------------- */
  var VIEWS = ["login", "force", "app", "editor"];

  function showView(name) {
    VIEWS.forEach(function (v) {
      var el = $("#view-" + v);
      if (el) el.hidden = v !== name;
    });
    var top = $("#adm-top");
    if (top) top.hidden = name === "login" || name === "force";
    var body = document.body;
    body.classList.toggle("adm-editing", name === "editor");
    window.scrollTo({ top: 0, behavior: "auto" });
    if (name === "login") setTimeout(function () { var i = $("#lg-user"); if (i) i.focus(); }, 60);
    if (name === "force") setTimeout(function () { var i = $("#fc-old"); if (i) i.focus(); }, 60);
  }

  /* ---------------------------------------------------------
     3) السمة
     --------------------------------------------------------- */
  function initTheme() {
    var btn = $("#adm-theme");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("tfkir-theme", next); } catch (e) {}
    });
  }

  /* ---------------------------------------------------------
     4) تسجيل الدخول
     --------------------------------------------------------- */
  function initLogin() {
    var form = $("#login-form");
    if (!form) return;
    var submit = $("#login-submit");
    var err = $("#login-error");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setAlert(err, "");
      showFieldErrors(form, []);
      var u = $("#lg-user").value.trim();
      var p = $("#lg-pass").value;
      if (!u || !p) { showFieldErrors(form, [!u ? "username" : "password"]); return; }

      submit.disabled = true;
      submit.textContent = "جارٍ التحقق…";
      api("/api/auth/login", { method: "POST", body: { username: u, password: p } })
        .then(function (d) {
          $("#lg-pass").value = "";
          state.user = d.user;
          setUser(d.user);
          if (d.user.mustChange) {
            showView("force");
            toast("يلزم تغيير بيانات الدخول أولًا");
          } else {
            enterApp();
          }
        })
        .catch(function (e2) {
          setAlert(err, errText(e2));
          if (e2.code === "invalid_credentials") showFieldErrors(form, ["password"]);
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = "دخول";
        });
    });
  }

  function setUser(u) {
    state.user = u;
    var chip = $("#adm-user");
    if (chip) {
      chip.textContent = u ? u.username : "";
      chip.hidden = !u;
    }
    var cu = $("#cc-user");
    if (cu && u) cu.value = u.username;
  }

  /* ---------------------------------------------------------
     5) تغيير بيانات الدخول (إجباري أو اختياري)
     --------------------------------------------------------- */
  function submitCredentials(form, opts) {
    opts = opts || {};
    var err = $("#" + (opts.errId || "cred-error"));
    var btn = $("#" + (opts.btnId || "cred-submit"));
    showFieldErrors(form, []);
    setAlert(err, "");

    var payload = {
      currentPassword: $("#" + opts.old).value,
      newUsername: $("#" + opts.user).value.trim(),
      newPassword: $("#" + opts.pass).value,
      confirmPassword: $("#" + opts.pass2).value,
    };
    if (opts.allowSamePassword) {
      payload.newUsername = payload.newUsername || state.user.username;
      if (!payload.newPassword) {
        payload.newPassword = payload.currentPassword;
        payload.confirmPassword = payload.currentPassword;
      }
    }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "جارٍ الحفظ…";

    api("/api/auth/credentials", { method: "POST", body: payload })
      .then(function (d) {
        setUser(d.user);
        ["#" + opts.old, "#" + opts.pass, "#" + opts.pass2].forEach(function (s) { $(s).value = ""; });
        toast("تم تحديث بيانات الدخول");
        if (opts.onDone) opts.onDone(d);
      })
      .catch(function (e) {
        showFieldErrors(form, e.fields);
        setAlert(err, errText(e));
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
  }

  function initCredentials() {
    var force = $("#force-form");
    if (force) {
      force.addEventListener("submit", function (e) {
        e.preventDefault();
        submitCredentials(force, {
          errId: "force-error", btnId: "force-submit",
          old: "fc-old", user: "fc-user", pass: "fc-pass", pass2: "fc-pass2",
          onDone: function () { enterApp(); },
        });
      });
    }

    var cred = $("#cred-form");
    if (cred) {
      cred.addEventListener("submit", function (e) {
        e.preventDefault();
        submitCredentials(cred, {
          errId: "cred-error", btnId: "cred-submit",
          old: "cc-old", user: "cc-user", pass: "cc-pass", pass2: "cc-pass2",
          allowSamePassword: true,
          onDone: function () { closeModal("#modal"); },
        });
      });
    }
  }

  /* ---------------------------------------------------------
     6) النوافذ والتأكيد
     --------------------------------------------------------- */
  function openModal(sel) {
    var m = $(sel);
    if (!m) return;
    m.hidden = false;
    var first = $("input,button", m);
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeModal(sel) { var m = $(sel); if (m) m.hidden = true; }

  function askConfirm(text, title, yesLabel) {
    return new Promise(function (resolve) {
      var box = $("#confirm");
      if (!box) return resolve(false);
      $("#confirm-text").textContent = text;
      $("#confirm-title").textContent = title || "تأكيد";
      $("#confirm-yes").textContent = yesLabel || "تأكيد";
      box.hidden = false;
      $("#confirm-yes").focus();

      function done(v) {
        box.hidden = true;
        box.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
        resolve(v);
      }
      function onClick(e) {
        var t = e.target.closest("[data-close-confirm]");
        if (t) return done(false);
        if (e.target.closest("#confirm-yes")) return done(true);
      }
      function onKey(e) {
        if (e.key === "Escape") done(false);
      }
      box.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
    });
  }

  /* ---------------------------------------------------------
     7) قائمة المقالات
     --------------------------------------------------------- */
  function enterApp() {
    showView("app");
    loadPosts();
  }

  function loadPosts() {
    return api("/api/posts?scope=all&limit=300").then(function (d) {
      state.posts = d.posts || [];
      state.categories = d.categories || [];
      if (d.counts) {
        $("#c-drafts").textContent = ar(d.counts.drafts || 0);
        $("#c-published").textContent = ar(d.counts.published || 0);
        $("#c-total").textContent = ar(d.counts.total || 0);
      }
      renderList();
    }).catch(function (e) {
      toast(errText(e), "err");
    });
  }

  function filtered() {
    var q = state.q.trim();
    return state.posts.filter(function (p) {
      if (state.tab === "drafts" && p.status !== "draft") return false;
      if (state.tab === "published" && p.status !== "published") return false;
      if (state.cat !== "*" && p.category !== state.cat) return false;
      if (q && (p.title + " " + (p.excerpt || "") + " " + (p.content || "")).indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
  }

  function renderList() {
    var list = $("#adm-list");
    var empty = $("#adm-empty");
    var items = filtered();

    $$("[data-tab]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.tab === state.tab);
    });

    if (!items.length) {
      list.innerHTML = "";
      empty.hidden = false;
      if (state.q || state.cat !== "*") {
        empty.textContent = "لا توجد مقالات مطابقة للبحث أو التصفية الحالية.";
      } else if (state.tab === "drafts") {
        empty.innerHTML = "لا توجد مسودات. اضغط <b>مقال جديد</b> وابدأ الكتابة — يُحفظ عملك تلقائيًا.";
      } else if (state.tab === "published") {
        empty.innerHTML = "لا توجد مقالات منشورة بعد.";
      } else {
        empty.innerHTML = "لا توجد مقالات بعد.";
      }
      return;
    }

    empty.hidden = true;
    list.innerHTML = items.map(function (p) {
      var pub = p.status === "published";
      return '<div class="adm-row" data-id="' + esc(p.id) + '">' +
        '<div class="adm-row__main" data-edit="' + esc(p.id) + '">' +
          '<div class="adm-row__title">' + esc(p.title || "بلا عنوان") + "</div>" +
          '<div class="adm-row__meta">' +
            '<span class="badge ' + (pub ? "badge--pub" : "badge--draft") + '">' + (pub ? "منشور" : "مسودة") + "</span>" +
            '<span class="badge badge--cat">' + esc(p.category || "—") + "</span>" +
            "<span>" + esc(dateLabel(p.publishedAt || p.updatedAt)) + "</span>" +
            "<span>" + esc(agoLabel(p.updatedAt)) + "</span>" +
            "<span>" + ar(p.readMinutes || 1) + " دقيقة</span>" +
          "</div>" +
        "</div>" +
        '<div class="adm-row__actions">' +
          '<button class="btn btn--ghost btn--sm" data-edit="' + esc(p.id) + '">تحرير</button>' +
          '<button class="btn btn--quiet btn--sm" data-toggle="' + esc(p.id) + '">' + (pub ? "إلى مسودة" : "نشر") + "</button>" +
          (pub ? '<a class="btn btn--quiet btn--sm" href="/article?id=' + encodeURIComponent(p.slug) + '" target="_blank" rel="noopener">عرض</a>' : "") +
          '<button class="icon-btn icon-btn--danger" data-del="' + esc(p.id) + '" aria-label="حذف" title="حذف">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7"/><path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5"/></svg>' +
          "</button>" +
        "</div>" +
      "</div>";
    }).join("");
  }

  function initList() {
    $$("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { state.tab = b.dataset.tab; renderList(); });
    });

    var search = $("#adm-search");
    if (search) {
      var t;
      search.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () { state.q = search.value; renderList(); }, 200);
      });
    }

    var cat = $("#adm-cat");
    if (cat) cat.addEventListener("change", function () { state.cat = cat.value; renderList(); });

    var refresh = $("#adm-refresh");
    if (refresh) refresh.addEventListener("click", function () { loadPosts(); toast("تم التحديث"); });

    var list = $("#adm-list");
    if (list) {
      list.addEventListener("click", function (e) {
        var edit = e.target.closest("[data-edit]");
        if (edit) return openPost(edit.dataset.edit);
        var toggle = e.target.closest("[data-toggle]");
        if (toggle) return toggleStatus(toggle.dataset.toggle);
        var del = e.target.closest("[data-del]");
        if (del) return deletePost(del.dataset.del);
      });
    }

    var newBtn = $("#adm-new");
    if (newBtn) newBtn.addEventListener("click", function () { openPost(null); });
  }

  function toggleStatus(id) {
    var p = state.posts.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var next = p.status === "published" ? "draft" : "published";
    api("/api/posts/" + id, { method: "PATCH", body: { status: next } })
      .then(function () { toast(next === "published" ? "نُشر المقال" : "أُعيد إلى المسودات"); return loadPosts(); })
      .catch(function (e) { toast(errText(e), "err"); });
  }

  function deletePost(id) {
    var p = state.posts.filter(function (x) { return x.id === id; })[0];
    askConfirm(
      "سيُحذف «" + (p ? p.title : "هذا المقال") + "» نهائيًا ولا يمكن التراجع.",
      "حذف المقال",
      "حذف نهائي"
    ).then(function (yes) {
      if (!yes) return;
      api("/api/posts/" + id, { method: "DELETE" })
        .then(function () {
          try { localStorage.removeItem(LS_PREFIX + id); } catch (e) {}
          toast("حُذف المقال");
          return loadPosts();
        })
        .catch(function (e) { toast(errText(e), "err"); });
    });
  }

  /* ---------------------------------------------------------
     8) المحرّر
     --------------------------------------------------------- */
  var editor = null;

  function localKey(id) { return LS_PREFIX + (id || "new"); }

  function saveLocal() {
    if (!state.current) return;
    try {
      localStorage.setItem(localKey(state.current.id), JSON.stringify({
        id: state.current.id,
        title: $("#ed-title").value,
        excerpt: $("#ed-excerpt").value,
        category: $("#ed-category").value,
        tags: $("#ed-tags").value,
        slug: $("#ed-slug").value,
        html: editor.innerHTML,
        at: Date.now(),
      }));
    } catch (e) { /* التخزين ممتلئ — نتجاهله */ }
  }

  function readLocal(id) {
    try {
      var raw = localStorage.getItem(localKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function payload(status) {
    return {
      title: $("#ed-title").value,
      excerpt: $("#ed-excerpt").value,
      content: editor.innerHTML,
      category: $("#ed-category").value,
      tags: $("#ed-tags").value,
      slug: $("#ed-slug").value,
      status: status,
    };
  }

  function setStatus(kind, text) {
    var el = $("#ed-status");
    if (!el) return;
    el.dataset.state = kind;
    el.textContent = text;
  }

  function updateCounts() {
    var text = (editor.innerText || "").replace(/\s+/g, " ").trim();
    var words = text ? text.split(" ").filter(Boolean).length : 0;
    var chars = editor.innerHTML.length;
    var minutes = Math.max(1, Math.round(words / 190));
    $("#ed-counts").textContent = ar(words) + " كلمة · " + ar(minutes) + " دقيقة · " + ar(chars) + " حرف";
    editor.dataset.empty = editor.innerHTML === "" || editor.innerHTML === "<br>" ? "true" : "false";
  }

  function openPost(id) {
    var p = id ? state.posts.filter(function (x) { return x.id === id; })[0] : null;
    state.current = {
      id: p ? p.id : null,
      slug: p ? p.slug : "",
      status: p ? p.status : "draft",
    };
    state.dirty = false;
    state.lastPush = 0;
    state.lastPushChars = 0;

    $("#ed-title").value = p ? p.title : "";
    $("#ed-excerpt").value = p ? p.excerpt : "";
    $("#ed-category").value = p ? p.category : "تأملات";
    $("#ed-tags").value = p ? (p.tags || []).join("، ") : "";
    $("#ed-slug").value = p ? p.slug : "";
    editor.innerHTML = p && p.content ? p.content : "<p><br></p>";

    var pub = p && p.status === "published";
    setStatus(pub ? "published" : "idle", pub ? "منشور" : p ? "مسودة" : "مسودة جديدة");
    $("#ed-publish").innerHTML = pub
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg><span>إرجاع لمسودة</span>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 3.5 10.8 13.2"/><path d="M20.5 3.5 14 20.5l-3.2-7.3L3.5 10l17-6.5Z"/></svg><span>نشر</span>';

    updateCounts();
    showView("editor");
    setTimeout(function () { $("#ed-title").focus(); }, 80);

    /* نسخة محلية أحدث من الخادم؟ */
    var local = readLocal(state.current.id);
    if (local && local.at && (!p || local.at > new Date(String(p.updatedAt).replace(" ", "T") + "Z").getTime())) {
      toast("وُجدت نسخة محفوظة محليًا أحدث — استُعيدت. احفظها لتثبيتها.");
    }
  }

  function closeEditor() {
    if (state.dirty) {
      askConfirm("فيه تغييرات لم تُحفظ بعد على الخادم. تريد المتابعة على أي حال؟", "مغادرة المحرّر", "متابعة").then(function (yes) {
        if (yes) { state.dirty = false; saveLocal(); showView("app"); loadPosts(); }
      });
      return;
    }
    showView("app");
    loadPosts();
  }

  /** يرفع المحتوى الحالي إلى الخادم كمسودة */
  function push(force) {
    if (!state.current || state.pushing) return Promise.resolve(null);
    var html = editor.innerHTML;
    var plain = (editor.innerText || "").replace(/\s+/g, " ").trim();
    var title = $("#ed-title").value;
    if (!title && !plain) return Promise.resolve(null);

    var now = Date.now();
    var chars = html.length;
    if (!force && !state.dirty) return Promise.resolve(null);
    if (!force && chars - state.lastPushChars < AUTOSAVE_CHARS && now - state.lastPush < AUTOSAVE_MS) {
      return Promise.resolve(null);
    }

    state.pushing = true;
    setStatus("saving", "جارٍ الحفظ…");
    saveLocal();

    return api("/api/posts/autosave", {
      method: "POST",
      body: {
        id: state.current.id,
        title: title,
        excerpt: $("#ed-excerpt").value,
        content: html,
        category: $("#ed-category").value,
        tags: $("#ed-tags").value,
      },
    })
      .then(function (d) {
        if (d.skipped) return null;
        state.current.id = d.post.id;
        state.current.slug = d.post.slug;
        state.lastPush = Date.now();
        state.lastPushChars = chars;
        state.dirty = false;
        state.pushing = false;
        var time = new Date(d.savedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
        setStatus(d.post.status === "published" ? "published" : "saved", "حُفظ " + time);
        return d.post;
      })
      .catch(function (e) {
        state.pushing = false;
        setStatus("error", "تعذّر الحفظ على الخادم");
        toast(errText(e) + " (محفوظ محليًا)", "err");
        return null;
      });
  }

  var pushTimer;
  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { push(false); }, 1200);
  }

  function saveAs(status) {
    if (state.saving) return Promise.resolve();
    state.saving = true;
    var title = $("#ed-title").value.trim();
    if (!title) {
      toast("اكتب عنوان المقال أولًا.", "err");
      $("#ed-title").focus();
      state.saving = false;
      return Promise.resolve();
    }
    setStatus("saving", status === "published" ? "جارٍ النشر…" : "جارٍ الحفظ…");
    var body = payload(status);

    var go = state.current.id
      ? api("/api/posts/" + state.current.id, { method: "PUT", body: body })
      : push(true).then(function (created) {
          if (!created) return null;
          return api("/api/posts/" + created.id, { method: "PUT", body: body });
        });

    go.then(function (d) {
      state.dirty = false;
      state.lastPush = Date.now();
      state.lastPushChars = editor.innerHTML.length;
      if (d && d.post) {
        state.current.id = d.post.id;
        state.current.slug = d.post.slug;
        $("#ed-slug").value = d.post.slug;
        setStatus(d.post.status === "published" ? "published" : "saved",
          d.post.status === "published" ? "منشور" : "حُفظ كمسودة");
        toast(d.post.status === "published" ? "نُشر المقال" : "حُفظت المسودة");
        try { localStorage.removeItem(localKey(d.post.id)); } catch (e) {}
        localStorage.removeItem(LS_PREFIX + "new");
      }
      return loadPosts();
    })
      .catch(function (e) { toast(errText(e), "err"); })
      .then(function () { state.saving = false; });
    return go;
  }

  /* ---------------------------------------------------------
     9) شريط الأدوات
     --------------------------------------------------------- */
  var savedRange = null;

  function saveSelection() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var node = sel.getRangeAt(0).commonAncestorContainer;
    if (editor.contains(node)) savedRange = sel.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    if (!savedRange) return;
    var sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function exec(cmd, val) {
    editor.focus();
    restoreSelection();
    try {
      if (val === undefined) document.execCommand(cmd);
      else document.execCommand(cmd, false, val);
    } catch (e) {}
    afterCommand();
  }

  /** لفّ التحديد داخل span بخصائص CSS محدّدة */
  function wrapSelection(css) {
    editor.focus();
    restoreSelection();
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) {
      toast("حدّد النص أولًا ثم طبّق التنسيق.");
      return;
    }
    var range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    var span = document.createElement("span");
    span.setAttribute("style", css);
    try {
      range.surroundContents(span);
    } catch (e) {
      try {
        var frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      } catch (e2) {
        toast("حدّد نصًا داخل فقرة واحدة.", "err");
        return;
      }
    }
    var r = document.createRange();
    r.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(r);
    savedRange = r.cloneRange();
    afterCommand();
  }

  function blockOf(node) {
    var n = node;
    while (n && n !== editor) {
      if (n.nodeType === 1 && /^(P|DIV|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|TD|TH)$/.test(n.tagName)) return n;
      n = n.parentNode;
    }
    return null;
  }

  function applyAlign(value) {
    editor.focus();
    restoreSelection();
    var sel = window.getSelection();
    var blocks = [];
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      var range = sel.getRangeAt(0);
      var start = blockOf(range.startContainer);
      var end = blockOf(range.endContainer);
      if (start && end) {
        var all = $$("p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th", editor);
        var a = all.indexOf(start);
        var b = all.indexOf(end);
        for (var i = Math.max(0, a); i <= b && i < all.length; i++) blocks.push(all[i]);
      }
    }
    if (!blocks.length) {
      var b1 = blockOf(editor);
      if (b1) blocks = [b1];
    }
    blocks.forEach(function (b) {
      if (value) b.style.textAlign = value;
      else b.style.removeProperty("text-align");
    });
    afterCommand();
  }

  /** تنظيف وسوم التنسيق الفارغة */
  function tidy() {
    $$("span[style=''], span[style='  ']", editor).forEach(function (s) {
      var p = s.parentNode;
      while (s.firstChild) p.insertBefore(s.firstChild, s);
      p.removeChild(s);
    });
    $$("font", editor).forEach(function (f) {
      var span = document.createElement("span");
      var style = [];
      if (f.getAttribute("face")) style.push("font-family: " + f.getAttribute("face"));
      if (f.getAttribute("color")) style.push("color: " + f.getAttribute("color"));
      if (style.length) span.setAttribute("style", style.join("; "));
      while (f.firstChild) span.appendChild(f.firstChild);
      f.parentNode.replaceChild(span, f);
    });
    $$("p,li,h2,h3,h4,blockquote", editor).forEach(function (p) {
      if (!p.textContent.trim() && !p.querySelector("img,hr,br")) {
        if ($$("p,li,h2,h3,h4,blockquote", editor).length > 1) p.remove();
      }
    });
  }

  function afterCommand() {
    tidy();
    markDirty();
    updateCounts();
  }

  function markDirty() {
    state.dirty = true;
    if ($("#ed-status").dataset.state !== "error") setStatus("idle", "تغييرات غير محفوظة");
    saveLocal();
    schedulePush();
  }

  function initToolbar() {
    var bar = $("#ed-toolbar");
    if (!bar) return;
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}

    bar.addEventListener("mousedown", function (e) {
      if (e.target.closest("button")) e.preventDefault();
    });

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cmd]");
      if (!btn) return;
      var cmd = btn.dataset.cmd;
      if (cmd === "createLink") return doLink();
      if (cmd === "insertImage") return doImage();
      if (cmd === "removeFormat") {
        exec("selectAll");
        editor.focus();
        restoreSelection();
        try { document.execCommand("removeFormat", false, "all"); } catch (e) {}
        afterCommand();
        return;
      }
      if (cmd === "bold" || cmd === "italic" || cmd === "underline" || cmd === "strikeThrough") {
        exec(cmd);
        return;
      }
      if (cmd === "insertUnorderedList" || cmd === "insertOrderedList" ||
          cmd === "indent" || cmd === "outdent" ||
          cmd === "insertHorizontalRule" || cmd === "undo" || cmd === "redo") {
        exec(cmd);
        return;
      }
    });

    var block = $("#tb-block");
    block.addEventListener("change", function () {
      var v = block.value;
      exec("formatBlock", "<" + v + ">");
      block.value = "";
    });

    var size = $("#tb-size");
    size.addEventListener("change", function () {
      if (size.value) wrapSelection("font-size: " + size.value);
      size.value = "";
    });

    var font = $("#tb-font");
    font.addEventListener("change", function () {
      if (font.value) wrapSelection("font-family: " + font.value);
      font.value = "";
    });

    var align = $("#tb-align");
    align.addEventListener("change", function () {
      applyAlign(align.value);
      align.value = "";
    });

    var fore = $("#tb-fore");
    fore.addEventListener("input", function () {
      try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
      exec("foreColor", fore.value);
    });

    var back = $("#tb-back");
    back.addEventListener("input", function () {
      try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
      exec("hiliteColor", back.value);
    });

    document.addEventListener("selectionchange", function () {
      saveSelection();
    });
  }

  function doLink() {
    var sel = window.getSelection();
    var text = sel && sel.toString();
    var url = window.prompt("أدخل الرابط:", "https://");
    if (!url) return;
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) url = "https://" + url;
    if (!text) {
      var span = document.createElement("span");
      span.setAttribute("style", "color: var(--teal-300)");
      span.textContent = url;
      try {
        var r = document.createRange();
        r.setStart(editor, editor.childNodes.length);
        r.collapse(false);
        r.insertNode(span);
      } catch (e) {}
      toast("حدّد النص أولًا ثم أضف الرابط.", "err");
      return;
    }
    exec("createLink", url);
  }

  function doImage() {
    var url = window.prompt("رابط الصورة (https://… أو /assets/img/…):", "https://");
    if (!url) return;
    if (!/^(https?:\/\/|\/|data:image\/)/i.test(url)) { toast("رابط الصورة غير صالح.", "err"); return; }
    exec("insertImage", url);
  }

  /* ---------------------------------------------------------
     10) المعاينة
     --------------------------------------------------------- */
  function sanitizeForPreview(html) {
    var doc = new DOMParser().parseFromString("<div>" + html + "</div>", "text/html");
    var root = doc.body.firstChild;
    (function walk(node) {
      var kids = Array.prototype.slice.call(node.children || []);
      kids.forEach(function (el) {
        var tag = el.tagName.toLowerCase();
        if (["script", "style", "iframe", "object", "embed", "link", "meta"].indexOf(tag) > -1) {
          el.remove();
          return;
        }
        Array.prototype.slice.call(el.attributes).forEach(function (a) {
          var n = a.name.toLowerCase();
          if (n.indexOf("on") === 0 || n === "srcdoc") el.removeAttribute(a.name);
          if ((n === "href" || n === "src") && /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
        });
        walk(el);
      });
    })(root);
    return root.innerHTML;
  }

  function openPreview() {
    $("#pv-title").textContent = $("#ed-title").value || "بلا عنوان";
    $("#pv-cat").textContent = $("#ed-category").value;
    var text = (editor.innerText || "").replace(/\s+/g, " ").trim();
    var words = text ? text.split(" ").filter(Boolean).length : 0;
    $("#pv-read").textContent = ar(Math.max(1, Math.round(words / 190))) + " دقائق قراءة";
    var html = sanitizeForPreview(editor.innerHTML);
    $("#pv-body").innerHTML = html || '<p style="color:var(--faint)">لا يوجد نص بعد.</p>';
    openModal("#preview");
  }

  /* ---------------------------------------------------------
     11) ربط المحرّر
     --------------------------------------------------------- */
  function initEditor() {
    editor = $("#ed-content");
    if (!editor) return;

    $("#ed-back").addEventListener("click", closeEditor);
    $("#ed-draft").addEventListener("click", function () { saveAs("draft"); });
    $("#ed-publish").addEventListener("click", function () {
      var pub = state.current && state.current.status === "published";
      if (pub) { saveAs("draft"); return; }
      saveAs("published");
    });
    $("#ed-preview").addEventListener("click", openPreview);
    $("#ed-delete").addEventListener("click", function () {
      if (!state.current.id) { closeEditor(); return; }
      askConfirm("سيُحذف هذا المقال نهائيًا. متابعة؟", "حذف المقال", "حذف").then(function (yes) {
        if (!yes) return;
        api("/api/posts/" + state.current.id, { method: "DELETE" }).then(function () {
          state.dirty = false;
          try { localStorage.removeItem(LS_PREFIX + state.current.id); } catch (e) {}
          toast("حُذف المقال");
          showView("app");
          loadPosts();
        }).catch(function (e) { toast(errText(e), "err"); });
      });
    });

    ["#ed-title", "#ed-excerpt", "#ed-tags", "#ed-slug"].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.addEventListener("input", function () { markDirty(); });
      el.addEventListener("change", function () { markDirty(); });
    });

    var cat = $("#ed-category");
    if (cat) cat.addEventListener("change", function () { markDirty(); });

    editor.addEventListener("input", function () {
      state.dirty = true;
      updateCounts();
      saveLocal();
      schedulePush();
    });
    editor.addEventListener("blur", function () { if (state.dirty) push(false); });
    editor.addEventListener("paste", function (e) {
      var items = (e.clipboardData || {}).items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("text/html") === 0) {
          e.preventDefault();
          var html = items[i].getAsFile
            ? ""
            : (e.clipboardData.getData("text/html") || "");
          if (!html) return;
          document.execCommand("insertHTML", false, sanitizeForPreview(html));
          afterCommand();
          return;
        }
      }
    });

    /* اختصارات */
    document.addEventListener("keydown", function (e) {
      if (state.current && $("#view-editor").hidden === false) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          saveAs(state.current.status === "published" ? "draft" : "draft");
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          saveAs("published");
        }
      }
    });

    /* حفظ أخير قبل إغلاق الصفحة */
    window.addEventListener("beforeunload", function (e) {
      if (!state.dirty || !state.current) return;
      if (state.current.id || $("#ed-title").value.trim() || (editor.innerText || "").trim()) {
        try {
          navigator.sendBeacon("/api/posts/autosave", new Blob(
            [JSON.stringify({
              id: state.current.id,
              title: $("#ed-title").value,
              excerpt: $("#ed-excerpt").value,
              content: editor.innerHTML,
              category: $("#ed-category").value,
              tags: $("#ed-tags").value,
            })], { type: "application/json" }
          ));
        } catch (err) {}
        state.dirty = false;
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && state.dirty) push(true);
    });

    window.addEventListener("online", function () {
      if (state.dirty) push(true);
    });
  }

  /* ---------------------------------------------------------
     12) النوافذ العامة والخروج
     --------------------------------------------------------- */
  function initChrome() {
    var logout = $("#adm-logout");
    if (logout) logout.addEventListener("click", function () {
      api("/api/auth/logout", { method: "POST" }).then(function () {
        state.user = null;
        state.posts = [];
        setUser(null);
        showView("login");
        toast("تم تسجيل الخروج");
      }).catch(function () { showView("login"); });
    });

    var settings = $("#adm-settings");
    if (settings) settings.addEventListener("click", function () {
      if (state.user) $("#cc-user").value = state.user.username;
      openModal("#modal");
    });

    $$("[data-close-modal]").forEach(function (el) {
      el.addEventListener("click", function () { closeModal("#modal"); });
    });
    $$("[data-close-preview]").forEach(function (el) {
      el.addEventListener("click", function () { closeModal("#preview"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!$("#preview").hidden) return closeModal("#preview");
      if (!$("#modal").hidden) return closeModal("#modal");
    });
  }

  /* ---------------------------------------------------------
     13) الإقلاع
     --------------------------------------------------------- */
  function boot() {
    initTheme();
    initLogin();
    initCredentials();
    initList();
    initEditor();
    initToolbar();
    initChrome();

    api("/api/auth/session")
      .then(function (d) {
        if (d.authenticated && d.user) {
          setUser(d.user);
          if (d.user.mustChange) showView("force");
          else enterApp();
        } else {
          showView("login");
        }
      })
      .catch(function () { showView("login"); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();