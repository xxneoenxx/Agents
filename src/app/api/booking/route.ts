import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/booking-schema";
import { tankTypeLabels, tankLocationLabels } from "@/lib/booking-schema";
import { site } from "@/config/site";

export const runtime = "nodejs";

// Sehr einfaches In-Memory-Rate-Limit (pro Server-Instanz) gegen Spam.
const hits = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.ts > WINDOW_MS) {
    hits.set(ip, { count: 1, ts: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function buildEmail(data: import("@/lib/booking-schema").BookingInput) {
  const lines = [
    `Neue Anfrage über die Website (${site.name})`,
    "",
    `Leistung:        ${data.service}`,
    `Tankart:         ${tankTypeLabels[data.tankType]}`,
    `Standort Tank:   ${tankLocationLabels[data.tankLocation]}`,
    `Volumen/Größe:   ${data.tankVolume || "—"}`,
    `Objekt (Ort):    ${data.objectCity}`,
    `Wunschdatum:     ${data.preferredDate || "—"}`,
    `Zeitfenster:     ${data.timeWindow || "—"}`,
    "",
    "— Kontakt —",
    `Name:            ${data.name}`,
    `Telefon:         ${data.phone}`,
    `E-Mail:          ${data.email}`,
    "",
    "Nachricht:",
    data.message || "—",
  ];
  return lines.join("\n");
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validierung fehlgeschlagen.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Honeypot: gefülltes "company"-Feld => stiller Erfolg (Bot).
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const text = buildEmail(parsed.data);
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_TO_EMAIL || site.email;
  const from = process.env.BOOKING_FROM_EMAIL || "anfrage@example.com";

  // Demo-Modus ohne API-Key: Anfrage protokollieren statt versenden.
  if (!apiKey) {
    console.info(
      "[booking] Kein RESEND_API_KEY gesetzt – Demo-Modus. Anfrage:\n" + text,
    );
    return NextResponse.json({ ok: true, demo: true });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `${site.name} <${from}>`,
      to: [to],
      replyTo: parsed.data.email,
      subject: `Neue Anfrage: ${parsed.data.service} – ${parsed.data.name}`,
      text,
    });
    if (error) {
      console.error("[booking] Resend-Fehler:", error);
      return NextResponse.json({ ok: false, error: "Versand fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[booking] Unerwarteter Fehler:", err);
    return NextResponse.json({ ok: false, error: "Serverfehler." }, { status: 500 });
  }
}
