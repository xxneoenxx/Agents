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
    if (typeof St === 'undefined' || !St.PageFlip) return false;
    /* Nur die Vorschau-Datei setzt __buchErzwingen, um das Buch auch auf
       schmalen Geräten vorführen zu können. Es läuft dann als Einzelseite. */
    if (window.__buchErzwingen) return true;
    return window.innerWidth >= MIN_BREITE && !window.__reduce;
  }

  function istSchmal() { return window.innerWidth < MIN_BREITE; }

  /* ---- Seitenumbruch nach echter Messung -------------------------------
     Es wird nicht nach fester Stückzahl umgebrochen, sondern gemessen:
     Einträge wandern so lange auf die Seite, bis sie überläuft. Sonst
     entstehen halbleere oder überfüllte Seiten, je nach Länge der
     Beschreibungstexte. */
  function seitenBauen(quelle, breite, hoehe) {
    /* Die Seitenmaße stehen in der Regel „.buch .seite". Läge die Probe
       außerhalb eines .buch-Elements, bekäme sie keinen Innenabstand und
       meldete rund 50 Pixel zu viel Platz — die fertigen Seiten liefen
       dann über. Deshalb wird der echte Aufbau nachgebildet. */
    var probeHuelle = document.createElement('div');
    probeHuelle.className = 'buch';
    probeHuelle.setAttribute('aria-hidden', 'true');
    probeHuelle.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;';

    var probe = document.createElement('div');
    probe.className = 'seite';
    probe.style.cssText = 'width:' + breite + 'px;height:' + hoehe + 'px;';
    probeHuelle.appendChild(probe);
    var innen = document.createElement('div');
    /* flow-root erzeugt einen eigenen Formatierungskontext. Ohne ihn
       schlagen die Ränder des ersten und letzten Kindes durch den
       Messbehälter hindurch und die gemessene Höhe fällt zu klein aus —
       die fertige Seite lief dadurch um rund 20 Pixel über. */
    innen.style.display = 'flow-root';
    probe.appendChild(innen);
    document.body.appendChild(probeHuelle);

    var stil = getComputedStyle(probe);
    /* 34 px bleiben für die Seitenzahl am Fuß frei, sonst schiebt sich der
       letzte Eintrag darüber. */
    var verfuegbar = probe.clientHeight -
                     parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom) - 34;

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

    /* Nimmt Angefügtes wieder zurück — aus beiden Bäumen, sonst misst die
       nächste Prüfung zu viel. */
    function zurueckAuf(anzahl) {
      while (aktuell.childNodes.length > anzahl) {
        aktuell.removeChild(aktuell.lastChild);
        if (innen.lastChild) innen.removeChild(innen.lastChild);
      }
    }

    var rubriken = quelle.querySelectorAll('[data-rubrik]');

    for (var r = 0; r < rubriken.length; r++) {
      var rubrik = rubriken[r];
      var titelText = rubrik.querySelector('[data-rubrik-titel]');
      var notiz = rubrik.querySelector('[data-rubrik-notiz]');
      var eintraege = rubrik.querySelectorAll('[data-eintrag]');

      var titelKlon = (function (quelleTitel) {
        return function (fortsetzung) {
          var h = quelleTitel.cloneNode(true);
          if (fortsetzung) {
            var s = document.createElement('span');
            s.className = 'rubrik__fort';
            s.textContent = ' (Fortsetzung)';
            h.appendChild(s);
          }
          return h;
        };
      })(titelText);

      /* Überschrift, Notiz und der erste Eintrag müssen GEMEINSAM auf die
         Seite passen. Sonst bliebe eine Rubrik-Überschrift allein am
         Seitenfuß stehen — typografisch ein Schusterjunge. */
      var marke = aktuell.childNodes.length;
      var gruppeOk = true;

      if (titelText) gruppeOk = anfuegen(titelKlon(false));
      if (gruppeOk && notiz) gruppeOk = anfuegen(notiz.cloneNode(true));
      if (gruppeOk && eintraege.length) gruppeOk = anfuegen(eintraege[0].cloneNode(true));

      if (!gruppeOk) {
        zurueckAuf(marke);
        seiteAbschliessen();
        if (titelText) anfuegen(titelKlon(false));
        if (notiz) anfuegen(notiz.cloneNode(true));
        if (eintraege.length) anfuegen(eintraege[0].cloneNode(true));
      }

      for (var e = 1; e < eintraege.length; e++) {
        if (!anfuegen(eintraege[e].cloneNode(true))) {
          /* Läuft über: letzten Eintrag zurücknehmen, Seite schließen,
             auf der neuen Seite mit Fortsetzungs-Überschrift weiter. */
          zurueckAuf(aktuell.childNodes.length - 1);
          seiteAbschliessen();
          if (titelText) anfuegen(titelKlon(true));
          anfuegen(eintraege[e].cloneNode(true));
        }
      }
    }
    seiteAbschliessen();

    document.body.removeChild(probeHuelle);

    /* Gerade Seitenzahl, damit die Doppelseite immer aufgeht */
    if (seiten.length % 2 !== 0) seiten.push(document.createElement('div'));
    return seiten;
  }

  /* ---- Ein Buch aufbauen ------------------------------------------------ */
  function buchBauen(sektion) {
    var huelle = sektion.querySelector('[data-buch-huelle]');
    var buehne = sektion.querySelector('.buch-buehne');
    var liste = sektion.querySelector('.karte-liste:not([hidden])');
    if (!huelle || !buehne || !liste) return null;

    /* StPageFlip ersetzt beim Initialisieren das Element, das es bekommt.
       Ein zweiter Aufbau fände das alte Ziel deshalb nicht mehr — das Buch
       verschwände beim Ändern der Fenstergröße oder beim Drehen des Geräts.
       Darum bekommt jeder Aufbau ein frisches Ziel innerhalb der Bühne,
       die als einziges Element stabil bleibt. */
    buehne.innerHTML = '';
    var ziel = document.createElement('div');
    ziel.className = 'buch';
    ziel.setAttribute('data-buch-ziel', '');
    buehne.appendChild(ziel);

    /* An der tatsächlich verfügbaren Innenbreite messen, nicht an der
       Sektionsbreite — sonst ragt die Doppelseite über den Satzspiegel
       hinaus und erzeugt waagerechtes Scrollen. */
    var verfuegbareBreite = Math.min(buehne.clientWidth || sektion.clientWidth, 1040);
    var schmal = istSchmal();
    var seitenBreite, seitenHoehe;

    if (schmal) {
      /* Einzelseite: die volle Breite für eine Seite statt zwei nebeneinander.
         Bei 172 Pixeln pro Seite wäre eine Doppelseite unlesbar. */
      seitenBreite = Math.floor(Math.min(430, verfuegbareBreite - 4));
      seitenHoehe = Math.round(Math.min(seitenBreite * 1.45, window.innerHeight * 0.74));
    } else {
      seitenBreite = Math.floor(Math.min(430, (verfuegbareBreite - 8) / 2));
      seitenHoehe = Math.round(seitenBreite * 1.4);
    }

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
      usePortrait: schmal,
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

    return { flip: flip, seiten: seiten.length, schmal: schmal };
  }

  /* ---- Steuerung --------------------------------------------------------
     Wird GENAU EINMAL je Sektion aufgerufen. Früher lief das bei jedem
     Neuaufbau des Buchs mit und hängte dabei jedes Mal neue Klick-Handler
     an dieselben Knöpfe — nach zwei Drehungen des Geräts blätterte ein
     Tippen drei Seiten weiter. Die Handler greifen deshalb über zustand.flip
     immer auf das aktuelle Buch zu, statt eines festzuhalten. */
  function steuerungVerdrahten(sektion, zustand) {
    var zurueck = sektion.querySelector('[data-buch-zurueck]');
    var vor = sektion.querySelector('[data-buch-vor]');
    var stand = sektion.querySelector('[data-buch-stand]');

    function standAktualisieren() {
      if (!zustand.flip) return;
      var i = zustand.flip.getCurrentPageIndex();
      var n = zustand.flip.getPageCount();
      var proAnsicht = zustand.schmal ? 1 : 2;
      if (stand) {
        stand.textContent = proAnsicht === 1
          ? 'Seite ' + (i + 1) + ' von ' + n
          : 'Seite ' + (i + 1) + '–' + Math.min(i + 2, n) + ' von ' + n;
      }
      if (zurueck) zurueck.disabled = i <= 0;
      if (vor) vor.disabled = i + proAnsicht >= n;
    }

    if (zurueck) zurueck.addEventListener('click', function () {
      if (zustand.flip) zustand.flip.flipPrev();
    });
    if (vor) vor.addEventListener('click', function () {
      if (zustand.flip) zustand.flip.flipNext();
    });

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

  /* Nach jedem Neuaufbau: das frische Buch an die bereits verdrahtete
     Anzeige hängen. */
  function flipVerbinden(zustand) {
    if (!zustand.flip || !zustand.standAktualisieren) return;
    zustand.flip.on('flip', zustand.standAktualisieren);
    zustand.standAktualisieren();
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
          zustand.schmal = neu.schmal;
          flipVerbinden(zustand);
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

    /* Einmalig, vor dem ersten Aufbau */
    steuerungVerdrahten(sektion, zustand);

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
