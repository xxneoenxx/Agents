/* ==========================================================================
   Grundausstattung — Lenis, GSAP, Reveals, Parallax, Navigation
   --------------------------------------------------------------------------
   Zurückhaltend dosiert: Das hier ist eine Seite für hungrige Menschen,
   kein Design-Portfolio. Nichts darf zwischen Gast und Telefonnummer stehen.
   ========================================================================== */

(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__reduce = reduce;

  /* --- Navigation für schmale Fenster ------------------------------------ */
  var schalter = document.querySelector('[data-nav-schalter]');
  var mobilNav = document.querySelector('[data-nav-mobil]');
  if (schalter && mobilNav) {
    schalter.addEventListener('click', function () {
      var offen = mobilNav.getAttribute('data-offen') === 'true';
      mobilNav.setAttribute('data-offen', offen ? 'false' : 'true');
      schalter.setAttribute('aria-expanded', offen ? 'false' : 'true');
    });
    mobilNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        mobilNav.setAttribute('data-offen', 'false');
        schalter.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Saison-Band schließen --------------------------------------------- */
  var saison = document.querySelector('[data-saison]');
  var saisonZu = document.querySelector('[data-saison-zu]');
  if (saison && saisonZu) {
    saisonZu.addEventListener('click', function () { saison.hidden = true; });
  }

  /* --- Animationen -------------------------------------------------------- */
  if (reduce || typeof gsap === 'undefined') {
    /* Ohne Bewegung: Inhalte sofort sichtbar machen, nicht nur die
       Animation abschalten — sonst bliebe die Seite leer. */
    var versteckt = document.querySelectorAll('[data-animate]');
    for (var i = 0; i < versteckt.length; i++) {
      versteckt[i].style.opacity = 1;
      versteckt[i].style.transform = 'none';
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* Muster A — Lenis und GSAP verkabeln */
  if (typeof Lenis !== 'undefined') {
    var lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  /* Muster B — Reveal beim Scrollen */
  gsap.utils.toArray('[data-animate]').forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* Muster C — dezenter Parallax */
  gsap.utils.toArray('[data-parallax]').forEach(function (el) {
    var f = parseFloat(el.dataset.parallax);
    gsap.to(el, {
      yPercent: f * 100, ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') || el,
        start: 'top bottom', end: 'bottom top', scrub: true
      }
    });
  });

  /* Nach dem Laden der Schriften neu vermessen — sonst sitzen die
     Auslöser auf den Positionen vor dem Schriftwechsel. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
