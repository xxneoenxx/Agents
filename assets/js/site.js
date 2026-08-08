/* ==========================================================================
   Mc Döner — Verhalten
   1 · Öffnungsstatus in Echtzeit (Europe/Berlin, unabhängig vom Gerät)
   2 · Scroll-Choreografie mit GSAP + ScrollTrigger + Lenis
   Die Seite ist ohne JavaScript vollständig lesbar und bedienbar.
   ========================================================================== */
(function () {
  'use strict';

  var reduce   = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatGSAP  = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  /* ------------------------------------------------------------------------
     1 · ÖFFNUNGSZEITEN
     ------------------------------------------------------------------------ */
  var TAGE     = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var AUF      = 11 * 60;      // 11:00
  var ZU       = 21 * 60;      // 21:00
  var AUF_TAGE = [1, 2, 3, 4, 5, 6];   // Mo–Sa

  var WOCHENTAG = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

  /* Wochentag + Minuten seit Mitternacht in Berlin — egal wie die Uhr des
     Besuchers eingestellt ist. Intl liefert das zuverlässig; der Umweg über
     new Date(toLocaleString(...)) ist in mehreren Browsern fehleranfällig. */
  function berlinJetzt() {
    try {
      var teile = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin', hour12: false,
        weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric'
      }).formatToParts(new Date());

      var p = {};
      for (var i = 0; i < teile.length; i++) p[teile[i].type] = teile[i].value;

      var tag = WOCHENTAG[p.weekday];
      if (tag === undefined) throw new Error('weekday');

      return {
        tag:  tag,
        min:  (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10),
        jahr: parseInt(p.year, 10)
      };
    } catch (e) {
      var d = new Date();
      return { tag: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), jahr: d.getFullYear() };
    }
  }

  function istAufTag(tag) { return AUF_TAGE.indexOf(tag) !== -1; }

  function dauerText(minuten) {
    var std = Math.floor(minuten / 60), min = minuten % 60;
    if (std && min) return std + ' Std ' + min + ' Min';
    if (std)        return std + (std === 1 ? ' Stunde' : ' Stunden');
    return min + ' Min';
  }

  /* Nächster Öffnungszeitpunkt als lesbarer Text */
  function naechsteOeffnung(jetzt) {
    if (istAufTag(jetzt.tag) && jetzt.min < AUF) return 'heute';
    for (var i = 1; i <= 7; i++) {
      var t = (jetzt.tag + i) % 7;
      if (istAufTag(t)) return i === 1 ? 'morgen' : TAGE[t];
    }
    return null;
  }

  function statusZeichnen() {
    var pille = document.getElementById('status');
    var zeile = document.getElementById('jetztZeile');
    var sub   = document.getElementById('jetztSub');
    var jetzt = berlinJetzt();
    var offen = istAufTag(jetzt.tag) && jetzt.min >= AUF && jetzt.min < ZU;

    if (pille) {
      var text = pille.querySelector('.status-text');
      pille.classList.toggle('ist-offen', offen);
      if (offen) {
        var rest = ZU - jetzt.min;
        text.textContent = rest <= 30 ? 'Schließt in ' + rest + ' Min' : 'Jetzt geöffnet';
      } else {
        text.textContent = 'Gerade geschlossen';
      }
    }

    if (zeile && sub) {
      if (offen) {
        zeile.textContent = 'Jetzt geöffnet';
        sub.textContent   = 'Noch ' + dauerText(ZU - jetzt.min) + ' — bis 21:00 Uhr';
      } else {
        var wann = naechsteOeffnung(jetzt);
        zeile.textContent = 'Gerade geschlossen';
        sub.textContent   = wann ? 'Öffnet ' + wann + ' um 11:00 Uhr' : 'Mo–Sa 11–21 Uhr';
      }
    }
  }

  function heuteMarkieren() {
    var li = document.querySelector('#zeiten li[data-tag="' + berlinJetzt().tag + '"]');
    if (li) li.classList.add('ist-heute');
  }

  statusZeichnen();
  heuteMarkieren();
  setInterval(statusZeichnen, 30000);

  var jahr = document.getElementById('jahr');
  if (jahr) jahr.textContent = '© ' + berlinJetzt().jahr;

  /* ------------------------------------------------------------------------
     2 · OHNE GSAP: alles sichtbar machen und aussteigen
     ------------------------------------------------------------------------ */
  function allesZeigen() {
    var els = document.querySelectorAll('[data-animate]');
    for (var i = 0; i < els.length; i++) {
      els[i].style.opacity = 1;
      els[i].style.transform = 'none';
    }
  }

  if (!hatGSAP) { allesZeigen(); return; }

  gsap.registerPlugin(ScrollTrigger);

  if (reduce) {
    allesZeigen();
  }

  /* ------------------------------------------------------------------------
     3 · LENIS + GSAP verkabeln
     ------------------------------------------------------------------------ */
  var lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var ziel = document.querySelector(a.getAttribute('href'));
      if (!ziel) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(ziel, { offset: -10 });
      else ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------------------------------------
     4 · HERO-EINSTIEG (kein blockierender Preloader — die Telefonnummer
         soll sofort da sein)
     ------------------------------------------------------------------------ */
  if (!reduce) {
    gsap.set('.hero h1 .zeile > span', { yPercent: 108 });

    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to('.hero h1 .zeile > span', { yPercent: 0, duration: 1.05, stagger: .08 }, .05)
      .from('.hero-meta, .jetzt, .cta-reihe',
            { y: 22, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, .34)
      .from('.spiess',
            { opacity: 0, scaleY: .88, transformOrigin: '50% 100%', duration: 1.25 }, .1)
      .from('.scroll-hinweis', { opacity: 0, duration: .6 }, .85);
  }

  /* ------------------------------------------------------------------------
     5 · REVEALS, PARALLAX, NEIGUNG
     ------------------------------------------------------------------------ */
  if (!reduce) {
    gsap.utils.toArray('[data-animate]').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var f = parseFloat(el.dataset.parallax) || -.12;
      gsap.to(el, {
        yPercent: f * 100, ease: 'none',
        scrollTrigger: {
          trigger: el.closest('figure') || el,
          start: 'top bottom', end: 'bottom top', scrub: true
        }
      });
    });

    /* Die Bewertungs-Zettel richten sich beim Erscheinen auf */
    gsap.utils.toArray('[data-neigung]').forEach(function (el) {
      gsap.fromTo(el,
        { rotate: parseFloat(el.dataset.neigung) },
        { rotate: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    gsap.to('#fussWort', {
      yPercent: -7, ease: 'none',
      scrollTrigger: { trigger: '.fuss', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  /* ------------------------------------------------------------------------
     6 · ZAHLEN HOCHZÄHLEN
     ------------------------------------------------------------------------ */
  gsap.utils.toArray('[data-zaehl]').forEach(function (el) {
    var ziel = parseFloat(el.dataset.zaehl);
    var nk   = parseInt(el.dataset.nk || '0', 10);
    var obj  = { v: 0 };
    function malen() { el.textContent = obj.v.toFixed(nk).replace('.', ','); }

    if (reduce) { obj.v = ziel; malen(); return; }

    gsap.to(obj, {
      v: ziel, duration: 1.5, ease: 'power2.out', onUpdate: malen,
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  /* ------------------------------------------------------------------------
     7 · LAUFBAND + SIGNATUR-SPIESS reagieren auf das Scroll-Tempo
     ------------------------------------------------------------------------ */
  if (!reduce) {
    var bandLoop = gsap.to('#laufband', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
    var setSkew  = gsap.quickTo('#laufband', 'skewX', { duration: .5, ease: 'power3' });
    var haut     = document.getElementById('spiessHaut');

    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var v = Math.abs(self.getVelocity());
        bandLoop.timeScale(1 + Math.min(v / 260, 6));
        /* Der Spieß dreht per CSS-Animation — das Tempo kommt vom Scrollen */
        if (haut) haut.style.animationDuration = (11 / (1 + Math.min(v / 420, 5))).toFixed(2) + 's';
        setSkew(gsap.utils.clamp(-12, 12, self.getVelocity() / -110));
      }
    });
  }

  /* ------------------------------------------------------------------------
     8 · GALERIE — gepinnt und horizontal (nur Desktop)
     ------------------------------------------------------------------------ */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', function () {
    var spur = document.getElementById('galSpur');
    if (!spur) return;

    var weite = function () {
      return Math.max(0, spur.scrollWidth - window.innerWidth + 40);
    };

    var tween = gsap.to(spur, {
      x: function () { return -weite(); },
      ease: 'none',
      scrollTrigger: {
        trigger: '.galerie',
        start: 'top top',
        end: function () { return '+=' + weite(); },
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
      }
    });

    return function () {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
      gsap.set(spur, { clearProps: 'x' });
    };
  });

  /* ------------------------------------------------------------------------
     9 · KOPFZEILE + ANRUF-LEISTE
     ------------------------------------------------------------------------ */
  /* Bewusst ein schlichter Scroll-Listener statt ScrollTrigger: ein
     `end:'max'` wird beim Refresh einmal festgeschrieben, die gepinnte
     Galerie verlängert die Seite aber erst danach. Der Bereich endete
     dadurch vor dem Seitenende — Kopfzeile und Anruf-Leiste sprangen
     unten wieder in den Ausgangszustand zurück. */
  var kopf   = document.getElementById('top');
  var hero   = document.querySelector('.hero');
  var leiste = document.getElementById('rufleiste');
  var leisteSichtbar = false;

  if (leiste && !reduce) {
    /* Der versteckte Zustand steht als translateY(110%) im CSS (damit die
       Leiste auch ohne JS nicht im Weg ist). GSAP liest so eine Prozent-
       Verschiebung aber als Pixelwert in `y` ein — ein anschließendes
       yPercent-Tween würde dann ins Leere laufen. Deshalb den Startwert
       einmal sauber in GSAPs eigenen Einheiten setzen. */
    gsap.set(leiste, { yPercent: 110, y: 0 });
  }

  function beiScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;

    if (kopf) kopf.classList.toggle('top--haftend', y > 70);

    if (leiste && !reduce) {
      /* Die Leiste kommt, sobald der Hero samt Anruf-Knopf oben raus ist */
      var soll = y > (hero ? hero.offsetHeight : 600) - 60;
      if (soll !== leisteSichtbar) {
        leisteSichtbar = soll;
        gsap.to(leiste, { yPercent: soll ? 0 : 110, duration: .45, ease: 'power3.out' });
      }
    }
  }

  window.addEventListener('scroll', beiScroll, { passive: true });
  if (lenis) lenis.on('scroll', beiScroll);
  beiScroll();

  /* Pins sitzen erst richtig, wenn Schriften und Bilder geladen sind */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
