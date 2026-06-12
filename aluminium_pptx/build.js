const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

// ---------------------------------------------------------------- Palette
const DARK = "22303A", STEEL = "37474F", BLUE = "2E7DA1", LBLUE = "5FB0D4";
const SILVER = "C9D2D9", HOT = "E8923A", PANEL = "F2F5F7", INK = "22303A";
const MUTE = "5B6B75", WHITE = "FFFFFF", LINE = "DCE3E8";

const HEAD = "Cambria";   // Serif-Headlines (safe-list)
const BODY = "Calibri";   // Sans-Body (safe-list)

const IMG = __dirname + "/images/";

// ---------------------------------------------------------------- Icons
async function icon(IconComponent, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) }));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

const shadow = () => ({ type: "outer", color: "000000", blur: 7, offset: 3, angle: 90, opacity: 0.16 });

(async () => {
  const I = {};
  const need = {
    weight: fa.FaFeatherAlt, bolt: fa.FaBolt, shield: fa.FaShieldAlt, fire: fa.FaFire,
    magnet: fa.FaMagnet, recycle: fa.FaRecycle, car: fa.FaCar, plane: fa.FaPlane,
    box: fa.FaBoxOpen, building: fa.FaBuilding, plug: fa.FaPlug, mobile: fa.FaMobileAlt,
    mountain: fa.FaMountain, flask: fa.FaFlask, leaf: fa.FaLeaf, industry: fa.FaIndustry,
    check: fa.FaCheckCircle, times: fa.FaTimesCircle, globe: fa.FaGlobeEurope,
    book: fa.FaBookOpen, atom: fa.FaAtom, bullseye: fa.FaBullseye,
  };
  for (const [k, C] of Object.entries(need)) I[k] = await icon(C, "#" + BLUE);
  const Iw = {};
  for (const [k, C] of Object.entries(need)) Iw[k] = await icon(C, "#FFFFFF");
  const Ihot = {};
  for (const [k, C] of Object.entries(need)) Ihot[k] = await icon(C, "#" + HOT);

  const pres = new pptxgen();
  pres.defineLayout({ name: "W", width: 13.333, height: 7.5 });
  pres.layout = "W";
  pres.author = "Schülerpräsentation";
  pres.title = "Aluminium";
  const PW = 13.333, PH = 7.5;

  // footer helper for content slides
  function footer(slide, n, source) {
    slide.addText([
      { text: "Aluminium", options: { color: BLUE, bold: true } },
      { text: "   ·   Referat Chemie", options: { color: MUTE } },
    ], { x: 0.6, y: 7.06, w: 7, h: 0.3, fontFace: BODY, fontSize: 9, align: "left", margin: 0 });
    if (source)
      slide.addText("Quelle: " + source, { x: 6.2, y: 7.06, w: 5.6, h: 0.3,
        fontFace: BODY, fontSize: 8, italic: true, color: MUTE, align: "right", margin: 0 });
    slide.addText(String(n), { x: 12.5, y: 7.0, w: 0.6, h: 0.36, fontFace: BODY,
      fontSize: 10, bold: true, color: BLUE, align: "right", margin: 0 });
  }
  // standard content-slide title
  function head(slide, kicker, title) {
    slide.addText(kicker.toUpperCase(), { x: 0.6, y: 0.45, w: 12, h: 0.3,
      fontFace: BODY, fontSize: 12, bold: true, color: HOT, charSpacing: 2, margin: 0 });
    slide.addText(title, { x: 0.6, y: 0.74, w: 12.1, h: 0.7,
      fontFace: HEAD, fontSize: 30, bold: true, color: INK, margin: 0 });
  }
  function card(slide, x, y, w, h, fill) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08,
      fill: { color: fill || WHITE }, line: { color: LINE, width: 1 }, shadow: shadow() });
  }

  // ============================================================ 1 · TITLE
  let s = pres.addSlide();
  s.background = { color: DARK };
  // dezente Akzentkreise
  s.addShape(pres.shapes.OVAL, { x: 9.7, y: -1.6, w: 5.2, h: 5.2, fill: { color: "2C3E49" } });
  s.addShape(pres.shapes.OVAL, { x: 11.2, y: 4.6, w: 3.6, h: 3.6, fill: { color: "2C3E49" } });

  s.addText("REFERAT  ·  CHEMIE", { x: 0.9, y: 1.15, w: 8, h: 0.4, fontFace: BODY,
    fontSize: 14, bold: true, color: HOT, charSpacing: 3, margin: 0 });
  s.addText("Aluminium", { x: 0.85, y: 1.55, w: 9, h: 1.7, fontFace: HEAD,
    fontSize: 78, bold: true, color: WHITE, margin: 0 });
  s.addText("Das Leichtmetall, das unsere moderne Welt prägt", { x: 0.9, y: 3.35,
    w: 8.4, h: 0.6, fontFace: BODY, fontSize: 21, italic: true, color: SILVER, margin: 0 });

  // kurze Eckdaten-Zeile
  const facts = [["13", "Ordnungszahl"], ["2,70", "g/cm³ Dichte"], ["660 °C", "Schmelzpunkt"], ["#3", "häufigstes Element"]];
  let fx = 0.9;
  facts.forEach(([v, l]) => {
    s.addText(v, { x: fx, y: 4.55, w: 2.5, h: 0.6, fontFace: HEAD, fontSize: 27, bold: true, color: LBLUE, margin: 0 });
    s.addText(l, { x: fx, y: 5.15, w: 2.6, h: 0.4, fontFace: BODY, fontSize: 12, color: SILVER, margin: 0 });
    fx += 2.95;
  });

  // Element-Badge (Periodensystem-Zelle)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.55, y: 1.35, w: 2.85, h: 2.85,
    rectRadius: 0.12, fill: { color: HOT }, line: { type: "none" }, shadow: shadow() });
  s.addText("13", { x: 9.75, y: 1.45, w: 2.4, h: 0.5, fontFace: BODY, fontSize: 20, bold: true, color: WHITE, align: "left", margin: 0 });
  s.addText("Al", { x: 9.55, y: 1.95, w: 2.85, h: 1.4, fontFace: HEAD, fontSize: 80, bold: true, color: WHITE, align: "center", margin: 0 });
  s.addText("26,98", { x: 9.55, y: 3.55, w: 2.65, h: 0.5, fontFace: BODY, fontSize: 16, color: WHITE, align: "right", margin: 0 });

  s.addText("Klasse ___    ·    Name: ______________    ·    Datum: __________", {
    x: 0.9, y: 6.55, w: 11.5, h: 0.4, fontFace: BODY, fontSize: 13, color: SILVER, margin: 0 });

  // ============================================================ 2 · GLIEDERUNG
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Überblick", "Gliederung");
  const agenda = [
    ["01", "Was ist Aluminium?", "Steckbrief & Element-Daten", I.atom],
    ["02", "Eigenschaften", "Physikalisch & chemisch", I.bolt],
    ["03", "Vorkommen", "In der Natur & im Gestein", I.mountain],
    ["04", "Geschichte", "Von der Entdeckung bis heute", I.book],
    ["05", "Herstellung", "Bayer-Verfahren & Elektrolyse", I.industry],
    ["06", "Weltproduktion", "Wer produziert wie viel?", I.globe],
    ["07", "Verwendung", "Wo wir Aluminium nutzen", I.car],
    ["08", "Recycling & Umwelt", "Nachhaltigkeit & Bilanz", I.recycle],
  ];
  let ax = 0.6, ay = 1.75, cw = 6.0, ch = 1.18, gx = 0.13, gy = 0.13;
  agenda.forEach((a, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = ax + col * (cw + gx), y = ay + row * (ch + gy);
    card(s, x, y, cw, ch, PANEL);
    s.addText(a[0], { x: x + 0.2, y: y + 0.18, w: 0.9, h: 0.8, fontFace: HEAD,
      fontSize: 34, bold: true, color: SILVER, align: "center", valign: "middle", margin: 0 });
    s.addImage({ data: a[3], x: x + 1.15, y: y + 0.38, w: 0.42, h: 0.42 });
    s.addText(a[1], { x: x + 1.75, y: y + 0.22, w: cw - 2.0, h: 0.45, fontFace: BODY,
      fontSize: 16, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(a[2], { x: x + 1.75, y: y + 0.62, w: cw - 2.0, h: 0.4, fontFace: BODY,
      fontSize: 12, color: MUTE, margin: 0 });
  });
  footer(s, 2);

  // ============================================================ 3 · STECKBRIEF
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 01", "Steckbrief: Was ist Aluminium?");
  // linke Karte: Element-Badge + Kurztext
  card(s, 0.6, 1.7, 4.5, 4.9, DARK);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.6, y: 2.1, w: 2.5, h: 2.5, rectRadius: 0.12,
    fill: { color: HOT }, line: { type: "none" } });
  s.addText("13", { x: 1.78, y: 2.2, w: 2.1, h: 0.4, fontFace: BODY, fontSize: 17, bold: true, color: WHITE, margin: 0 });
  s.addText("Al", { x: 1.6, y: 2.5, w: 2.5, h: 1.3, fontFace: HEAD, fontSize: 70, bold: true, color: WHITE, align: "center", margin: 0 });
  s.addText("26,98", { x: 1.6, y: 3.95, w: 2.32, h: 0.45, fontFace: BODY, fontSize: 14, color: WHITE, align: "right", margin: 0 });
  s.addText("Aluminium ist ein silbrig-weißes, sehr leichtes Metall (ein „Leichtmetall“). In der Natur kommt es nie rein vor, sondern immer chemisch gebunden – meist im Erz Bauxit.",
    { x: 0.95, y: 4.85, w: 3.8, h: 1.55, fontFace: BODY, fontSize: 13.5, color: "E6ECF0", lineSpacingMultiple: 1.12, margin: 0, valign: "top" });

  // rechte Tabelle: Daten
  const rows = [
    ["Chemisches Symbol", "Al"],
    ["Ordnungszahl", "13"],
    ["Element-Gruppe", "Metall (3. Hauptgruppe)"],
    ["Atommasse", "26,98 u"],
    ["Dichte", "2,70 g/cm³ (Leichtmetall)"],
    ["Schmelzpunkt", "660 °C"],
    ["Siedepunkt", "≈ 2 470 °C"],
    ["Farbe / Aussehen", "silbrig-weiß, glänzend"],
    ["Aggregatzustand", "fest (bei Raumtemperatur)"],
  ];
  const tx = 5.4, tw = 7.33, ty = 1.7, rh = 0.535;
  rows.forEach((r, i) => {
    const y = ty + i * rh;
    s.addShape(pres.shapes.RECTANGLE, { x: tx, y, w: tw, h: rh, fill: { color: i % 2 ? PANEL : WHITE }, line: { color: LINE, width: 0.75 } });
    s.addText(r[0], { x: tx + 0.2, y, w: 3.5, h: rh, fontFace: BODY, fontSize: 14, bold: true, color: STEEL, valign: "middle", margin: 0 });
    s.addText(r[1], { x: tx + 3.7, y, w: tw - 3.85, h: rh, fontFace: BODY, fontSize: 14, color: INK, valign: "middle", margin: 0 });
  });
  footer(s, 3, "USGS; Römpp Chemie-Lexikon");

  // ============================================================ 4 · EIGENSCHAFTEN
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 02", "Eigenschaften von Aluminium");
  const props = [
    [Iw.weight, "Sehr leicht", "Dichte 2,70 g/cm³ – nur etwa ein Drittel so schwer wie Eisen oder Stahl."],
    [Iw.bolt, "Gut leitfähig", "Leitet Strom und Wärme sehr gut – wird z. B. für Stromleitungen genutzt."],
    [Iw.shield, "Korrosionsbeständig", "Eine dünne Oxidschicht (Passivierung) schützt das Metall vor Rost."],
    [Iw.fire, "Gut verformbar", "Weich und dehnbar: lässt sich walzen, pressen, gießen und zu Folie verarbeiten."],
    [Iw.magnet, "Nicht magnetisch", "Aluminium ist unmagnetisch und ungiftig – ideal für Lebensmittel & Elektronik."],
    [Iw.recycle, "Sehr gut recycelbar", "Beliebig oft einschmelzbar, ohne dass die Qualität verloren geht."],
  ];
  let px = 0.6, py = 1.75, pcw = 3.97, pch = 2.35, pgx = 0.18, pgy = 0.2;
  props.forEach((p, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = px + col * (pcw + pgx), y = py + row * (pch + pgy);
    card(s, x, y, pcw, pch);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.3, w: 0.85, h: 0.85, fill: { color: BLUE } });
    s.addImage({ data: p[0], x: x + 0.49, y: y + 0.49, w: 0.47, h: 0.47 });
    s.addText(p[1], { x: x + 1.3, y: y + 0.42, w: pcw - 1.5, h: 0.6, fontFace: BODY, fontSize: 17, bold: true, color: INK, valign: "middle", margin: 0 });
    s.addText(p[2], { x: x + 0.32, y: y + 1.3, w: pcw - 0.62, h: 0.95, fontFace: BODY, fontSize: 13, color: MUTE, lineSpacingMultiple: 1.1, margin: 0 });
  });
  footer(s, 4, "Holleman-Wiberg, Anorganische Chemie");

  // ============================================================ 5 · VORKOMMEN
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 03", "Vorkommen in der Natur");
  // links Text-Punkte
  const vk = [
    ["Häufigstes Metall der Erdkruste", "Mit rund 8 % ist Aluminium das häufigste Metall – und nach Sauerstoff und Silicium das dritthäufigste Element überhaupt."],
    ["Nie in reiner Form", "Wegen seiner hohen Reaktionsfreudigkeit kommt Aluminium in der Natur nie elementar vor, sondern stets als Verbindung."],
    ["Wichtigstes Erz: Bauxit", "Aus dem rötlichen Gestein Bauxit wird fast das gesamte Aluminium gewonnen. Große Vorkommen: Australien, Guinea, Brasilien."],
  ];
  let vy = 1.85;
  vk.forEach((v) => {
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: vy + 0.05, w: 0.5, h: 0.5, fill: { color: HOT } });
    s.addImage({ data: Iw.check, x: 0.71, y: vy + 0.16, w: 0.28, h: 0.28 });
    s.addText(v[0], { x: 1.3, y: vy - 0.05, w: 6.0, h: 0.5, fontFace: BODY, fontSize: 17, bold: true, color: INK, margin: 0 });
    s.addText(v[1], { x: 1.3, y: vy + 0.45, w: 6.1, h: 1.0, fontFace: BODY, fontSize: 13.5, color: MUTE, lineSpacingMultiple: 1.12, margin: 0 });
    vy += 1.62;
  });
  // rechts Pie: Erdkruste
  card(s, 7.85, 1.75, 4.88, 4.9, WHITE);
  s.addText("Zusammensetzung der Erdkruste", { x: 8.05, y: 1.95, w: 4.5, h: 0.4, fontFace: BODY, fontSize: 14, bold: true, color: STEEL, align: "center", margin: 0 });
  s.addChart(pres.charts.DOUGHNUT, [{
    name: "Erdkruste", labels: ["Sauerstoff", "Silicium", "Aluminium", "Eisen", "Calcium", "Übrige"],
    values: [46, 28, 8, 5, 4, 9],
  }], {
    x: 7.95, y: 2.35, w: 4.7, h: 4.15, holeSize: 52,
    chartColors: [SILVER, "AEB9C0", HOT, STEEL, "8FA1AB", "E1E7EB"],
    showLegend: true, legendPos: "b", legendFontSize: 11, legendColor: INK,
    showValue: false, showPercent: true, dataLabelColor: WHITE, dataLabelFontSize: 11,
    dataLabelFontBold: true,
  });
  footer(s, 5, "USGS; CRC Handbook of Chemistry");

  // ============================================================ 6 · GESCHICHTE
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 04", "Ein Blick in die Geschichte");
  s.addText("Aluminium galt im 19. Jahrhundert als kostbarer als Gold – erst die Elektrolyse machte es zum Massenmetall.",
    { x: 0.6, y: 1.5, w: 12.1, h: 0.45, fontFace: BODY, fontSize: 14.5, italic: true, color: MUTE, margin: 0 });
  const tl = [
    ["1825", "Erstmals isoliert", "Der Däne H. C. Ørsted stellt erstmals unreines Aluminium her.", BLUE],
    ["1827", "Reineres Metall", "Friedrich Wöhler gewinnt reineres Aluminium und erforscht seine Eigenschaften.", LBLUE],
    ["1886", "Hall-Héroult-Verfahren", "Hall & Héroult entwickeln unabhängig die Schmelzfluss­elektrolyse – Aluminium wird bezahlbar.", HOT],
    ["1888", "Bayer-Verfahren", "Karl J. Bayer entwickelt das Verfahren zur Gewinnung von reiner Tonerde aus Bauxit.", STEEL],
  ];
  let lx2 = 0.6, lw = 2.97, lgap = 0.18, ly2 = 2.35;
  // Verbindungslinie
  s.addShape(pres.shapes.LINE, { x: 0.95, y: 3.05, w: 11.4, h: 0, line: { color: SILVER, width: 2, dashType: "dash" } });
  tl.forEach((t, i) => {
    const x = lx2 + i * (lw + lgap);
    s.addShape(pres.shapes.OVAL, { x: x + lw/2 - 0.18, y: 2.87, w: 0.36, h: 0.36, fill: { color: t[3] }, line: { color: WHITE, width: 2.5 } });
    card(s, x, 3.5, lw, 2.7);
    s.addText(t[0], { x: x, y: 3.7, w: lw, h: 0.75, fontFace: HEAD, fontSize: 34, bold: true, color: t[3], align: "center", margin: 0 });
    s.addText(t[1], { x: x + 0.2, y: 4.5, w: lw - 0.4, h: 0.6, fontFace: BODY, fontSize: 15.5, bold: true, color: INK, align: "center", margin: 0 });
    s.addText(t[2], { x: x + 0.24, y: 5.12, w: lw - 0.48, h: 1.0, fontFace: BODY, fontSize: 12, color: MUTE, align: "center", lineSpacingMultiple: 1.1, margin: 0 });
  });
  footer(s, 6, "Gesamtverband der Aluminiumindustrie (GDA)");

  // ============================================================ 7 · HERSTELLUNG
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 05", "Herstellung in zwei Schritten");
  s.addImage({ path: IMG + "process_diagram.png", x: 0.97, y: 1.5, w: 11.4, h: 3.98 });
  // zwei Erklärkarten
  const hk = [
    [I.flask, "1 · Bayer-Verfahren", "Aus dem Erz Bauxit wird durch Auflösen in Natronlauge reines Aluminiumoxid (Al₂O₃, „Tonerde“) gewonnen. Abfallprodukt ist der giftige Rotschlamm."],
    [I.bolt, "2 · Schmelzflusselektrolyse", "Das Aluminiumoxid wird bei ~960 °C geschmolzen und durch elektrischen Strom in reines Aluminium und Sauerstoff zerlegt (Hall-Héroult-Verfahren)."],
  ];
  let hx = 0.6;
  hk.forEach((h) => {
    card(s, hx, 5.62, 6.0, 1.2, PANEL);
    s.addShape(pres.shapes.OVAL, { x: hx + 0.25, y: 5.84, w: 0.75, h: 0.75, fill: { color: BLUE } });
    s.addImage({ data: h[0], x: hx + 0.42, y: 6.01, w: 0.41, h: 0.41 });
    s.addText(h[1], { x: hx + 1.2, y: 5.82, w: 4.65, h: 0.38, fontFace: BODY, fontSize: 14.5, bold: true, color: INK, margin: 0 });
    s.addText(h[2], { x: hx + 1.2, y: 6.16, w: 4.7, h: 0.62, fontFace: BODY, fontSize: 10.5, color: MUTE, lineSpacingMultiple: 1.0, margin: 0 });
    hx += 6.13;
  });
  footer(s, 7, "GDA; Speira – Aluminium-Herstellung");

  // ============================================================ 8 · WELTPRODUKTION
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 06", "Weltproduktion 2024");
  // Bar chart links
  card(s, 0.6, 1.75, 7.7, 4.9, WHITE);
  s.addText("Primäraluminium – größte Produzenten (Mio. t)", { x: 0.85, y: 1.95, w: 7.2, h: 0.4, fontFace: BODY, fontSize: 14, bold: true, color: STEEL, margin: 0 });
  s.addChart(pres.charts.BAR, [{
    name: "Mio. t", labels: ["China", "Indien", "Russland", "Kanada", "VAE", "Bahrain"],
    values: [43, 4.2, 3.8, 3.3, 2.7, 1.6],
  }], {
    x: 0.7, y: 2.4, w: 7.5, h: 4.1, barDir: "bar",
    chartColors: [BLUE], showValue: true, dataLabelPosition: "outEnd",
    dataLabelColor: INK, dataLabelFontSize: 12, dataLabelFontBold: true,
    catAxisLabelColor: INK, catAxisLabelFontSize: 13, valAxisHidden: true,
    valGridLine: { style: "none" }, catGridLine: { style: "none" },
    showLegend: false, barGapWidthPct: 45,
  });
  // Stat-Callouts rechts
  card(s, 8.5, 1.75, 4.23, 2.35, DARK);
  s.addText("≈ 72 Mio. t", { x: 8.7, y: 2.1, w: 3.9, h: 0.85, fontFace: HEAD, fontSize: 39, bold: true, color: HOT, margin: 0 });
  s.addText("Weltproduktion an Primär­aluminium im Jahr 2024", { x: 8.7, y: 2.95, w: 3.85, h: 0.95, fontFace: BODY, fontSize: 14, color: "E6ECF0", lineSpacingMultiple: 1.1, margin: 0 });
  card(s, 8.5, 4.3, 4.23, 2.35, PANEL);
  s.addText("≈ 60 %", { x: 8.7, y: 4.6, w: 3.9, h: 0.85, fontFace: HEAD, fontSize: 44, bold: true, color: BLUE, margin: 0 });
  s.addText("der weltweiten Produktion stammen allein aus China", { x: 8.7, y: 5.5, w: 3.85, h: 0.95, fontFace: BODY, fontSize: 14, color: STEEL, lineSpacingMultiple: 1.1, margin: 0 });
  footer(s, 8, "USGS, Mineral Commodity Summaries 2025");

  // ============================================================ 9 · VERWENDUNG
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 07", "Verwendung im Alltag");
  const uses = [
    [Iw.car, "Verkehr & Fahrzeuge", "Autos, Züge, Fahrräder – leichter = weniger Sprit & CO₂"],
    [Iw.plane, "Luft- & Raumfahrt", "Flugzeugrümpfe und Tragflächen aus Alu-Legierungen"],
    [Iw.box, "Verpackungen", "Getränkedosen, Folien, Tuben, Lebensmittel­verpackung"],
    [Iw.building, "Bauwesen", "Fensterrahmen, Fassaden, Dächer – stabil & wetterfest"],
    [Iw.plug, "Elektrotechnik", "Überland-Stromleitungen wegen geringem Gewicht"],
    [Iw.mobile, "Alltag & Technik", "Smartphones, Laptops, Haushaltsgeräte, Möbel"],
  ];
  let ux = 0.6, uy = 1.8, ucw = 6.05, uch = 1.46, ugx = 0.13, ugy = 0.15;
  uses.forEach((u, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = ux + col * (ucw + ugx), y = uy + row * (uch + ugy);
    card(s, x, y, ucw, uch, PANEL);
    s.addShape(pres.shapes.OVAL, { x: x + 0.28, y: y + 0.35, w: 0.78, h: 0.78, fill: { color: HOT } });
    s.addImage({ data: u[0], x: x + 0.46, y: y + 0.53, w: 0.42, h: 0.42 });
    s.addText(u[1], { x: x + 1.25, y: y + 0.28, w: ucw - 1.45, h: 0.5, fontFace: BODY, fontSize: 17, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(u[2], { x: x + 1.25, y: y + 0.78, w: ucw - 1.45, h: 0.55, fontFace: BODY, fontSize: 12.5, color: MUTE, margin: 0 });
  });
  footer(s, 9, "GDA – Aluminium in Anwendungen");

  // ============================================================ 10 · RECYCLING
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Kapitel 08", "Recycling – das Sparmetall");
  s.addImage({ path: IMG + "recycling_cycle.png", x: 0.4, y: 1.55, w: 5.55, h: 5.0 });
  // rechts Text + Stat
  card(s, 6.4, 1.75, 6.33, 2.2, DARK);
  s.addImage({ data: Ihot.recycle, x: 6.7, y: 2.1, w: 0.95, h: 0.95 });
  s.addText("Nur 5 % Energie nötig", { x: 7.85, y: 2.0, w: 4.7, h: 0.55, fontFace: HEAD, fontSize: 26, bold: true, color: WHITE, margin: 0 });
  s.addText("Recycling von Aluminium braucht nur etwa 5 % der Energie der Neugewinnung – das spart bis zu 95 %.",
    { x: 7.85, y: 2.6, w: 4.65, h: 1.1, fontFace: BODY, fontSize: 13.5, color: "E6ECF0", lineSpacingMultiple: 1.12, margin: 0 });
  const rc = [
    "Aluminium kann beliebig oft eingeschmolzen werden, ohne an Qualität zu verlieren.",
    "Rund 75 % des jemals produzierten Aluminiums sind heute noch in Gebrauch.",
    "Getrennte Sammlung (z. B. Gelber Sack, Pfand) ist die Grundlage für gutes Recycling.",
  ];
  let ry = 4.2;
  rc.forEach((t) => {
    s.addShape(pres.shapes.OVAL, { x: 6.4, y: ry + 0.04, w: 0.42, h: 0.42, fill: { color: BLUE } });
    s.addImage({ data: Iw.check, x: 6.49, y: ry + 0.13, w: 0.24, h: 0.24 });
    s.addText(t, { x: 7.0, y: ry - 0.05, w: 5.7, h: 0.7, fontFace: BODY, fontSize: 14, color: INK, lineSpacingMultiple: 1.08, margin: 0, valign: "middle" });
    ry += 0.83;
  });
  footer(s, 10, "Aluminium Deutschland; Umweltbundesamt");

  // ============================================================ 11 · VOR-/NACHTEILE
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Bewertung", "Vorteile & Nachteile im Überblick");
  // Vorteile
  card(s, 0.6, 1.8, 6.0, 4.85, WHITE);
  s.addShape(pres.shapes.OVAL, { x: 0.9, y: 2.1, w: 0.7, h: 0.7, fill: { color: BLUE } });
  s.addImage({ data: Iw.check, x: 1.07, y: 2.27, w: 0.36, h: 0.36 });
  s.addText("Vorteile", { x: 1.75, y: 2.12, w: 4.5, h: 0.65, fontFace: HEAD, fontSize: 24, bold: true, color: BLUE, valign: "middle", margin: 0 });
  const pro = [
    "Sehr leicht und trotzdem stabil",
    "Rostet nicht (schützende Oxidschicht)",
    "Gut form- und verarbeitbar",
    "Leitet Strom und Wärme sehr gut",
    "Beliebig oft recycelbar – spart Energie",
    "Ungiftig & lebensmittelecht",
  ];
  s.addText(pro.map((t, i) => ({ text: t, options: { bullet: { code: "2713", indent: 18 }, color: INK, breakLine: true, paraSpaceAfter: 10 } })),
    { x: 1.0, y: 3.05, w: 5.4, h: 3.4, fontFace: BODY, fontSize: 15.5, margin: 0 });
  // Nachteile
  card(s, 6.75, 1.8, 6.0, 4.85, WHITE);
  s.addShape(pres.shapes.OVAL, { x: 7.05, y: 2.1, w: 0.7, h: 0.7, fill: { color: HOT } });
  s.addImage({ data: Iw.times, x: 7.22, y: 2.27, w: 0.36, h: 0.36 });
  s.addText("Nachteile", { x: 7.9, y: 2.12, w: 4.5, h: 0.65, fontFace: HEAD, fontSize: 24, bold: true, color: HOT, valign: "middle", margin: 0 });
  const con = [
    "Herstellung braucht sehr viel Energie (Strom)",
    "Hoher CO₂-Ausstoß bei der Neugewinnung",
    "Giftiger Rotschlamm als Abfallprodukt",
    "Abbau von Bauxit zerstört Landschaften",
    "Teurer als z. B. Stahl",
    "Weicher als Stahl – oft als Legierung nötig",
  ];
  s.addText(con.map((t) => ({ text: t, options: { bullet: { code: "2715", indent: 18 }, color: INK, breakLine: true, paraSpaceAfter: 10 } })),
    { x: 7.15, y: 3.05, w: 5.4, h: 3.4, fontFace: BODY, fontSize: 15.5, margin: 0 });
  footer(s, 11);

  // ============================================================ 12 · FAZIT
  s = pres.addSlide(); s.background = { color: DARK };
  s.addShape(pres.shapes.OVAL, { x: -1.5, y: 4.4, w: 4.6, h: 4.6, fill: { color: "2C3E49" } });
  s.addShape(pres.shapes.OVAL, { x: 10.6, y: -1.4, w: 4.4, h: 4.4, fill: { color: "2C3E49" } });
  s.addText("FAZIT", { x: 0.9, y: 0.85, w: 8, h: 0.4, fontFace: BODY, fontSize: 14, bold: true, color: HOT, charSpacing: 3, margin: 0 });
  s.addText("Aluminium – leicht, vielseitig, zukunftsfähig", { x: 0.85, y: 1.2, w: 11.6, h: 0.9, fontFace: HEAD, fontSize: 34, bold: true, color: WHITE, margin: 0 });
  const fz = [
    [Iw.atom, "Besonderes Metall", "Aluminium ist das häufigste Metall der Erdkruste und vereint geringes Gewicht mit hoher Stabilität."],
    [Iw.industry, "Aufwändige Herstellung", "Die Gewinnung aus Bauxit ist sehr energieintensiv – Strom und Umwelt spielen eine große Rolle."],
    [Iw.recycle, "Recycling ist der Schlüssel", "Wiederverwertung spart bis zu 95 % Energie und macht Aluminium nachhaltig nutzbar."],
    [Iw.globe, "Unverzichtbar", "Vom Flugzeug bis zur Getränkedose – Aluminium prägt unseren modernen Alltag."],
  ];
  let fzx = 0.85, fzy = 2.55, fzw = 5.85, fzh = 1.95, fgx = 0.2, fgy = 0.2;
  fz.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = fzx + col * (fzw + fgx), y = fzy + row * (fzh + fgy);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: fzw, h: fzh, rectRadius: 0.08, fill: { color: "2C3E49" }, line: { type: "none" } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.55, w: 0.85, h: 0.85, fill: { color: HOT } });
    s.addImage({ data: f[0], x: x + 0.49, y: y + 0.74, w: 0.47, h: 0.47 });
    s.addText(f[1], { x: x + 1.35, y: y + 0.32, w: fzw - 1.6, h: 0.55, fontFace: BODY, fontSize: 18, bold: true, color: WHITE, valign: "middle", margin: 0 });
    s.addText(f[2], { x: x + 1.35, y: y + 0.88, w: fzw - 1.6, h: 0.95, fontFace: BODY, fontSize: 13, color: SILVER, lineSpacingMultiple: 1.1, margin: 0 });
  });

  // ============================================================ 13 · QUELLEN
  s = pres.addSlide(); s.background = { color: WHITE };
  head(s, "Anhang", "Quellenverzeichnis");
  s.addImage({ data: I.book, x: 11.7, y: 0.55, w: 0.9, h: 0.9 });
  const src = [
    ["U.S. Geological Survey (USGS)", "Mineral Commodity Summaries 2025 – Aluminum. pubs.usgs.gov (Produktionszahlen 2024)"],
    ["Gesamtverband der Aluminiumindustrie (GDA)", "aluminiumdeutschland.de – Eigenschaften, Herstellung, Anwendungen, Energiesparen"],
    ["Holleman / Wiberg", "Lehrbuch der Anorganischen Chemie, de Gruyter (chemische & physikalische Eigenschaften)"],
    ["Römpp Chemie-Lexikon", "Thieme Verlag, Stichwort „Aluminium“ (Steckbrief & Element-Daten)"],
    ["Speira GmbH", "speira.com – Aluminium-Herstellung & Recycling (Bayer-Verfahren, Elektrolyse)"],
    ["Umweltbundesamt (UBA)", "umweltbundesamt.de – Aluminiumrecycling & Umweltbilanz"],
    ["CRC Handbook of Chemistry and Physics", "Häufigkeit der Elemente in der Erdkruste"],
  ];
  let sy = 1.68;
  src.forEach((q, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: sy, w: 12.13, h: 0.6, fill: { color: i % 2 ? PANEL : WHITE }, line: { color: LINE, width: 0.75 } });
    s.addText(q[0], { x: 0.8, y: sy, w: 4.4, h: 0.6, fontFace: BODY, fontSize: 13, bold: true, color: BLUE, valign: "middle", margin: 0 });
    s.addText(q[1], { x: 5.3, y: sy, w: 7.3, h: 0.6, fontFace: BODY, fontSize: 11.5, color: STEEL, valign: "middle", margin: 0 });
    sy += 0.625;
  });
  s.addText("Hinweis: Die abgebildeten Diagramme (Atommodell, Herstellungsprozess, Recycling-Kreislauf) wurden eigens für dieses Referat erstellt. Abgerufen: Juni 2026.",
    { x: 0.6, y: sy + 0.08, w: 12.13, h: 0.4, fontFace: BODY, fontSize: 10.5, italic: true, color: MUTE, margin: 0 });
  footer(s, 13);

  await pres.writeFile({ fileName: __dirname + "/Aluminium_Praesentation.pptx" });
  console.log("PPTX erstellt.");
})();
