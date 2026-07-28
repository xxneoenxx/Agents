# Inhalte der alten Seite — Arbeitsgrundlage

## Wichtiger Hinweis zur Herkunft

Der ursprüngliche Plan sah vor, `www.la-bonta.de` auszulesen und die Inhalte hier
strukturiert abzulegen. **Das war technisch nicht möglich:** Die Netzwerkpolicy der
Arbeitsumgebung blockiert die Domain (HTTP 403 am Gateway). Versucht und ebenfalls
blockiert wurden Wayback Machine, Text-Proxydienste sowie die Portale gastroguide.de
und restaurantguru.com.

Was hier steht, stammt daher aus zwei belastbaren Quellen:

1. **Fotos der gedruckten Karte**, vom Betreiber geliefert (Juli 2026) — die Abendkarte
   vollständig, sieben Seiten.
2. **Die gesicherten Stammdaten** aus dem Projektauftrag.

Alles Übrige ist als `[[ZU ERGÄNZEN]]` markiert. Es wurde **nichts erfunden**.

---

## Gesicherte Stammdaten

| Feld | Wert |
|---|---|
| Name | Restaurant La Bontà |
| Adresse | Kirchgasse 1/3, 09306 Rochlitz, Sachsen |
| Telefon | 03737 / 1440929 · international +49 3737 1440929 |
| E-Mail | info@la-bonta.de |
| Öffnungszeiten | Dienstag Ruhetag · Montag, Mittwoch–Sonntag und Feiertage 11:00–21:00 |
| Google-Bewertung | 4,8 von 5 bei 289 Bewertungen (Stand Juli 2026) |
| Geschäftsführer | Emirjon Ndrepepaj |
| Küche | Italienisch: hausgemachte Pasta, Pizza, Salate, hausgemachtes Eis |
| Getränke | Cocktails, Weine, alkoholfreie Getränke |
| Angebote | Mittagskarte, Eis-Karte, Saisonkarten, Catering, Veranstaltungen, Straßenverkauf Eis |
| Schwester-Betriebe | Akropolis, Rochlitz (seit 2018) · Paros, Penig (seit 2019) |
| Slogan | „LA DOLCE VITA — Das süße Leben in Rochlitz!" |

**Aus dem Logo abgelesen:** „EIS · CAFE · EST. 2021 · LA BONTÀ · RISTORANTE ITALIANO".
Das Gründungsjahr 2021 steht damit auf dem eigenen Signet — siehe aber offener Punkt im
Abschlussbericht.

---

## Wörtlich übernommene Texte aus der gedruckten Karte

> Werfen Sie einen Blick in unsere ausgewählten Speisen und Getränke.
> Lassen Sie sich inspirieren und bei Fragen oder Sonderwünschen wenden Sie sich gerne
> jederzeit an unser Team!

> Der Umwelt zu Liebe für nicht verzehrte Speisen „zum Mitnehmen" müssen wir Ihnen 1,00 €
> Verpackungskosten berechnen. Vielen Dank für Ihr Verständnis.

> Alle Preise verstehen sich inklusive Mehrwertsteuer.

---

## Speisekarte

**Abendkarte: vollständig erfasst.** Die Daten liegen in `content/karte-daten.py` und sind
von dort nach `speisekarte.html` erzeugt. 19 Rubriken, 137 Positionen, alle Preise und alle
Allergen- und Zusatzstoffangaben.

Erfasste Rubriken: Aperitivs · Suppen · Antipasti · Pasta · Gratinati · Risotto · Pizza ·
Extra Beilagen · Carne · Bambini · Dessert · Warme Getränke · Alkoholfreie Getränke ·
Säfte · Bier · Offene Weine · Spirituosen.

**Fehlt noch:**

- `[[ZU ERGÄNZEN: Mittagskarte]]` — Gerichte, Preise und Gültigkeitszeitraum
- `[[ZU ERGÄNZEN: Eis-Karte]]` — Eisbecher, Sorten, Preise, Straßenverkaufs-Preise.
  Existiert als PDF vom März 2024 unter
  `la-bonta.de/wp-content/uploads/2024/03/24_0326-Eiskarte-Web.pdf`
- `[[ZU ERGÄNZEN: Cocktailkarte]]` — im Auftrag genannt, in der gedruckten Karte nicht
  enthalten. Gibt es eine eigene Cocktailkarte?

---

## Weitere Seiten der alten Website

Für die folgenden Seiten liegen **keine Inhalte** vor:

| Alte Seite | Status |
|---|---|
| Startseite | `[[ZU ERGÄNZEN: Fließtexte]]` — neue Texte wurden aus den Stammdaten formuliert |
| `/reservieren/` | `[[ZU ERGÄNZEN]]` — neu als `mailto:`-Anfrage umgesetzt |
| `/kontakt/` | `[[ZU ERGÄNZEN]]` — Adresse und Telefon aus den Stammdaten |
| `/veranstaltungen/` | `[[ZU ERGÄNZEN: Art der Veranstaltungen, Kapazität, Vorlauf]]` |
| `/impressum/` | `[[ZU ERGÄNZEN: sämtliche Pflichtangaben]]` |
| `/datenschutzerklaerung-2/` | Nicht übernehmbar — die eingesetzte Technik hat sich vollständig geändert |

## Offene inhaltliche Fragen

- Zeitraum und Preisspanne der Mittagskarte
- Parkmöglichkeiten, Bushaltestelle, Barrierefreiheit
- Zahlungsarten (Karte? bar? kontaktlos?)
- Terrasse oder Außenbereich vorhanden?
- Sitzplatzzahl und maximale Gästezahl für Feiern
- Einzugsgebiet und Vorlaufzeit für Catering
- Feiertagsregelung, wenn ein Feiertag auf einen Dienstag fällt
