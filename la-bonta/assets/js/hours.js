/* ==========================================================================
   Effekt 1 — Live-Öffnungsstatus
   --------------------------------------------------------------------------
   Beantwortet die häufigste Gästefrage sofort und ohne Scrollen: „Habt ihr
   gerade offen?" Nützlich statt dekorativ.

   Zwei Dinge sind hier entscheidend:

   1. Gerechnet wird immer in Europa/Berlin, nie in der Zeitzone des
      Besuchers. Sonst zeigt die Seite einem Gast, der aus dem Urlaub bucht,
      einen falschen Status an. Das ist der Fehler, der bei solchen Widgets
      regelmäßig übersehen wird.

   2. AUSNAHMEN ist der Haken für Feiertage. Ob an einem Feiertag, der auf
      einen Dienstag fällt, geöffnet ist, ist derzeit ungeklärt — siehe
      ABSCHLUSSBERICHT.md. Bis das geklärt ist, bleibt die Liste leer und
      es gilt die reguläre Woche.
   ========================================================================== */

(function () {
  'use strict';

  /* Index 0 = Sonntag. Minuten seit Mitternacht: 660 = 11:00, 1260 = 21:00.
     So, Mo geöffnet · Di Ruhetag · Mi–Sa geöffnet */
  var HOURS = [
    [660, 1260], // Sonntag
    [660, 1260], // Montag
    null,        // Dienstag — Ruhetag
    [660, 1260], // Mittwoch
    [660, 1260], // Donnerstag
    [660, 1260], // Freitag
    [660, 1260]  // Samstag
  ];

  /* Ausnahmetage. Schlüssel ist das Datum in Berlin als 'JJJJ-MM-TT'.
     zeiten: null bedeutet geschlossen, sonst [von, bis] in Minuten.

     So wird ein Feiertag nachgetragen:
       '2026-12-24': { zeiten: null,        hinweis: 'Heiligabend geschlossen' },
       '2026-12-25': { zeiten: [660, 1260], hinweis: '1. Weihnachtsfeiertag' },
  */
  var AUSNAHMEN = {};

  var TAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var TAGE_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  /* Liest die Wanduhrzeit in Berlin aus, unabhängig davon, wo der Gast sitzt. */
  function berlinJetzt(referenz) {
    var teile = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(referenz || new Date());

    var t = {};
    for (var i = 0; i < teile.length; i++) t[teile[i].type] = teile[i].value;

    var jahr = +t.year, monat = +t.month, tag = +t.day;
    var stunde = +t.hour % 24, minute = +t.minute;

    return {
      datum: t.year + '-' + t.month + '-' + t.day,
      /* Über UTC konstruiert, damit der Wochentag zum Berliner Kalendertag
         gehört und nicht zur Zeitzone des Geräts. */
      wochentag: new Date(Date.UTC(jahr, monat - 1, tag)).getUTCDay(),
      minuten: stunde * 60 + minute
    };
  }

  function zeitenFuer(wochentag, datum) {
    if (datum && Object.prototype.hasOwnProperty.call(AUSNAHMEN, datum)) {
      return AUSNAHMEN[datum].zeiten;
    }
    return HOURS[wochentag];
  }

  function hhmm(minuten) {
    var h = Math.floor(minuten / 60), m = minuten % 60;
    return h + ':' + (m < 10 ? '0' + m : m);
  }

  /* Sucht den nächsten Tag mit Öffnungszeiten, höchstens eine Woche voraus. */
  function naechsteOeffnung(jetzt) {
    for (var v = 1; v <= 7; v++) {
      var wt = (jetzt.wochentag + v) % 7;
      var z = zeitenFuer(wt, null);
      if (z) return { versatz: v, wochentag: wt, von: z[0] };
    }
    return null;
  }

  function ermittleZustand(jetzt) {
    var ausnahme = AUSNAHMEN[jetzt.datum];
    var heute = zeitenFuer(jetzt.wochentag, jetzt.datum);

    if (!heute) {
      var n1 = naechsteOeffnung(jetzt);
      return {
        zustand: ausnahme ? 'zu' : 'ruhetag',
        text: ausnahme ? (ausnahme.hinweis || 'Heute geschlossen') : 'Heute Ruhetag',
        zusatz: n1 ? oeffnetText(n1) : ''
      };
    }

    var von = heute[0], bis = heute[1];

    if (jetzt.minuten < von) {
      var restBis = von - jetzt.minuten;
      return {
        zustand: restBis <= 60 ? 'bald' : 'zu',
        text: restBis <= 60 ? 'Öffnet in ' + restBis + ' Minuten' : 'Noch geschlossen',
        zusatz: 'Öffnet heute um ' + hhmm(von) + ' Uhr'
      };
    }

    if (jetzt.minuten < bis) {
      var restZu = bis - jetzt.minuten;
      return {
        zustand: 'offen',
        text: 'Jetzt geöffnet',
        zusatz: restZu <= 60
          ? 'Schließt in ' + restZu + ' Minuten'
          : 'bis ' + hhmm(bis) + ' Uhr'
      };
    }

    var n2 = naechsteOeffnung(jetzt);
    return {
      zustand: 'zu',
      text: 'Für heute geschlossen',
      zusatz: n2 ? oeffnetText(n2) : ''
    };
  }

  function oeffnetText(n) {
    var wann = n.versatz === 1 ? 'morgen' : TAGE_LANG[n.wochentag];
    return 'Öffnet ' + wann + ' um ' + hhmm(n.von) + ' Uhr';
  }

  /* Hebt den heutigen Tag in der Öffnungszeiten-Tabelle hervor. */
  function tabelleMarkieren(jetzt) {
    var zeilen = document.querySelectorAll('[data-tag]');
    for (var i = 0; i < zeilen.length; i++) {
      var tag = +zeilen[i].getAttribute('data-tag');
      zeilen[i].setAttribute('data-heute', tag === jetzt.wochentag ? 'true' : 'false');
      if (!zeitenFuer(tag, null)) zeilen[i].setAttribute('data-ruhetag', 'true');
    }
  }

  function aktualisieren() {
    var knoten = document.querySelectorAll('[data-status]');
    if (!knoten.length) return;

    var jetzt = berlinJetzt();
    var s = ermittleZustand(jetzt);

    for (var i = 0; i < knoten.length; i++) {
      var el = knoten[i];
      el.setAttribute('data-zustand', s.zustand);
      var text = el.querySelector('[data-status-text]');
      var zusatz = el.querySelector('[data-status-zusatz]');
      if (text) text.textContent = s.text;
      if (zusatz) zusatz.textContent = s.zusatz ? ' · ' + s.zusatz : '';
    }

    tabelleMarkieren(jetzt);
  }

  /* Für die Prüfung: erlaubt es, den Status zu einem beliebigen Zeitpunkt
     zu berechnen, ohne die Systemuhr zu verstellen. */
  window.__oeffnungsstatus = function (referenz) {
    return ermittleZustand(berlinJetzt(referenz));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aktualisieren);
  } else {
    aktualisieren();
  }
  setInterval(aktualisieren, 60000);
})();
