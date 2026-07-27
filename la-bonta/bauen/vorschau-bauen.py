#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Baut aus der fertigen Website EINE eigenständige HTML-Datei für die Vorschau
auf dem Handy — ohne Server, ohne Internet, ohne Begleitdateien.

Alles wandert hinein: beide Schriften als Base64, GSAP, Lenis, StPageFlip,
sämtliches CSS und alle fünf Seiten. Statt echter Dateiwechsel gibt es einen
kleinen Umschalter, der immer nur eine Seite zeigt.

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
    """Ersetzt die Schrift-Verweise durch eingebettete Base64-Daten."""
    def ersetze(m):
        name = m.group(1)
        roh = (WURZEL / "assets" / "fonts" / name).read_bytes()
        b64 = base64.b64encode(roh).decode("ascii")
        return "url('data:font/woff2;base64,%s')" % b64
    return re.sub(r"url\('\.\./fonts/([^']+)'\)", ersetze, css)


def koerper(html):
    """Holt den Inhalt zwischen <body> und </body>."""
    m = re.search(r"<body[^>]*>(.*)</body>", html, re.S)
    return m.group(1)


def aufraeumen(inhalt, route):
    """Bereitet den Seiteninhalt für das gemeinsame Dokument auf."""

    # Inline-Skripte entfernen — sie werden zentral neu gesetzt, damit sie
    # nicht fünfmal gegen dieselben Bezeichner laufen.
    inhalt = re.sub(r"<script(?![^>]*\bsrc=)[^>]*>.*?</script>", "", inhalt, flags=re.S)
    # Skripte mit src ebenfalls raus, die kommen einmal zentral.
    inhalt = re.sub(r"<script[^>]*\bsrc=[^>]*>\s*</script>", "", inhalt)

    # Bezeichner, die auf mehreren Seiten vorkommen, pro Seite eindeutig machen.
    for kennung in ("inhalt", "nav-mobil"):
        inhalt = inhalt.replace('id="%s"' % kennung, 'id="%s-%s"' % (route, kennung))
        inhalt = inhalt.replace('href="#%s"' % kennung, 'href="#%s-%s"' % (route, kennung))
        inhalt = inhalt.replace('aria-controls="%s"' % kennung,
                                'aria-controls="%s-%s"' % (route, kennung))

    # Jahreszahl: aus der Bezeichner-Logik in ein Datenattribut überführen,
    # damit ein einziges Skript alle fünf Fußzeilen bedienen kann.
    inhalt = inhalt.replace('<span id="jahr">', '<span data-jahr>')

    # Dateiverweise in Routen umschreiben. Längere Formen zuerst, damit
    # "index.html#eis" nicht vorzeitig von "index.html" getroffen wird.
    inhalt = re.sub(r'href="(index|speisekarte|kontakt|impressum|datenschutz)\.html#([^"]+)"',
                    r'href="#\2"', inhalt)
    for datei, ziel in DATEI_ZU_ROUTE.items():
        inhalt = inhalt.replace('href="%s"' % datei, 'href="%s"' % ziel)

    return inhalt


# --------------------------------------------------------------------------
# Bausteine einsammeln
# --------------------------------------------------------------------------
css = schrift_einbetten(lies("assets/css/fonts.css")) + "\n" + lies("assets/css/style.css")

vendor = "\n;\n".join(lies("assets/vendor/" + n) for n in
                     ["gsap.min.js", "ScrollTrigger.min.js", "lenis.min.js", "page-flip.browser.js"])

eigen = "\n;\n".join(lies("assets/js/" + n) for n in
                    ["app.js", "hours.js", "gelato.js", "book.js"])

abschnitte = []
for route, datei, _titel in SEITEN:
    abschnitte.append(
        '<div class="vseite" data-seite="%s"%s>\n%s\n</div>'
        % (route, "" if route == "start" else " hidden", aufraeumen(koerper(lies(datei)), route))
    )

VORSCHAU_CSS = """
/* ---- Nur für die Vorschau, nicht Teil der Website ---- */
.vseite[hidden] { display: none; }

#vor-knopf {
  position: fixed; right: 14px; z-index: 9999;
  bottom: calc(4.9rem + env(safe-area-inset-bottom));
  width: 46px; height: 46px; border-radius: 50%;
  background: #14383C; color: #F4EDE0;
  border: 1px solid rgba(244,237,224,.45);
  font-size: 19px; line-height: 1; cursor: pointer;
  box-shadow: 0 6px 20px rgba(0,0,0,.45);
}
@media (min-width: 48rem) { #vor-knopf { bottom: 18px; } }

#vor-panel {
  position: fixed; left: 12px; right: 12px; z-index: 9999;
  bottom: calc(8.4rem + env(safe-area-inset-bottom));
  max-width: 30rem; margin-inline: auto;
  background: #0F2B2E; color: #F4EDE0;
  border: 1px solid rgba(244,237,224,.28);
  border-radius: 12px; padding: 16px;
  box-shadow: 0 14px 44px rgba(0,0,0,.55);
  font: 400 14px/1.55 'Instrument Sans', system-ui, sans-serif;
}
@media (min-width: 48rem) { #vor-panel { bottom: 78px; } }
#vor-panel[hidden] { display: none; }
#vor-panel h4 {
  font: 600 11px/1 'Instrument Sans', sans-serif;
  letter-spacing: .18em; text-transform: uppercase;
  color: #A8C66C; margin: 0 0 10px;
}
#vor-panel select {
  width: 100%; margin-top: 6px; padding: 9px 10px;
  background: #14383C; color: #F4EDE0;
  border: 1px solid rgba(244,237,224,.3); border-radius: 6px;
}
#vor-panel p { margin: 12px 0 0; color: #C5BCA9; font-size: 13px; }
#vor-panel .vor-zu {
  margin-top: 14px; width: 100%; padding: 9px;
  background: none; color: #F4EDE0; cursor: pointer;
  border: 1px solid rgba(244,237,224,.3); border-radius: 100px;
}
"""

VORSCHAU_JS = """
/* ---- Nur für die Vorschau, nicht Teil der Website ------------------------
   Ersetzt die Dateiwechsel durch einen Umschalter innerhalb eines Dokuments
   und bietet eine Zeitvorgabe, damit sich auch der Dienstag-Ruhetag prüfen
   lässt, ohne bis Dienstag zu warten.
   ----------------------------------------------------------------------- */
(function () {
  var seiten = document.querySelectorAll('.vseite');

  function seiteZeigen(name, ziel) {
    for (var i = 0; i < seiten.length; i++) {
      seiten[i].hidden = seiten[i].getAttribute('data-seite') !== name;
    }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    /* Das Buch braucht echte Maße — die gibt es erst, wenn die Karte
       tatsächlich sichtbar ist. */
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

  /* Jahreszahl in allen Fußzeilen */
  var j = document.querySelectorAll('[data-jahr]');
  for (var k = 0; k < j.length; k++) j[k].textContent = new Date().getFullYear();

  /* ---- Bedienfeld ---- */
  var knopf = document.getElementById('vor-knopf');
  var panel = document.getElementById('vor-panel');
  knopf.addEventListener('click', function () { panel.hidden = !panel.hidden; });
  panel.querySelector('.vor-zu').addEventListener('click', function () { panel.hidden = true; });

  /* Nächsten Wochentag ab heute finden (0 = Sonntag) */
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
    if (!v) { window.__zeitBasis = null; }
    else {
      var t = v.split(',');
      window.__zeitBasis = naechster(+t[0], +t[1], +t[2]);
    }
    if (window.__statusNeu) window.__statusNeu();
  });
})();
"""

PANEL = """
<button id="vor-knopf" aria-label="Vorschau-Einstellungen" title="Vorschau-Einstellungen">⚙</button>
<div id="vor-panel" hidden>
  <h4>Vorschau</h4>

  <label for="vor-zeit">Öffnungsstatus zu einer anderen Zeit ansehen</label>
  <select id="vor-zeit">
    <option value="">Jetzt (echte Uhrzeit)</option>
    <option value="2,14,0">Dienstag 14:00 — Ruhetag</option>
    <option value="0,10,30">Sonntag 10:30 — öffnet in 30 Minuten</option>
    <option value="0,12,0">Sonntag 12:00 — geöffnet</option>
    <option value="1,20,30">Montag 20:30 — schließt in 30 Minuten</option>
    <option value="1,21,30">Montag 21:30 — zu, öffnet Mittwoch</option>
  </select>

  <p><strong>Das Buch:</strong> Drehen Sie das Gerät quer. Unter 760 Pixel
  Breite zeigt die Karte bewusst die Liste — hochkant auf dem Handy ist
  Blättern unbrauchbar.</p>

  <p><strong>Anrufen und E-Mail</strong> funktionieren aus dieser Datei heraus
  wie auf der echten Seite.</p>

  <button class="vor-zu">Schließen</button>
</div>
"""

DOKUMENT = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>La Bontà — Vorschau</title>
<meta name="theme-color" content="#0F2B2E">
<meta name="apple-mobile-web-app-title" content="La Bontà">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%%3E%%3Crect width='32' height='32' rx='6' fill='%%230F2B2E'/%%3E%%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='19' font-weight='700' fill='%%23A8C66C' text-anchor='middle'%%3EB%%3C/text%%3E%%3C/svg%%3E">
<style>
%(css)s
%(vorschau_css)s
</style>
</head>
<body>

%(abschnitte)s

%(panel)s

<script>
%(vendor)s
</script>
<script>
%(eigen)s
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
}

ziel = WURZEL / "LA-BONTA-Vorschau.html"
ziel.write_text(ausgabe, encoding="utf-8")
print("geschrieben: %s  (%.1f KB)" % (ziel.name, len(ausgabe.encode("utf-8")) / 1024))
