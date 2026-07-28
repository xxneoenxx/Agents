#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Baut aus der fertigen Website EINE eigenständige HTML-Datei für die Vorschau
auf dem Handy — ohne Server, ohne Internet, ohne Begleitdateien.

Alles wandert hinein: beide Schriften als Base64, GSAP, Lenis, StPageFlip,
sämtliches CSS und alle fünf Seiten. Statt echter Dateiwechsel gibt es einen
kleinen Umschalter, der immer nur eine Seite zeigt.

Dazu ein Bedienfeld, mit dem sich JEDE Funktion vorführen lässt — auch die,
die auf einem Handy sonst gar nicht erscheinen (Buch, Saison-Band) oder die
eine bestimmte Uhrzeit brauchen (Ruhetag).

Aufruf:
    python3 bauen/vorschau-bauen.py

Ergebnis:
    LA-BONTA-Vorschau.html
"""

import base64
import pathlib
import re

WURZEL = pathlib.Path(__file__).resolve().parent.parent

SEITEN = [
    ("start",       "index.html",        "Startseite"),
    ("karte",       "speisekarte.html",  "Speisekarte"),
    ("kontakt",     "kontakt.html",      "Kontakt"),
    ("impressum",   "impressum.html",    "Impressum"),
    ("datenschutz", "datenschutz.html",  "Datenschutz"),
]

DATEI_ZU_ROUTE = {
    "index.html": "#start",
    "speisekarte.html": "#karte",
    "kontakt.html": "#kontakt",
    "impressum.html": "#impressum",
    "datenschutz.html": "#datenschutz",
}


def lies(pfad):
    return (WURZEL / pfad).read_text(encoding="utf-8")


def schrift_einbetten(css):
    def ersetze(m):
        roh = (WURZEL / "assets" / "fonts" / m.group(1)).read_bytes()
        return "url('data:font/woff2;base64,%s')" % base64.b64encode(roh).decode("ascii")
    return re.sub(r"url\('\.\./fonts/([^']+)'\)", ersetze, css)


def koerper(html):
    return re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)


EINGESAMMELT = []


def aufraeumen(inhalt, route):
    """Bereitet den Seiteninhalt für das gemeinsame Dokument auf.

    Inline-Skripte werden NICHT einfach verworfen — sonst wäre etwa die
    Logik der Tischanfrage in der Vorschau tot. Sie werden herausgelöst,
    von der seitenweisen Jahreszahl befreit und später einmal zentral
    ausgeführt.
    """
    def einsammeln(m):
        code = m.group(1)
        # Die Jahreszahl läuft zentral über [data-jahr]
        code = re.sub(r"^.*getElementById\('jahr'\).*$", "", code, flags=re.M)
        if code.strip():
            EINGESAMMELT.append(code.strip())
        return ""

    # Nur Skripte OHNE type-Attribut sind JavaScript. Die JSON-LD-Blöcke
    # (type="application/ld+json") bleiben unangetastet in der Seite stehen —
    # als JavaScript ausgeführt ergäben sie einen Syntaxfehler.
    inhalt = re.sub(r"<script(?![^>]*\bsrc=)(?![^>]*\btype=)[^>]*>(.*?)</script>",
                    einsammeln, inhalt, flags=re.S)
    inhalt = re.sub(r"<script[^>]*\bsrc=[^>]*>\s*</script>", "", inhalt)

    for kennung in ("inhalt", "nav-mobil"):
        inhalt = inhalt.replace('id="%s"' % kennung, 'id="%s-%s"' % (route, kennung))
        inhalt = inhalt.replace('href="#%s"' % kennung, 'href="#%s-%s"' % (route, kennung))
        inhalt = inhalt.replace('aria-controls="%s"' % kennung,
                                'aria-controls="%s-%s"' % (route, kennung))

    inhalt = inhalt.replace('<span id="jahr">', '<span data-jahr>')

    inhalt = re.sub(r'href="(index|speisekarte|kontakt|impressum|datenschutz)\.html#([^"]+)"',
                    r'href="#\2"', inhalt)
    for datei, ziel in DATEI_ZU_ROUTE.items():
        inhalt = inhalt.replace('href="%s"' % datei, 'href="%s"' % ziel)
    return inhalt


css = schrift_einbetten(lies("assets/css/fonts.css")) + "\n" + lies("assets/css/style.css")

vendor = "\n;\n".join(lies("assets/vendor/" + n) for n in
                     ["gsap.min.js", "ScrollTrigger.min.js", "lenis.min.js", "page-flip.browser.js"])

eigen = "\n;\n".join(lies("assets/js/" + n) for n in
                    ["app.js", "hours.js", "gelato.js", "book.js"])

abschnitte = [
    '<div class="vseite" data-seite="%s"%s>\n%s\n</div>'
    % (route, "" if route == "start" else " hidden", aufraeumen(koerper(lies(datei)), route))
    for route, datei, _t in SEITEN
]

# --------------------------------------------------------------------------
VORSCHAU_CSS = """
/* ---- Nur für die Vorschau, nicht Teil der Website ---- */
.vseite[hidden] { display: none; }

#vor-knopf {
  position: fixed; right: 12px; z-index: 9999;
  bottom: calc(4.9rem + env(safe-area-inset-bottom));
  min-width: 46px; height: 46px; padding: 0 14px; border-radius: 23px;
  background: #F7F6F3; color: #0B0B0B;
  border: none; cursor: pointer;
  font: 600 13px/1 'Instrument Sans', system-ui, sans-serif;
  letter-spacing: .04em;
  box-shadow: 0 6px 20px rgba(0,0,0,.5);
}
@media (min-width: 48rem) { #vor-knopf { bottom: 18px; } }

#vor-panel {
  position: fixed; inset: auto 8px calc(0.6rem + env(safe-area-inset-bottom)) 8px;
  z-index: 10000; max-width: 30rem; margin-inline: auto;
  max-height: 82vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
  background: #111110; color: #F7F6F3;
  border: 1px solid rgba(247,246,243,.3);
  border-radius: 14px; padding: 16px;
  box-shadow: 0 18px 50px rgba(0,0,0,.6);
  font: 400 14px/1.5 'Instrument Sans', system-ui, sans-serif;
}
#vor-panel[hidden] { display: none; }
#vor-panel h4 {
  font: 600 10px/1 'Instrument Sans', sans-serif;
  letter-spacing: .2em; text-transform: uppercase;
  color: #F7F6F3; margin: 18px 0 9px;
}
#vor-panel h4:first-of-type { margin-top: 4px; }
#vor-panel select, #vor-panel .vor-reihe {
  width: 100%; padding: 9px 10px; border-radius: 7px;
  background: #1E1E1D; color: #F7F6F3;
  border: 1px solid rgba(247,246,243,.28);
}
#vor-panel label.vor-schalter {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; margin-bottom: 6px; border-radius: 7px;
  background: #1E1E1D; border: 1px solid rgba(247,246,243,.22);
  cursor: pointer;
}
#vor-panel label.vor-schalter input { width: 18px; height: 18px; accent-color: #F7F6F3; flex: none; }
#vor-panel .vor-hint { display: block; font-size: 12px; color: #A6A4A0; margin-top: 2px; }

#vor-sorten { display: flex; flex-wrap: wrap; gap: 6px; }
#vor-sorten button {
  flex: 1 1 auto; padding: 7px 10px; border-radius: 100px; cursor: pointer;
  background: #1E1E1D; color: #F7F6F3; font-size: 12px;
  border: 1px solid rgba(247,246,243,.28);
}

#vor-liste { list-style: none; margin: 0; padding: 0; counter-reset: fn; }
#vor-liste li {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 9px 0; border-bottom: 1px solid rgba(247,246,243,.13);
}
#vor-liste li:last-child { border-bottom: 0; }
#vor-liste .vor-txt { flex: 1; min-width: 0; }
#vor-liste b { display: block; font-weight: 600; font-size: 13.5px; }
#vor-liste span { display: block; font-size: 12px; color: #A6A4A0; line-height: 1.4; }
#vor-liste button {
  flex: none; align-self: center;
  padding: 7px 13px; border-radius: 100px; cursor: pointer;
  background: #F7F6F3; color: #0B0B0B; border: none;
  font: 600 12px/1 'Instrument Sans', sans-serif;
}
#vor-panel .vor-zu {
  position: sticky; bottom: -16px; margin: 16px -16px -16px; padding: 13px;
  width: calc(100% + 32px);
  background: #111110; color: #F7F6F3; cursor: pointer;
  border: 0; border-top: 1px solid rgba(247,246,243,.22);
  font: 600 14px/1 'Instrument Sans', sans-serif;
}

/* Kurzes Aufblinken, damit man sieht, worum es gerade geht */
@keyframes vorBlitz {
  0%, 100% { outline-color: transparent; }
  25%, 75% { outline-color: #F7F6F3; }
}
.vor-blitz {
  outline: 3px solid transparent; outline-offset: 5px; border-radius: 4px;
  animation: vorBlitz 1.5s ease-in-out 2;
}
"""

# --------------------------------------------------------------------------
VORSCHAU_JS = r"""
/* ---- Nur für die Vorschau, nicht Teil der Website ------------------------
   Ersetzt die Dateiwechsel durch einen Umschalter innerhalb eines Dokuments
   und macht jede Funktion vorführbar — auch die, die auf einem Handy sonst
   gar nicht erscheinen.
   ----------------------------------------------------------------------- */
(function () {
  var seiten = document.querySelectorAll('.vseite');

  function seiteZeigen(name, ziel) {
    for (var i = 0; i < seiten.length; i++) {
      seiten[i].hidden = seiten[i].getAttribute('data-seite') !== name;
    }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    if (name === 'karte' && window.__buecherNeu) window.__buecherNeu();

    if (ziel && ziel.scrollIntoView) {
      setTimeout(function () { ziel.scrollIntoView({ block: 'start' }); }, 60);
    } else {
      window.scrollTo(0, 0);
      if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    }
  }

  function route() {
    var h = (location.hash || '').replace(/^#/, '') || 'start';
    var alsSeite = document.querySelector('.vseite[data-seite="' + h + '"]');
    if (alsSeite) return seiteZeigen(h, null);
    var el = document.getElementById(h);
    if (el) {
      var s = el.closest('.vseite');
      return seiteZeigen(s ? s.getAttribute('data-seite') : 'start', el);
    }
    seiteZeigen('start', null);
  }
  window.addEventListener('hashchange', route);
  route();

  var j = document.querySelectorAll('[data-jahr]');
  for (var k = 0; k < j.length; k++) j[k].textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ */
  var knopf = document.getElementById('vor-knopf');
  var panel = document.getElementById('vor-panel');
  knopf.addEventListener('click', function () { panel.hidden = !panel.hidden; });
  panel.querySelector('.vor-zu').addEventListener('click', function () { panel.hidden = true; });

  function seiteA(name) {
    var akt = document.querySelector('.vseite[data-seite="' + name + '"]');
    if (akt && akt.hidden) { seiteZeigen(name, null); return true; }
    return false;
  }
  function inSeite(name, wahl) {
    return document.querySelector('.vseite[data-seite="' + name + '"] ' + wahl);
  }
  function hin(el, blitz) {
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    if (blitz !== false) {
      el.classList.remove('vor-blitz');
      void el.offsetWidth;
      el.classList.add('vor-blitz');
    }
  }

  /* ---- Schalter ---- */
  var chSaison = document.getElementById('vor-saison');
  chSaison.addEventListener('change', function () {
    var b = inSeite('start', '[data-saison]');
    if (!b) return;
    b.hidden = !chSaison.checked;
    if (chSaison.checked) { panel.hidden = true; seiteA('start'); hin(b); }
  });

  /* ---- Öffnungsstatus zu anderer Zeit ---- */
  function naechster(wochentag, stunde, minute) {
    var d = new Date();
    d.setHours(stunde, minute, 0, 0);
    while (d.getDay() !== wochentag || d < new Date()) {
      d.setDate(d.getDate() + 1);
      d.setHours(stunde, minute, 0, 0);
    }
    return d.toISOString();
  }
  document.getElementById('vor-zeit').addEventListener('change', function (e) {
    var v = e.target.value;
    window.__zeitBasis = v ? naechster(+v.split(',')[0], +v.split(',')[1], +v.split(',')[2]) : null;
    if (window.__statusNeu) window.__statusNeu();
    var s = document.querySelector('.vseite:not([hidden]) [data-status]');
    if (s) hin(s);
  });

  /* ---- Eissorten von Hand durchschalten ---- */
  var sortenBox = document.getElementById('vor-sorten');

  function sorteWaehlen(i, manuell) {
    panel.hidden = true;
    window.__eisManuell = manuell;
    seiteA('start');
    setTimeout(function () {
      if (manuell && window.__eisSetzen) window.__eisSetzen(i);
      hin(inSeite('start', '[data-eis]'), false);
    }, 120);
  }

  var auto = document.createElement('button');
  auto.type = 'button'; auto.textContent = 'Automatisch';
  auto.title = 'Farbe folgt wieder dem Scrollen';
  auto.addEventListener('click', function () { sorteWaehlen(0, false); });
  sortenBox.appendChild(auto);

  (window.__eisSorten || []).forEach(function (name, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = name;
    b.addEventListener('click', function () { sorteWaehlen(i, true); });
    sortenBox.appendChild(b);
  });

  /* ---- Geführte Liste aller Funktionen ---- */
  var AKTIONEN = {
    status: function () { hin(inSeite('start', '[data-status]')); },
    abschnitt: null,

    buch: function () {
      hin(inSeite('karte', '.buch-buehne'), false);
    },
    reiter: function (ziel) {
      var t = inSeite('karte', '[role="tab"][data-ziel="' + ziel + '"]');
      if (t) { t.click(); setTimeout(function () { hin(t); }, 200); }
    },
    getraenke: function () {
      var s = document.getElementById('getraenke');
      if (s) hin(s, false);
    },
    legende: function () {
      var d = inSeite('karte', '.legende');
      if (d) { d.open = true; hin(d); }
    },
    kennz: function () {
      var b = inSeite('karte', '.kennz');
      if (b) { hin(b); }
    },
    strasse: function () { hin(inSeite('start', '.strasse')); },
    ruf: function () { hin(document.querySelector('.vseite:not([hidden]) .ruf-leiste'), true); },

    dienstag: function () {
      var d = document.getElementById('f-datum');
      if (!d) return;
      var x = new Date();
      while (x.getDay() !== 2) x.setDate(x.getDate() + 1);
      d.value = x.toISOString().slice(0, 10);
      var n = document.getElementById('f-name'); if (n && !n.value) n.value = 'Max Mustermann';
      var z = document.getElementById('f-zeit'); if (z && !z.value) z.value = '18:30';
      document.getElementById('tisch-form')
        .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      setTimeout(function () { hin(document.getElementById('f-fehler')); }, 120);
    }
  };

  var FUNKTIONEN = [
    ['Live-Öffnungsstatus', 'Zeigt ohne Scrollen, ob gerade offen ist. Mit der Zeitauswahl oben lassen sich alle fünf Zustände ansehen.', 'start', 'status'],
    ['Willkommen — die Familie', 'Der emotionale Kern: Gäste als Freunde der Familie.', 'willkommen', null],
    ['Die Küche', 'Vier Bereiche: Antipasti, Pasta, Pizza, Fleisch und Fisch.', 'kueche', null],
    ['Das Eis — Farbwechsel', 'Der helle Bruch. Beim Scrollen wechselt die Fläche durch die Sortenfarben und färbt Navigation und Anruf-Knopf mit.', 'eis', null],
    ['Straßenverkauf', 'Eigener Block für Eis zum Mitnehmen — das Alleinstellungsmerkmal.', 'eis', 'strasse'],
    ['Mittagskarte', 'Kurzer Block für Mittagsgäste.', 'mittag', null],
    ['Anlässe', 'Feiern, Dinner for Two, Catering.', 'anlaesse', null],
    ['Bewertung und Öffnungszeiten', '4,8 aus 289 Bewertungen, dazu die Wochentabelle — der heutige Tag wird hervorgehoben.', 'zeiten', null],
    ['Schwester-Restaurants', 'Akropolis in Rochlitz und Paros in Penig.', 'familie', null],
    ['Speisekarte als Buch', 'Das Schaustück — sofort da, ohne Knopfdruck. Hochkant als Einzelseite, quer als Doppelseite. Wischen oder die Pfeilknöpfe benutzen.', 'karte', 'buch'],
    ['Reiter: Mittagskarte', 'Umschalten auf die zweite Karte (noch Platzhalter).', 'karte', 'reiter:mittag'],
    ['Reiter: Eis-Karte', 'Umschalten auf die dritte Karte (noch Platzhalter).', 'karte', 'reiter:eis'],
    ['Zweites Buch: Getränke', 'Eigenes Buch, damit man für die Weinkarte nicht durch 60 Speisen blättert.', 'getraenke', 'getraenke'],
    ['Allergen-Kennzeichen', 'Die Hochzahlen am Gericht — antippen zeigt den Klartext.', 'karte', 'kennz'],
    ['Allergen-Legende', 'Vollständige Legende, aufklappbar.', 'karte', 'legende'],
    ['Tischanfrage', 'Formular, das eine fertige E-Mail öffnet. Kein Server, keine Datenübertragung.', 'tisch', null],
    ['Dienstag wird abgefangen', 'Trägt einen Dienstag ein und sendet ab — das Formular weist auf den Ruhetag hin.', 'tisch', 'dienstag'],
    ['Anfahrt ohne Google Maps', 'Bewusst keine eingebettete Karte; der Link lädt erst auf Klick.', 'kontakt', null],
    ['Anruf-Leiste', 'Dauerhaft in Daumenreichweite. Nimmt die Eissorten-Farbe mit.', 'start', 'ruf'],
    ['Impressum', 'Gerüst mit Prüfhinweis.', 'impressum', null],
    ['Datenschutz', 'Gerüst; beschreibt die tatsächlich eingesetzte Technik.', 'datenschutz', null]
  ];

  var liste = document.getElementById('vor-liste');
  FUNKTIONEN.forEach(function (f) {
    var li = document.createElement('li');
    var txt = document.createElement('div');
    txt.className = 'vor-txt';
    txt.innerHTML = '<b></b><span></span>';
    txt.querySelector('b').textContent = f[0];
    txt.querySelector('span').textContent = f[1];
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Zeigen';
    b.addEventListener('click', function () {
      panel.hidden = true;
      location.hash = '#' + f[2];
      route();
      setTimeout(function () {
        if (!f[3]) return;
        var teile = String(f[3]).split(':');
        var fn = AKTIONEN[teile[0]];
        if (fn) fn(teile[1]);
      }, 420);
    });
    li.appendChild(txt); li.appendChild(b);
    liste.appendChild(li);
  });

  /* Hinweis, falls das Gerät „Bewegung reduzieren" gesetzt hat — die
     Vorschau schaltet die Animationen bewusst trotzdem ein. */
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.getElementById('vor-bewegung').hidden = false;
  }
})();
"""

# --------------------------------------------------------------------------
PANEL = """
<button id="vor-knopf" aria-label="Funktionen anzeigen">Funktionen</button>

<div id="vor-panel" hidden role="dialog" aria-label="Vorschau-Bedienfeld">

  <h4>Sichtbar machen</h4>
  <label class="vor-schalter">
    <input type="checkbox" id="vor-saison">
    <span>Saison-Band einblenden
      <span class="vor-hint">Steht auf der echten Seite standardmäßig aus.</span></span>
  </label>
  <p id="vor-bewegung" class="vor-hint" hidden style="margin:8px 2px 0">
    Ihr Gerät hat „Bewegung reduzieren“ eingeschaltet. Die Vorschau zeigt die
    Animationen trotzdem, damit Sie alles sehen — die echte Seite würde sie
    respektieren und ruhig bleiben.
  </p>

  <h4>Öffnungsstatus</h4>
  <select id="vor-zeit" aria-label="Zeitpunkt für den Öffnungsstatus">
    <option value="">Jetzt — echte Uhrzeit</option>
    <option value="2,14,0">Dienstag 14:00 — Ruhetag</option>
    <option value="0,10,30">Sonntag 10:30 — öffnet in 30 Minuten</option>
    <option value="0,12,0">Sonntag 12:00 — geöffnet</option>
    <option value="1,20,30">Montag 20:30 — schließt in 30 Minuten</option>
    <option value="1,21,30">Montag 21:30 — zu, öffnet Mittwoch</option>
  </select>

  <h4>Eissorte von Hand</h4>
  <div id="vor-sorten"></div>

  <h4>Alle Funktionen der Reihe nach</h4>
  <ul id="vor-liste"></ul>

  <button class="vor-zu">Schließen</button>
</div>
"""

DOKUMENT = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>La Bontà — Vorschau</title>
<meta name="theme-color" content="#0B0B0B">
<meta name="apple-mobile-web-app-title" content="La Bontà">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%%3E%%3Crect width='32' height='32' rx='6' fill='%%230B0B0B'/%%3E%%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='19' font-weight='700' fill='%%23F7F6F3' text-anchor='middle'%%3EB%%3C/text%%3E%%3C/svg%%3E">
<style>
%(css)s
%(vorschau_css)s
</style>
</head>
<body>

%(abschnitte)s

%(panel)s

<script>
/* Die Vorschau soll alles zeigen — auch auf einem Gerät, das
   „Bewegung reduzieren" gesetzt hat. Muss vor app.js stehen. */
window.__bewegungErzwingen = true;
</script>
<script>
%(vendor)s
</script>
<script>
%(eigen)s
</script>
<script>
/* Aus den Einzelseiten herausgelöste Skripte, einmal zentral ausgeführt
   (z. B. die Logik der Tischanfrage). */
%(seitenskripte)s
</script>
<script>
%(vorschau_js)s
</script>
</body>
</html>
"""

ausgabe = DOKUMENT % {
    "css": css,
    "vorschau_css": VORSCHAU_CSS,
    "abschnitte": "\n\n".join(abschnitte),
    "panel": PANEL,
    "vendor": vendor,
    "eigen": eigen,
    "vorschau_js": VORSCHAU_JS,
    "seitenskripte": "\n;\n".join(EINGESAMMELT),
}

ziel = WURZEL / "LA-BONTA-Vorschau.html"
ziel.write_text(ausgabe, encoding="utf-8")
print("geschrieben: %s  (%.1f KB)" % (ziel.name, len(ausgabe.encode("utf-8")) / 1024))

# --------------------------------------------------------------------------
# Zweite Fassung: als Artefakt-Seite zum Veröffentlichen.
# Beim Veröffentlichen werden <!doctype>, <html>, <head> und <body> ergänzt —
# deshalb darf diese Fassung kein eigenes Grundgerüst mitbringen.
# Gedacht für iOS: Die Datei-Vorschau in „Dateien" führt kein JavaScript aus,
# eine echte Adresse in Safari dagegen schon.
# --------------------------------------------------------------------------
ARTEFAKT = """<title>La Bontà Rochlitz — Vorschau</title>
<style>
%(css)s
%(vorschau_css)s
</style>

%(abschnitte)s

%(panel)s

<script>
window.__bewegungErzwingen = true;
</script>
<script>
%(vendor)s
</script>
<script>
%(eigen)s
</script>
<script>
%(seitenskripte)s
</script>
<script>
%(vorschau_js)s
</script>
"""

werte = {
    "css": css,
    "vorschau_css": VORSCHAU_CSS,
    "abschnitte": "\n\n".join(abschnitte),
    "panel": PANEL,
    "vendor": vendor,
    "eigen": eigen,
    "vorschau_js": VORSCHAU_JS,
    "seitenskripte": "\n;\n".join(EINGESAMMELT),
}

ziel2 = WURZEL / "bauen" / "vorschau-artefakt.html"
ziel2.write_text(ARTEFAKT % werte, encoding="utf-8")
print("geschrieben: %s  (%.1f KB)" % (ziel2.name, len((ARTEFAKT % werte).encode("utf-8")) / 1024))
