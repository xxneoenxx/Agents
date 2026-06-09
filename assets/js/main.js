/* =====================================================================
 * Atelier Götz – Website-Interaktionen (Vanilla JavaScript, keine Libs)
 *
 * Enthält:
 *   1. Mobiles Navigationsmenü (Hamburger-Toggle)
 *   2. Header-Schatten beim Scrollen
 *   3. Scroll-Reveal per IntersectionObserver
 *   4. Galerie-Lightbox (mit Tastatur-Bedienung & Fokus-Trap)
 *   5. Aktuelles Jahr im Footer
 *   6. Kontaktformular: einfache Client-Validierung
 *
 * Alle Effekte respektieren `prefers-reduced-motion`.
 * ===================================================================== */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initHeaderScroll();
    initScrollReveal();
    initLightbox();
    initCurrentYear();
    initContactForm();
  });

  /* ------------------------------------------------------------------ *
   * 1. Mobiles Navigationsmenü
   * ------------------------------------------------------------------ */
  function initMobileMenu() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-mobile-menu]');
    if (!toggle || !menu) return;

    const closeMenu = function () {
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = function () {
      menu.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', function () {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu() : openMenu();
    });

    // Menü schließen, sobald ein Link angeklickt wurde.
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Mit ESC schließen.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Header bekommt beim Scrollen einen dezenten Schatten / Hintergrund
   * ------------------------------------------------------------------ */
  function initHeaderScroll() {
    const header = document.querySelector('[data-header]');
    if (!header) return;

    const onScroll = function () {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * 3. Scroll-Reveal: Elemente mit .reveal sanft einblenden
   * ------------------------------------------------------------------ */
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    // Bei reduzierter Bewegung sofort alles anzeigen.
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target); // nur einmal animieren
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. Galerie-Lightbox
   *    Öffnet das angeklickte Bild groß; ESC / Klick / Button schließt.
   *    Tastatur: Pfeiltasten blättern, Fokus bleibt im Dialog (Trap).
   * ------------------------------------------------------------------ */
  function initLightbox() {
    const triggers = Array.prototype.slice.call(
      document.querySelectorAll('[data-lightbox]')
    );
    const lightbox = document.querySelector('[data-lightbox-dialog]');
    if (!triggers.length || !lightbox) return;

    const imageEl = lightbox.querySelector('[data-lightbox-image]');
    const closeBtn = lightbox.querySelector('[data-lightbox-close]');
    const prevBtn = lightbox.querySelector('[data-lightbox-prev]');
    const nextBtn = lightbox.querySelector('[data-lightbox-next]');
    let currentIndex = 0;
    let lastFocused = null;

    const showImage = function (index) {
      currentIndex = (index + triggers.length) % triggers.length;
      const source = triggers[currentIndex];
      const img = source.querySelector('img');
      if (img) {
        imageEl.src = img.getAttribute('src');
        imageEl.alt = img.getAttribute('alt') || '';
      }
    };

    const openLightbox = function (index) {
      lastFocused = document.activeElement;
      showImage(index);
      lightbox.classList.remove('hidden');
      lightbox.classList.add('flex');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    };

    const closeLightbox = function () {
      lightbox.classList.add('hidden');
      lightbox.classList.remove('flex');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    };

    triggers.forEach(function (trigger, index) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        openLightbox(index);
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    if (nextBtn)
      nextBtn.addEventListener('click', function () {
        showImage(currentIndex + 1);
      });
    if (prevBtn)
      prevBtn.addEventListener('click', function () {
        showImage(currentIndex - 1);
      });

    // Klick auf den dunklen Hintergrund schließt die Lightbox.
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    // Tastatur-Steuerung inkl. einfachem Fokus-Trap.
    document.addEventListener('keydown', function (e) {
      if (lightbox.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showImage(currentIndex + 1);
      if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
      if (e.key === 'Tab') {
        const focusable = lightbox.querySelectorAll('button');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. Aktuelles Jahr in den Footer schreiben
   * ------------------------------------------------------------------ */
  function initCurrentYear() {
    const yearEl = document.querySelector('[data-current-year]');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------ *
   * 6. Kontaktformular – einfache Validierung vor dem Absenden
   *    Hinweis: Das eigentliche Versenden übernimmt der im <form action>
   *    hinterlegte Dienst (z. B. Formspree). Siehe README.
   * ------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;

    const status = form.querySelector('[data-form-status]');

    form.addEventListener('submit', function (e) {
      // Browser-eigene Validierung nutzen (required, type=email …).
      if (!form.checkValidity()) {
        e.preventDefault();
        form.reportValidity();
        return;
      }

      // Solange noch kein echter Endpoint hinterlegt ist, Absenden abfangen
      // und einen freundlichen Hinweis zeigen (verhindert „toten" Button).
      const action = form.getAttribute('action') || '';
      if (action.indexOf('DEIN_FORM_ID') !== -1 || action === '') {
        e.preventDefault();
        if (status) {
          status.textContent =
            'Formular bereit. Bitte im Code die Formspree-ID eintragen (siehe README), damit Nachrichten zugestellt werden.';
          status.classList.remove('hidden');
        }
      }
    });
  }
})();
