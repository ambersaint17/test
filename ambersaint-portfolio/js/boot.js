/* js/boot.js - runs in <head> before first paint (external so the CSP needs no inline script).
   1. marks the page as JS-enabled (enables the preloader and reveal states)
   2. flags slow devices as "lite" (lower resolution for the halo)
   3. image fallbacks without inline handlers: <img data-rm> removes itself on error, <img data-fb="url"> retries once */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2)) d.classList.add('lite');
  document.addEventListener('error', function (e) {
    var t = e.target; if (!t || t.tagName !== 'IMG') return;
    if (t.hasAttribute('data-rm')) { t.remove(); return; }
    var f = t.getAttribute('data-fb'); if (f) { t.removeAttribute('data-fb'); t.src = f; }
  }, true);
})();
