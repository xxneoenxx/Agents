/* ==========================================================================
   Effekt 2 — Speisekarte als aufklappbares Buch
   --------------------------------------------------------------------------
   Das Schaustück der Seite. Passt zum traditionsreichen Haus: man blättert
   in einer Karte, statt eine Webseite herunterzuscrollen.

   Drei Pflichtregeln, die hier nicht verhandelbar sind:

   1. Die Listenansicht steht IMMER im HTML und ist die einzige Datenquelle.
      Das Buch wird daraus geklont. Dadurch können Liste und Buch nie
      auseinanderlaufen, und ohne JavaScript bleibt die Karte vollständig
      lesbar — für Gäste wie für Google.

   2. Unter 760 px wird das Buch gar nicht erst gebaut. Auf einem Handy ist
      Blättern in einer zweiseitigen Karte unbrauchbar.

   3. Tastaturbedienung: Pfeiltasten blättern, Pos1 und Ende springen an
      Anfang und Ende.

   Barrierefreiheit: Ist das Buch sichtbar, wird es als rein visuelle
   Darstellung aus dem Zugänglichkeitsbaum genommen (aria-hidden) und die
   Liste bleibt darin erhalten — nur optisch ausgeblendet. Screenreader
   lesen also immer die vollständige, ruhige Liste.
   ========================================================================== */

(function () {
  'use strict';

  var MIN_BREITE = 760;
  var buecher = [];

  function istBuchTauglich() {
    return window.innerWidth >= MIN_BREITE &&
           !window.__reduce &&
           typeof St !== 'undefined' && St.PageFlip;
  }

  /* ---- Seitenumbruch nach echter Messung -------------------------------
     Es wird nicht nach fester Stückzahl umgebrochen, sondern gemessen:
     Einträge wandern so lange auf die Seite, bis sie überläuft. Sonst
     entstehen halbleere oder überfüllte Seiten, je nach Länge der
     Beschreibungstexte. */
  function seitenBauen(quelle, breite, hoehe) {
    var probe = document.createElement('div');
    probe.className = 'seite';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;' +
                          'width:' + breite + 'px;height:' + hoehe + 'px;';
    var innen = document.createElement('div');
    probe.appendChild(innen);
    document.body.appendChild(probe);

    var stil = getComputedStyle(probe);
    var verfuegbar = probe.clientHeight -
                     parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom) - 22;

    var seiten = [];
    var aktuell = document.createElement('div');

    function passt() { return innen.scrollHeight <= verfuegbar; }

    function seiteAbschliessen() {
      if (aktuell.childNodes.length) seiten.push(aktuell);
      aktuell = document.createElement('div');
      innen.innerHTML = '';
    }

    function anfuegen(knoten) {
      aktuell.appendChild(knoten);
      innen.appendChild(knoten.cloneNode(true));
      return passt();
    }

    var rubriken = quelle.querySelectorAll('[data-rubrik]');

    for (var r = 0; r < rubriken.length; r++) {
      var rubrik = rubriken[r];
      var titelText = rubrik.querySelector('[data-rubrik-titel]');
      var eintraege = rubrik.querySelectorAll('[data-eintrag]');

      function titelKlon(fortsetzung) {
        var h = titelText.cloneNode(true);
        if (fortsetzung) {
          var s = document.createElement('span');
          s.className = 'rubrik__fort';
          s.textContent = ' (Fortsetzung)';
          h.appendChild(s);
        }
        return h;
      }

      /* Rubrik-Überschrift setzen; passt sie nicht mehr, neue Seite */
      if (titelText && !anfuegen(titelKlon(false))) {
        aktuell.removeChild(aktuell.lastChild);
        seiteAbschliessen();
        anfuegen(titelKlon(false));
      }

      var notiz = rubrik.querySelector('[data-rubrik-notiz]');
      if (notiz) anfuegen(notiz.cloneNode(true));

      for (var e = 0; e < eintraege.length; e++) {
        if (!anfuegen(eintraege[e].cloneNode(true))) {
          /* Läuft über: letzten Eintrag zurücknehmen, Seite schließen,
             auf der neuen Seite mit Fortsetzungs-Überschrift weiter. */
          aktuell.removeChild(aktuell.lastChild);
          seiteAbschliessen();
          if (titelText) anfuegen(titelKlon(true));
          anfuegen(eintraege[e].cloneNode(true));
        }
      }
    }
    seiteAbschliessen();

    document.body.removeChild(probe);

    /* Gerade Seitenzahl, damit die Doppelseite immer aufgeht */
    if (seiten.length % 2 !== 0) seiten.push(document.createElement('div'));
    return seiten;
  }

  /* ---- Ein Buch aufbauen ------------------------------------------------ */
  function buchBauen(sektion) {
    var huelle = sektion.querySelector('[data-buch-huelle]');
    var ziel = sektion.querySelector('[data-buch-ziel]');
    var buehne = sektion.querySelector('.buch-buehne');
    var liste = sektion.querySelector('.karte-liste:not([hidden])');
    if (!huelle || !ziel || !liste) return null;

    /* An der tatsächlich verfügbaren Innenbreite messen, nicht an der
       Sektionsbreite — sonst ragt die Doppelseite über den Satzspiegel
       hinaus und erzeugt waagerechtes Scrollen. */
    var verfuegbareBreite = Math.min(buehne.clientWidth || sektion.clientWidth, 1040);
    var seitenBreite = Math.floor(Math.min(430, (verfuegbareBreite - 8) / 2));
    var seitenHoehe = Math.round(seitenBreite * 1.4);

    var seiten = seitenBauen(liste, seitenBreite, seitenHoehe);

    ziel.innerHTML = '';
    seiten.forEach(function (inhalt, i) {
      var seite = document.createElement('div');
      seite.className = 'seite ' + (i % 2 === 0 ? 'seite--links' : 'seite--rechts');
      seite.setAttribute('data-density', 'soft');
      while (inhalt.firstChild) seite.appendChild(inhalt.firstChild);
      var nr = document.createElement('div');
      nr.className = 'seite__nr';
      nr.textContent = i + 1;
      seite.appendChild(nr);
      ziel.appendChild(seite);
    });

    var flip = new St.PageFlip(ziel, {
      width: seitenBreite,
      height: seitenHoehe,
      size: 'fixed',
      showCover: false,
      usePortrait: false,
      mobileScrollSupport: false,
      drawShadow: true,
      flippingTime: 700,
      maxShadowOpacity: 0.4
    });
    flip.loadFromHTML(ziel.querySelectorAll('.seite'));

    /* Nur die Blätterbühne selbst ist rein visuell und wird aus dem
       Zugänglichkeitsbaum genommen — gelesen wird die Liste. Die
       Bedienknöpfe darunter bleiben bewusst zugänglich, damit man per
       Tastatur hineinkommt und die Pfeiltasten greifen. */
    buehne.setAttribute('aria-hidden', 'true');

    return { flip: flip, seiten: seiten.length };
  }

  /* ---- Steuerung -------------------------------------------------------- */
  function steuerungVerdrahten(sektion, zustand) {
    var zurueck = sektion.querySelector('[data-buch-zurueck]');
    var vor = sektion.querySelector('[data-buch-vor]');
    var stand = sektion.querySelector('[data-buch-stand]');

    function standAktualisieren() {
      if (!zustand.flip) return;
      var i = zustand.flip.getCurrentPageIndex();
      var n = zustand.flip.getPageCount();
      if (stand) stand.textContent = 'Seite ' + (i + 1) + '–' + Math.min(i + 2, n) + ' von ' + n;
      if (zurueck) zurueck.disabled = i <= 0;
      if (vor) vor.disabled = i + 2 >= n;
    }

    if (zurueck) zurueck.addEventListener('click', function () { zustand.flip.flipPrev(); });
    if (vor) vor.addEventListener('click', function () { zustand.flip.flipNext(); });
    if (zustand.flip) {
      zustand.flip.on('flip', standAktualisieren);
      standAktualisieren();
    }

    /* Pflichtregel 3 — Tastaturbedienung */
    sektion.addEventListener('keydown', function (ev) {
      if (!zustand.flip || !zustand.buchAktiv) return;
      if (ev.target.closest('input, textarea, select')) return;
      switch (ev.key) {
        case 'ArrowRight': ev.preventDefault(); zustand.flip.flipNext(); break;
        case 'ArrowLeft':  ev.preventDefault(); zustand.flip.flipPrev(); break;
        case 'Home':       ev.preventDefault(); zustand.flip.turnToPage(0); standAktualisieren(); break;
        case 'End':        ev.preventDefault();
                           zustand.flip.turnToPage(zustand.flip.getPageCount() - 1);
                           standAktualisieren(); break;
      }
    });

    zustand.standAktualisieren = standAktualisieren;
  }

  /* ---- Sektion einrichten ----------------------------------------------- */
  function einrichten(sektion) {
    var zustand = { flip: null, buchAktiv: false };
    var huelle = sektion.querySelector('[data-buch-huelle]');
    var schalter = sektion.querySelector('[data-ansicht-schalter]');
    var listen = sektion.querySelectorAll('.karte-liste');

    function abbauen() {
      if (zustand.flip) {
        try { zustand.flip.destroy(); } catch (e) { /* bereits abgebaut */ }
        zustand.flip = null;
      }
    }

    function ansichtSetzen(alsBuch) {
      zustand.buchAktiv = alsBuch && istBuchTauglich();

      if (zustand.buchAktiv) {
        abbauen();
        /* Erst sichtbar schalten, dann bauen — eine ausgeblendete Hülle
           hat die Breite 0 und würde die Seitenmaße verfälschen. */
        if (huelle) huelle.setAttribute('data-aktiv', 'true');
        var neu = buchBauen(sektion);
        if (!neu) { zustand.buchAktiv = false; }
        else {
          zustand.flip = neu.flip;
          steuerungVerdrahten(sektion, zustand);
        }
      } else {
        abbauen();
      }

      if (huelle) huelle.setAttribute('data-aktiv', zustand.buchAktiv ? 'true' : 'false');

      /* Die sichtbare Liste wird beim Buch nur optisch ausgeblendet —
         sie bleibt im Zugänglichkeitsbaum und im Quelltext. */
      for (var i = 0; i < listen.length; i++) {
        listen[i].classList.toggle('nur-sr',
          zustand.buchAktiv && !listen[i].hasAttribute('hidden'));
      }

      if (schalter) {
        schalter.textContent = zustand.buchAktiv ? 'Als Liste ansehen' : 'Als Buch ansehen';
        schalter.setAttribute('aria-pressed', zustand.buchAktiv ? 'true' : 'false');
        schalter.hidden = !istBuchTauglich();
      }
    }

    /* Reiter: zwischen den Karten einer Sektion umschalten */
    var reiter = sektion.querySelectorAll('[role="tab"]');
    for (var t = 0; t < reiter.length; t++) {
      (function (knopf) {
        knopf.addEventListener('click', function () {
          var ziel = knopf.getAttribute('data-ziel');
          for (var k = 0; k < reiter.length; k++) {
            var an = reiter[k] === knopf;
            reiter[k].setAttribute('aria-selected', an ? 'true' : 'false');
            reiter[k].setAttribute('tabindex', an ? '0' : '-1');
          }
          for (var l = 0; l < listen.length; l++) {
            listen[l].hidden = listen[l].getAttribute('data-karte') !== ziel;
          }
          ansichtSetzen(zustand.buchAktiv);
        });
      })(reiter[t]);
    }

    if (schalter) {
      schalter.addEventListener('click', function () { ansichtSetzen(!zustand.buchAktiv); });
    }

    /* Auf breiten Fenstern startet die Karte als Buch — das ist das
       Schaustück. Auf schmalen bleibt es bei der Liste. */
    ansichtSetzen(istBuchTauglich());

    buecher.push({ sektion: sektion, zustand: zustand, ansichtSetzen: ansichtSetzen });
  }

  /* ---- Start ------------------------------------------------------------ */
  function start() {
    var sektionen = document.querySelectorAll('[data-buch]');
    for (var i = 0; i < sektionen.length; i++) einrichten(sektionen[i]);

    function alleNeu() {
      for (var b = 0; b < buecher.length; b++) {
        buecher[b].ansichtSetzen(buecher[b].zustand.buchAktiv && istBuchTauglich());
      }
    }

    /* Neu aufbauen, wenn die Karte erst nachträglich sichtbar wird — ein
       ausgeblendeter Bereich hat die Breite 0 und ergäbe unbrauchbare
       Seitenmaße. Wird von der Vorschau-Datei beim Seitenwechsel gerufen. */
    window.__buecherNeu = function () {
      for (var b = 0; b < buecher.length; b++) {
        buecher[b].ansichtSetzen(istBuchTauglich());
      }
    };

    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(alleNeu, 250);
    });
    window.addEventListener('orientationchange', function () {
      setTimeout(alleNeu, 350);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
