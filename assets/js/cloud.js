/* tfkir.net — طبقة «الخدمات الحالية»: أزرار عائمة دائرية ونوافذ تفاصيل. سكربت مستقل بلا مكتبات. */
(function () {
  "use strict";

  if (window.TFKIR_NOW) return;

  var opens = Array.prototype.slice.call(document.querySelectorAll("[data-now-open]"));
  var dialogCloses = Array.prototype.slice.call(document.querySelectorAll("[data-now-close]"));
  var dialogs = Array.prototype.slice.call(document.querySelectorAll(".now-dialog"));

  function openDialogFor(el) {
    var id = el && el.getAttribute("data-now-target");
    var dialog = id ? document.getElementById(id) : dialogs[0];
    if (!dialog) return false;
    if (!dialog.open) {
      try { dialog.showModal(); } catch (e) { return false; }
    }
    try {
      document.dispatchEvent(new CustomEvent("tfkir:now-open", { detail: { id: dialog.id } }));
    } catch (e) {}
    return true;
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    try {
      document.dispatchEvent(new CustomEvent("tfkir:now-close", { detail: { id: dialog.id } }));
    } catch (e) {}
  }

  opens.forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      openDialogFor(el);
    });
  });

  dialogCloses.forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      closeDialog(el.closest ? el.closest("dialog") : null);
    });
  });

  dialogs.forEach(function (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeDialog(dialog);
    });
  });

  window.TFKIR_NOW = {
    open: function (index) {
      var dialog = dialogs[index || 0];
      if (!dialog) return false;
      if (!dialog.open) {
        try { dialog.showModal(); } catch (e) { return false; }
      }
      return true;
    },
    close: function (index) { closeDialog(dialogs[index || 0]); },
  };
})();
