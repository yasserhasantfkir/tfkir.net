/* tfkir.net — طبقة «الخدمة الحالية»: نافذة عائمة وتفاصيل. سكربت مستقل بلا مكتبات. */
(function () {
  "use strict";

  if (window.TFKIR_NOW) return;

  var HOUR = 3600000;
  var DISMISS_KEY = "tfkir-now-dismissed", DISMISS_AGE = 72 * HOUR;
  var root = document.documentElement;
  var dialog = document.getElementById("now-dialog");
  var cloud = document.getElementById("now-cloud");
  var opens = Array.prototype.slice.call(document.querySelectorAll("[data-now-open]"));
  var closes = Array.prototype.slice.call(document.querySelectorAll("[data-now-close]"));
  var supportsDialog = !!(dialog && typeof dialog.showModal === "function");
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var bubbleShown = false, bubbleStopped = false, bubbleTimer = 0;

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
    if (bubbleShown || bubbleStopped || dismissedRecently()) return;
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
    hideBubble();
    try { document.dispatchEvent(new CustomEvent("tfkir:now-open")); } catch (e) {}
    return true;
  }

  function closeDialog() {
    if (supportsDialog && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
    hideBubble();
    try { document.dispatchEvent(new CustomEvent("tfkir:now-close")); } catch (e) {}
    showBubble();
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
    return href && href.charAt(0) !== "#" ? href : "/contact";
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
    dialog.addEventListener("close", function () { hideBubble(); showBubble(); });
  }

  window.TFKIR_NOW = { open: openDialog, close: closeDialog };

  if (reduced) showBubble();
  else if (cloud && !dismissedRecently()) {
    bubbleTimer = setTimeout(showBubble, 2400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
