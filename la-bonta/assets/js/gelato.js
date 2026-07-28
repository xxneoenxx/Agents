/* ==========================================================================
   Effekt 3 — Farbwechsel in der Eis-Sektion, plus Signatur-Durchfärbung
   --------------------------------------------------------------------------
   Die Eis-Sektion ist der helle Bruch in einer sonst durchgehend dunklen
   Seite. Beim Durchscrollen wechselt ihre Fläche durch die Farben der
   Eisvitrine.

   Die Signatur: dieselbe Farbe blutet über die CSS-Variablen --gelato und
   --gelato-ink in Navigation, Markenzeichen und Anruf-Knopf durch. Dadurch
   fühlt sich das Scrollen an, als führe man durch die Vitrine — und der
   Doppelcharakter Restaurant/Eiscafé wird körperlich spürbar, statt nur
   behauptet zu werden.

   Fläche und Schrift kommen immer als geprüftes Paar. Jede Kombination
   erreicht mindestens 4.5:1 nach WCAG — deshalb kann der Anruf-Knopf die
   Farbe gefahrlos mittragen.
   ========================================================================== */

(function () {
  'use strict';

  /* Die Farben leiten sich von klassischen Eissorten ab, nicht aus der
     Landesflagge. Sobald die echte Eis-Karte vorliegt, sollten Namen und
     Farben daran angeglichen werden — siehe ABSCHLUSSBERICHT.md. */
  var SORTEN = [
    { name: 'Pistazie',       flaeche: '#A8C66C', schrift: '#0B1A10' },
    { name: 'Amarena',        flaeche: '#A81F45', schrift: '#FFF3F6' },
    { name: 'Stracciatella',  flaeche: '#F2E6D2', schrift: '#2A2118' },
    { name: 'Zitrone',        flaeche: '#E8C547', schrift: '#2E2606' },
    { name: 'Haselnuss',      flaeche: '#C08A5E', schrift: '#231206' }
  ];

  /* Außerhalb der Eis-Sektion ist die Seite konsequent schwarz-weiß.
     Erst beim Eintauchen übernimmt die Sortenfarbe Navigation, Markenzeichen
     und Anruf-Knopf — und verschwindet beim Verlassen wieder. */
  var NEUTRAL = { flaeche: '#F7F6F3', schrift: '#0B0B0B' };

  var wurzel = document.documentElement;
  var sektion = document.querySelector('[data-eis]');
  if (!sektion) return;

  /* Färbt die Sektion selbst — sie trägt immer eine Sortenfarbe. */
  function sektionSetzen(i) {
    var s = SORTEN[i];
    wurzel.style.setProperty('--eis-flaeche', s.flaeche);
    wurzel.style.setProperty('--eis-ink', s.schrift);
    var anzeige = sektion.querySelector('[data-eis-name]');
    if (anzeige) anzeige.textContent = s.name;
  }

  /* Färbt die durchblutenden Bedienelemente. */
  function blutenSetzen(farbe) {
    wurzel.style.setProperty('--gelato', farbe.flaeche);
    wurzel.style.setProperty('--gelato-ink', farbe.schrift);
  }

  function setzen(i) {
    sektionSetzen(i);
    blutenSetzen(SORTEN[i]);
  }

  function neutral() {
    blutenSetzen(NEUTRAL);
    setzen.letzte = -1;
  }

  /* Farbpunkte in der Sortenliste einfärben */
  var punkte = sektion.querySelectorAll('[data-sorte-punkt]');
  for (var p = 0; p < punkte.length; p++) {
    var idx = +punkte[p].getAttribute('data-sorte-punkt');
    if (SORTEN[idx]) punkte[p].style.setProperty('--punkt', SORTEN[idx].flaeche);
  }

  sektionSetzen(0);
  neutral();

  /* Für die Vorschau: erlaubt es, die Sorten von Hand durchzuschalten,
     ohne durch die Sektion zu scrollen. */
  window.__eisSorten = SORTEN.map(function (s) { return s.name; });
  window.__eisSetzen = function (i) { setzen(i); setzen.letzte = i; };

  if (window.__reduce || typeof gsap === 'undefined') return;

  /* Ein Auslöser über die gesamte Sektionshöhe. Der Fortschritt wird in
     gleich große Stufen geteilt — eine Sorte pro Stufe. */
  ScrollTrigger.create({
    trigger: sektion,
    start: 'top 62%',
    end: 'bottom 38%',
    onUpdate: function (self) {
      /* Wurde eine Sorte von Hand gewählt (nur in der Vorschau möglich),
         darf das Scrollen sie nicht sofort wieder überschreiben. */
      if (window.__eisManuell) return;
      var i = Math.min(
        SORTEN.length - 1,
        Math.floor(self.progress * SORTEN.length)
      );
      if (i !== setzen.letzte) { setzen(i); setzen.letzte = i; }
    }
  });

  /* Außerhalb der Sektion zurück auf die Grundfarbe, damit Navigation und
     Anruf-Knopf im dunklen Teil der Seite ruhig bleiben. */
  ScrollTrigger.create({
    trigger: sektion,
    start: 'top bottom',
    end: 'bottom top',
    onLeave: neutral,
    onLeaveBack: neutral
  });
})();
