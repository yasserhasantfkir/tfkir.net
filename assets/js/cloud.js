/* tfkir.net — طبقة «الآن»: نافذة، فقاعة، وعدّاد. سكربت مستقل بلا مكتبات. */
(function () {
  "use strict";

  if (window.TFKIR_NOW) return;

  var STRINGS = window.TFKIR_STR || {};
  var MINUTE = 60000, HOUR = 3600000;
  var DISMISS_KEY = "tfkir-now-dismissed", DISMISS_AGE = 72 * HOUR;
  var root = document.documentElement;
  var dialog = document.getElementById("now-dialog");
  var cloud = document.getElementById("now-cloud");
  var clocks = Array.prototype.slice.call(document.querySelectorAll(".now-clock[data-now-countdown]"));
  var opens = Array.prototype.slice.call(document.querySelectorAll("[data-now-open]"));
  var closes = Array.prototype.slice.call(document.querySelectorAll("[data-now-close]"));
  var supportsDialog = !!(dialog && typeof dialog.showModal === "function");
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var docLang = (root.lang || "").toLowerCase();
  var isArabic = docLang.indexOf("ar") === 0, isEnglish = docLang.indexOf("en") === 0;
  var bubbleShown = false, bubbleStopped = false, bubbleTimer = 0;
  var clockTimer = 0, expired = false;

  function S(key, fallback) { return STRINGS[key] || fallback; }
  function endOfMonth() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  function clockDeadline(el) {
    var raw = el.getAttribute("data-until");
    var t = raw ? Date.parse(raw) : NaN;
    return isNaN(t) ? endOfMonth().getTime() : t;
  }
  var deadlines = clocks.map(clockDeadline);
  var deadline = deadlines.length ? new Date(Math.min.apply(null, deadlines)) : null;
  function dismissedRecently() {
    try {
      var t = Number(localStorage.getItem(DISMISS_KEY));
      return t > 0 && Date.now() - t < DISMISS_AGE;
    } catch (e) { return false; }
  }

  function hideBubble() {
    if (cloud) cloud.hidden = true;
    bubbleShown = false;
  }
  function showBubble() {
    if (bubbleShown || bubbleStopped || expired || dismissedRecently()) return;
    if (root.getAttribute("data-now-expired") === "true") return;
    if (dialog && dialog.open) return;
    if (!cloud) return;
    bubbleShown = true;
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = 0; }
    cloud.hidden = false;
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || root.scrollTop || 0;
    if (y >= 220) showBubble();
  }
  function openDialog() {
    if (!supportsDialog) return false;
    if (!dialog.open) {
      try { dialog.showModal(); } catch (e) { return false; }
    }
    bubbleStopped = true;
    hideBubble();
    try { document.dispatchEvent(new CustomEvent("tfkir:now-open")); } catch (e) {}
    return true;
  }

  function closeDialog() {
    if (supportsDialog && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
    bubbleStopped = true;
    hideBubble();
    try { document.dispatchEvent(new CustomEvent("tfkir:now-close")); } catch (e) {}
  }

  function dismissBubble() {
    bubbleStopped = true;
    hideBubble();
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  function linkOf(el) {
    if (!el) return null;
    if (el.tagName === "A" && el.getAttribute("href")) return el;
    return el.closest ? el.closest("a[href]") : null;
  }
  function fallbackHref(link) {
    var href = link && link.getAttribute("href");
    return href && href.charAt(0) !== "#" ? href : "/now";
  }

  function unit(key, fallback, count) {
    var word = S(key, fallback);
    return isEnglish && count === 1 && /s$/.test(word) ? word.slice(0, -1) : word;
  }
  function number(n, pad) {
    var s = String(n);
    if (!isArabic) return s;
    if (pad) s = ("0" + s).slice(-2);
    return s.replace(/[0-9]/g, function (digit) {
      return "٠١٢٣٤٥٦٧٨٩".charAt(Number(digit));
    });
  }

  function formatRemaining(ms) {
    if (ms <= 0) return S("nowEnded", "انتهت");
    var minutes = Math.max(1, Math.floor(ms / MINUTE));
    if (minutes < 60) return number(minutes, true) + " " + unit("nowMinutes", "دقيقة", minutes);
    if (minutes < 1440) {
      var h = Math.floor(minutes / 60), m = minutes % 60;
      return number(h, true) + " " + unit("nowHours", "ساعة", h) + " · " +
        number(m, true) + " " + unit("nowMinutes", "دقيقة", m);
    }
    var days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60);
    return number(days, false) + " " + unit("nowDays", "يوم", days) + " · " +
      number(hours, true) + " " + unit("nowHours", "ساعة", hours);
  }
  function updateClocks(forceEnded) {
    var now = Date.now();
    clocks.forEach(function (el, i) {
      var text = forceEnded || deadlines[i] <= now ? S("nowEnded", "انتهت") : formatRemaining(deadlines[i] - now);
      if (el.textContent !== text) el.textContent = text;
    });
  }
  function expire() {
    if (expired) return;
    expired = true;
    root.dataset.nowExpired = "true";
    if (clockTimer) { clearInterval(clockTimer); clockTimer = 0; }
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = 0; }
    hideBubble();
    Array.prototype.forEach.call(document.querySelectorAll(".now-chip, .hero__now"), function (el) {
      el.hidden = true;
    });
    updateClocks(true);
    var event;
    try {
      event = new CustomEvent("tfkir:now-expired", { detail: { deadline: deadline } });
    } catch (e) {
      event = document.createEvent("CustomEvent");
      event.initCustomEvent("tfkir:now-expired", true, false, { deadline: deadline });
    }
    document.dispatchEvent(event);
  }

  function tick() {
    if (expired) return;
    if (deadline && Date.now() >= deadline.getTime()) { expire(); return; }
    updateClocks(false);
  }
  opens.forEach(function (el) {
    el.addEventListener("click", function (event) {
      var link = linkOf(el);
      if (!supportsDialog) {
        if (link) { event.preventDefault(); window.location.href = fallbackHref(link); }
        return;
      }
      if (link) event.preventDefault();
      if (!openDialog() && link) window.location.href = fallbackHref(link);
    });
  });

  closes.forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      if (dialog && dialog.contains(el)) closeDialog();
      else dismissBubble();
    });
  });

  if (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("cancel", closeDialog);
    dialog.addEventListener("close", function () { bubbleStopped = true; hideBubble(); });
  }

  window.TFKIR_NOW = { open: openDialog, close: closeDialog, deadline: deadline };

  if (root.getAttribute("data-now-expired") === "true") {
    expire();
  } else if (clocks.length) {
    tick();
    if (!expired) clockTimer = setInterval(tick, 30000);
  }

  if (!expired) {
    if (reduced) showBubble();
    else if (cloud && !dismissedRecently()) {
      bubbleTimer = setTimeout(showBubble, 2400);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }
})();
