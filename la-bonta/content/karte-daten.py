#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt die Listenansicht der Speisekarte für speisekarte.html.

Diese Datei ist ein reines Autorenwerkzeug — die Website braucht sie NICHT.
Sie liegt hier, damit Änderungen an der Karte nicht von Hand im HTML gemacht
werden müssen, was bei Allergen- und Zusatzstoffangaben fehleranfällig wäre.

Aufruf:
    python3 content/karte-daten.py > /tmp/karte.html
und den Ausgabeblock in speisekarte.html zwischen die Marker einsetzen.

Datenstand: Abendkarte laut Fotos der gedruckten Karte, Juli 2026.
Nummernlücken (21–29, 37, 42, 53–58, 68, 76–79, 85–88, 90–99, 105–109)
sind so in der Originalkarte vorhanden und bleiben erhalten.
"""

import html

# ---------------------------------------------------------------------------
# Legenden — wortgleich von der gedruckten Karte übernommen (LMIV-Pflichtangaben)
# ---------------------------------------------------------------------------
ZUSATZSTOFFE = {
    "1": "Farbstoff", "2": "Konservierungsstoffe", "3": "Antioxidationsmittel",
    "4": "Geschmacksverstärker", "5": "geschwefelt", "6": "geschwärzt",
    "7": "Phosphat", "8": "Milcheiweiß", "9": "coffeinhaltig",
    "10": "chininhaltig", "11": "Süßungsmittel",
}

ALLERGENE = {
    "A": "Glutenhaltig", "B": "Krebstiere", "C": "Eier / Eierzeugnisse",
    "D": "Fisch- und Erzeugnisse", "E": "Erdnüsse / Erzeugnisse",
    "F": "Soja / Erzeugnisse", "G": "Milch / Erzeugnisse", "H": "Schalenobst",
    "I": "Sellerie / Erzeugnisse", "J": "Senf / Erzeugnisse", "K": "Sesam",
    "L": "Schwefeloxid / Sulfide", "M": "Lupine", "N": "Weichtiere",
}

# In der gedruckten Karte verwendet, aber in KEINER der beiden Legenden
# erklärt. Wird als solches gekennzeichnet, statt es stillschweigend zu
# unterschlagen oder zu erraten. Siehe ABSCHLUSSBERICHT.md.
UNGEKLAERT = {"O", "P", "R"}


def kennz(codes):
    """Rendert die Hochzahlen als anklickbare Kennzeichen mit Klartext."""
    if not codes:
        return ""
    teile = []
    for c in codes.split(","):
        c = c.strip()
        if c in ALLERGENE:
            titel = "Allergen %s: %s" % (c, ALLERGENE[c])
        elif c in ZUSATZSTOFFE:
            titel = "Zusatzstoff %s: %s" % (c, ZUSATZSTOFFE[c])
        elif c in UNGEKLAERT:
            titel = "Kennzeichen %s — in der Legende der Karte nicht erklärt" % c
        else:
            titel = "Kennzeichen %s" % c
        teile.append(
            '<button type="button" class="kennz" title="%s" '
            'aria-label="%s">%s</button>' % (html.escape(titel), html.escape(titel), c)
        )
    return "<sup>" + ",".join(teile) + "</sup>"


def gericht(nr, name, preis, codes="", text="", menge=""):
    return {"nr": nr, "name": name, "preis": preis,
            "codes": codes, "text": text, "menge": menge}


# ---------------------------------------------------------------------------
# ABENDKARTE
# ---------------------------------------------------------------------------
ABEND = [
 ("Aperitivs", "", [
    gericht("1", "Prosecco", "4,50 €", "5,O", menge="0,1 l"),
    gericht("2", "Martini bianco", "4,50 €", "5", menge="5 cl"),
    gericht("3", "Martini Rosso", "4,50 €", "5", menge="5 cl"),
    gericht("4", "Campari Orange", "6,90 €", "1", menge="0,2 l"),
    gericht("5", "Aperol Spritz", "7,50 €", "1,5,O"),
 ]),
 ("Suppen", "", [
    gericht("", "Tagessuppe", "6,90 €", "",
            "Bitte fragen Sie unser Personal nach unserem Tagesangebot"),
 ]),
 ("Antipasti — Vorspeisen", "", [
    gericht("6", "Antipasto Mista", "15,90 €", "B,D,G", "Gemischter Vorspeisenteller"),
    gericht("7", "Mozzarella Caprese", "12,50 €", "G", "Buffalo-Mozzarella mit Tomaten und Basilikum"),
    gericht("8", "Mozzarella alla Griglia", "13,90 €", "G,5,9", "gegrillter Mozzarella mit Parmaschinken, Tomaten und Rucola"),
    gericht("9", "Vitello Tonnato", "11,90 €", "D,G", "hauchdünner Kalbsrücken in würziger Thunfischsauce"),
    gericht("10", "Prosciutto e Melone", "10,90 €", "5,9", "Parmaschinken mit Melone"),
    gericht("11", "Insalata Mista", "7,50 €", "", "gemischter Salat"),
    gericht("12", "Insalata Rustica", "12,90 €", "", "gemischter Salat mit Hähnchenbruststreifen, Champignons und Zwiebeln"),
    gericht("13", "Insalata Rucola", "8,90 €", "G", "Rucola, Tomaten und Parmesan"),
    gericht("14", "Insalata Capriccioso", "13,50 €", "C,D,G,2,3", "Gemischter Salat mit Vorderschinken, Käse, Thunfisch und Ei"),
    gericht("15", "Insalata La Bonta", "15,50 €", "G", "Gemischter Salat mit Rinderfiletspitzen und Parmesan"),
    gericht("16", "Bruschetta Classico", "6,50 €", "A", "mit frischen Tomaten, Knoblauch und Basilikum"),
    gericht("17", "Bruschetta Caprese", "7,30 €", "A,G", "mit frischen Tomaten, Mozzarella und Basilikum"),
    gericht("18", "Bruschetta Tonno", "7,70 €", "A,D", "mit frischen Tomaten, Thunfisch, Kapern und Zwiebeln"),
    gericht("19", "Bruschetta Salmone", "8,90 €", "A,D", "mit frischen Tomaten, Räucherlachs und Rucola"),
    gericht("20", "Bruschetta Mix", "9,50 €", "A,D,G", "ein Mix aus Bruschetta Caprese, Tonno und Salmone"),
 ]),
 ("Pasta — Nudeln", "", [
    gericht("30", "Spaghetti Napoli", "9,90 €", "A,L", "mit Tomaten und Basilikum"),
    gericht("31", "Spaghetti Bolognese", "10,90 €", "A,L", "mit Hackfleischsauce"),
    gericht("32", "Spaghetti Aglio e Olio", "9,90 €", "A", "mit Olivenöl, Knoblauch und scharfer Peperoni"),
    gericht("33", "Spaghetti Frutti di Mare", "15,90 €", "A,B,D,R", "mit Meeresfrüchten und Knoblauch in Tomatensauce"),
    gericht("34", "Spaghetti Carbonara", "13,40 €", "A,C,G,2,3", "mit Speck, Ei, Parmesan und Sahnesauce"),
    gericht("35", "Spaghetti con Tartufo", "16,90 €", "A,G", "mit Rinderfiletspitzen und Trüffelcreme-Sahnesauce"),
    gericht("36", "Linguine Scampi e Rucola", "16,50 €", "A,B,G,P", "Schrimps in Tomatensauce und frischem Rucola"),
    gericht("38", "Linguine Fileto", "17,90 €", "A,G", "mit Rinderfiletspitzen und Steinpilzen in Bratensahnesauce"),
    gericht("39", "Tagliatelle Amore", "14,90 €", "A,G,2,3", "mit Schinken und Champignons in Gorgonzolasahnesauce"),
    gericht("40", "Tagliatelle Salmone", "16,90 €", "A,D,G", "mit Lachs und Knoblauch in Tomatensauce"),
    gericht("41", "Ravioli", "15,90 €", "A,G", "in Trüffelcreme-Sahnesauce"),
    gericht("43", "Gnocchi Spinacci al Gorgonzola", "15,90 €", "G", "Kartoffelklößchen in edlem Gorgonzola-Käserahm mit Spinat"),
    gericht("44", "Gnocchi Sorentina", "13,90 €", "G", "Kartoffelklößchen mit frischem Mozzarella in Tomatensauce"),
    gericht("45", "Penne Arrabiata", "10,90 €", "A,L", "mit Knoblauch in pikanter Tomatensauce"),
    gericht("46", "Penne Quattro Formaggi", "14,20 €", "A,G", "mit vier verschiedenen Käsesorten in Sahnesauce"),
    gericht("47", "Penne Spinacci Gorgonzola", "12,20 €", "A,G", "mit Spinat und Gorgonzolasahnesauce"),
 ]),
 ("Gratinati — Überbackenes", "", [
    gericht("48", "Lasagne", "14,50 €", "A,G,L,2,3", "Nudeln mit Schinken, Hackfleischsauce und Käse überbacken"),
    gericht("49", "Penne Funghi Porcini", "14,50 €", "A,G", "mit Speck, Steinpilzen, Sahnesauce und Käse überbacken"),
    gericht("50", "Tortellini alla Rapellina", "14,50 €", "A,G", "mit Brokkoli, Schinken in Sahnesauce und Käse überbacken"),
 ]),
 ("Risotto — Reisgerichte", "", [
    gericht("51", "Risotto Frutti di Mare", "15,90 €", "B,D", "mit Meeresfrüchten"),
    gericht("52", "Risotto Porcini Fileto", "16,90 €", "G", "mit Rinderfiletspitzen und Steinpilzen in Sahnesauce"),
 ]),
 ("Le Pizze — Pizza", "", [
    gericht("59", "Pizzabrot", "5,10 €", "A", "mit Olivenöl und Kräutern oder Knoblauch"),
    gericht("60", "Margherita", "9,90 €", "A,G", "mit Tomatensauce, Mozzarella und Basilikum"),
    gericht("61", "Pizza Caprese Buffalo", "12,90 €", "A,G", "mit frischen Tomaten, Büffel-Mozzarella und Basilikum"),
    gericht("62", "Pizza Salami", "11,10 €", "A,G,1,2,3", "mit Tomatensauce, Mozzarella und Salami"),
    gericht("63", "Pizza Schinken", "11,60 €", "A,G,2,3", "mit Tomatensauce, Mozzarella und gekochtem Schinken"),
    gericht("64", "Pizza Speziale", "14,50 €", "A,G,1,2,3", "mit Tomatensauce, Mozzarella, Salami, Schinken, Champignons und Zwiebeln"),
    gericht("65", "Pizza La Bonta", "14,90 €", "A,G,1,2,3", "mit Tomatensauce, Mozzarella, Salami, Schinken, Oliven und Artischocken"),
    gericht("66", "Pizza Frutti di Mare", "15,90 €", "A,B,D,G,R", "mit Tomatensauce, Mozzarella und Meeresfrüchten"),
    gericht("67", "Pizza Hawaii", "12,90 €", "A,G,2,3", "mit Tomatensauce, Mozzarella, Schinken und Ananas"),
    gericht("69", "Pizza Calzone", "13,90 €", "A,G,1,2,3", "Pizzatasche mit Tomatensauce, Mozzarella, Salami, Schinken und Champignons"),
    gericht("70", "Pizza Vegetariana", "13,90 €", "A,G", "mit Tomatensauce, Mozzarella, Auberginen, Artischocken, Oliven, Champignons und Zucchini"),
    gericht("71", "Pizza Tonno", "12,90 €", "A,D,G", "mit Tomatensauce, Mozzarella, Thunfisch und Zwiebeln"),
    gericht("72", "Pizza Quattro Formaggi", "14,20 €", "A,G", "mit Tomatensauce und vier verschiedenen Käsesorten"),
    gericht("73", "Pizza Parma e Rucola", "15,20 €", "A,G,2,3", "mit Tomatensauce, Mozzarella, Parmesan, Parmaschinken und Rucola"),
    gericht("74", "Pizza Piccante", "13,90 €", "A,G,1,2,3", "mit Tomatensauce, Mozzarella und scharfer Salami"),
    gericht("75", "Pizza Amore", "14,90 €", "A,G", "mit Tomatensauce, Mozzarella, Zucchini, Auberginen, Champignons, Zwiebeln und Parmesanstreifen"),
 ]),
 ("Extra Beilagen", "", [
    gericht("", "Zwiebeln", "1,50 €"),
    gericht("", "Artischocken, frische Champignons, Oliven, Peperoni", "je 2,50 €", "1,2,3"),
    gericht("", "Rucola, Salami, Vorderschinken", "je 2,50 €", "1,2,3"),
    gericht("", "Extra Mozzarella, frische Tomaten, Thunfisch", "je 2,50 €", "G,D"),
    gericht("", "Parmesan", "3,50 €", "G"),
 ]),
 ("Carne — Fleischgerichte", "", [
    gericht("80", "Bistecca alla Griglia", "28,90 €", "", "Rumpsteak gegrillt (ca. 270 Gramm), Rosmarinkartoffeln und Gemüse"),
    gericht("81", "Filetto alla Griglia", "30,90 €", "A", "Rinderfilet gegrillt (ca. 270 Gramm), mit Spaghetti und Gemüse"),
    gericht("82", "Filetto Gorgonzola", "32,90 €", "G", "Rinderfilet gegrillt (ca. 270 Gramm), in Gorgonzolasauce, mit Gemüse und Kartoffeln"),
    gericht("83", "Filetto al Pollo", "18,90 €", "G", "Hähnchenbrustfilet gegrillt, mit Kräuterbutter"),
    gericht("84", "Scaloppina ai Funghi", "20,90 €", "G", "Schweinefilet mit Champignonsauce"),
    gericht("89", "Salmone alla Griglia", "24,90 €", "A,G,1,2,3", "frischer Lachs gegrillt (ca. 250 Gramm)"),
 ]),
 ("Bambini — Kinder", "bis 12 Jahre", [
    gericht("100", "Pizza Elsa", "7,90 €", "A,G", "mit Tomatensauce und Käse"),
    gericht("101", "Pizza Frosch", "7,90 €", "A,G,1,2,3", "mit Tomatensauce, Salami und Käse"),
    gericht("102", "Pizza Maus", "7,90 €", "A,G,2,3", "mit Tomatensauce, Schinken und Käse"),
    gericht("103", "Penne Pomodoro", "6,50 €", "A", "in leckerer Tomatensauce"),
    gericht("104", "Penne Burro", "6,90 €", "A", "in leckerer Buttersauce"),
 ]),
 ("Deserto — Dessert", "", [
    gericht("110", "Schokoladensoufflé mit Vanilleeis", "6,90 €", "A,C,G"),
    gericht("111", "Tiramisu", "6,50 €", "A,C,G"),
    gericht("112", "Panna Cotta mit Erdbeersoße", "5,90 €", "G"),
    gericht("113", "Crème Brûlée", "6,90 €", "C,G"),
 ]),
]

# ---------------------------------------------------------------------------
# GETRÄNKEKARTE — eigenes Buch
# ---------------------------------------------------------------------------
def zwei(name, codes, p1, p2, m1="0,20 L", m2="0,40 L"):
    return gericht("", name, "%s / %s" % (p1, p2), codes, menge="%s / %s" % (m1, m2))


GETRAENKE = [
 ("Bevande Calde — Warme Getränke", "", [
    gericht("", "Espresso", "2,70 €", "10"),
    gericht("", "Doppio Espresso", "3,50 €", "10"),
    gericht("", "Milchkaffee", "3,50 €", "G,10"),
    gericht("", "Tasse Kaffee", "2,90 €", "10"),
    gericht("", "Cappuccino", "3,20 €", "G,10"),
    gericht("", "Latte Macchiato", "3,70 €", "G,10"),
    gericht("", "Heiße Schokolade", "3,50 €", "G"),
    gericht("", "Tee", "3,50 €", "", "verschiedene Sorten"),
    gericht("", "Heiße Zitrone", "2,90 €"),
    gericht("", "Glühwein", "3,20 €", "O"),
 ]),
 ("Bevande Analcoliche — Alkoholfreie Getränke", "", [
    zwei("S. Pellegrino", "", "3,30 €", "6,70 €", "Flasche 0,25 L", "0,75 L"),
    zwei("Acqua Panna", "", "3,30 €", "6,70 €", "Flasche 0,25 L", "0,75 L"),
    zwei("Coca Cola", "1,10", "3,80 €", "4,90 €"),
    zwei("Coca Cola light", "1,10", "3,80 €", "4,90 €"),
    zwei("Fanta", "1,3", "3,80 €", "4,90 €"),
    zwei("Sprite", "", "3,80 €", "4,90 €"),
    zwei("Spezi", "1,3,10", "3,80 €", "4,90 €"),
    zwei("Apfelschorle", "", "3,80 €", "4,90 €"),
    zwei("Tonic Water", "10", "3,80 €", "4,90 €"),
    zwei("Ginger Ale", "1", "3,80 €", "4,90 €"),
    zwei("Bitter Lemon", "3,10", "3,80 €", "4,90 €"),
    zwei("Eistee", "1,3", "3,80 €", "4,90 €"),
 ]),
 ("Succhi e Nettari — Säfte von Vaihinger", "", [
    zwei("Apfelsaft", "", "3,90 €", "4,90 €"),
    zwei("Orangensaft", "", "3,90 €", "4,90 €"),
    zwei("Ananassaft", "", "3,90 €", "4,90 €"),
    zwei("Kirschnektar", "", "3,90 €", "4,90 €"),
    zwei("Bananennektar", "", "3,90 €", "4,90 €"),
    zwei("KIBA", "", "3,90 €", "4,90 €"),
 ]),
 ("La Nostra Birreria — Bier", "", [
    gericht("", "König Pilsener vom Fass", "4,50 €", "A", menge="0,40 L"),
    gericht("", "Benediktiner Weizen vom Fass", "4,90 €", "A", menge="0,50 L"),
    gericht("", "Benediktiner Weizen dunkel", "4,90 €", "A", menge="Flasche 0,50 L"),
    gericht("", "Köstritzer Kellerbier", "4,90 €", "A", menge="Flasche 0,50 L"),
    gericht("", "Benediktiner Weizen alkoholfrei", "4,90 €", "A", menge="Flasche 0,50 L"),
    gericht("", "Bitburger alkoholfrei", "3,50 €", "A", menge="Flasche 0,33 L"),
    gericht("", "Radler", "4,50 €", "A", menge="0,40 L"),
    gericht("", "Diesel", "4,50 €", "A,10", menge="0,40 L"),
    gericht("", "Cola-Weizen", "4,90 €", "A,10", menge="0,50 L"),
    gericht("", "Bananen-Weizen", "5,10 €", "A", menge="0,50 L"),
    gericht("", "Radler alkoholfrei", "4,90 €", "A", menge="0,50 L"),
 ]),
 ("Vino della Casa — Offene Weine", "", [
    gericht("", "Bianco della Casa", "5,80 €", "O", "trockener Weißwein", "0,20 L"),
    gericht("", "Rosso della Casa", "5,80 €", "O", "trockener Rotwein", "0,20 L"),
    gericht("", "Rosé Wein", "5,80 €", "O", "trocken", "0,20 L"),
    gericht("", "Lambrusco", "5,80 €", "O", "lieblicher Rotwein", "0,20 L"),
    gericht("", "Frizzantino", "5,80 €", "O", "lieblicher Weißwein", "0,20 L"),
    gericht("", "Weißweinschorle", "5,80 €", "O", "", "0,20 L"),
 ]),
 ("Spiriti — Spirituosen", "jeweils 4 cl", [
    gericht("", "Fernet Branca", "4,90 €"),
    gericht("", "Sambuca", "4,90 €"),
    gericht("", "Vodka", "4,90 €"),
    gericht("", "Jägermeister", "4,90 €"),
    gericht("", "Vecchia Romagna", "4,90 €"),
    gericht("", "Amaro Avenra", "4,90 €", "O"),
    gericht("", "Ramazzotti", "4,90 €", "O"),
    gericht("", "Limoncello", "4,90 €", "1"),
    gericht("", "Grappa Normale", "4,90 €", "1"),
    gericht("", "Grappa Speciale", "7,50 €", "1", "verschiedene Sorten"),
    gericht("", "Amaretto", "4,90 €", "O"),
    gericht("", "Baileys", "4,90 €", "G"),
 ]),
]


def rubrik_html(titel, notiz, eintraege, stufe=3):
    e = html.escape
    out = ['<div class="rubrik" data-rubrik>']
    out.append('<h%d class="rubrik__titel" data-rubrik-titel>%s</h%d>' % (stufe, e(titel), stufe))
    if notiz:
        out.append('<p class="rubrik__notiz" data-rubrik-notiz>%s</p>' % e(notiz))
    for g in eintraege:
        out.append('<div class="gericht" data-eintrag>')
        out.append('<span class="gericht__nr">%s</span>' % e(g["nr"]))
        out.append('<span class="gericht__name">%s%s</span>' % (e(g["name"]), kennz(g["codes"])))
        out.append('<span class="gericht__preis">%s</span>' % e(g["preis"]))
        if g["text"]:
            out.append('<span class="gericht__text">%s</span>' % e(g["text"]))
        if g["menge"]:
            out.append('<span class="gericht__menge">%s</span>' % e(g["menge"]))
        out.append('</div>')
    out.append('</div>')
    return "\n".join(out)


def karte_html(daten):
    return "\n".join(rubrik_html(t, n, g) for t, n, g in daten)


def legende_html():
    e = html.escape
    a = " ".join('<span><b>%s</b> %s</span>' % (k, e(v)) for k, v in ALLERGENE.items())
    z = " ".join('<span><b>%s</b> %s</span>' % (k, e(v)) for k, v in ZUSATZSTOFFE.items())
    return """<details class="legende">
  <summary>Allergene und Zusatzstoffe</summary>
  <p style="margin-top:1rem;font-size:.9rem" class="muted">Die Hochzahlen am Gericht lassen sich einzeln antippen. Bei Fragen zu Unverträglichkeiten sprechen Sie uns bitte an.</p>
  <p style="margin-top:1rem"><strong>Allergene</strong></p>
  <div class="legende__gitter">%s</div>
  <p style="margin-top:1.2rem"><strong>Zusatzstoffe</strong></p>
  <div class="legende__gitter">%s</div>
</details>""" % (a, z)


if __name__ == "__main__":
    print("<!-- ABENDKARTE -->")
    print(karte_html(ABEND))
    print("\n<!-- GETRAENKE -->")
    print(karte_html(GETRAENKE))
    print("\n<!-- LEGENDE -->")
    print(legende_html())
