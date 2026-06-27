import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/schema";
import { bookingServices } from "@/content/site";
import { sendNotification } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit(`booking:${clientKey(req)}`).ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Bitte Eingaben prüfen.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const d = parsed.data;
  // Honeypot: gefüllt = Bot → still als Erfolg quittieren
  if (d.website) return NextResponse.json({ ok: true, delivered: true });

  const serviceLabel = bookingServices.find((s) => s.id === d.service)?.label ?? d.service;
  const text = [
    "Neue Terminanfrage über die Website",
    "================================",
    `Leistung:    ${serviceLabel}`,
    `Kennzeichen: ${d.plate || "—"}`,
    `Fahrzeugtyp: ${d.vehicleType || "—"}`,
    `ADR:         ${d.adr}`,
    `Wunschtermin:${d.date || "—"}`,
    `Zeitfenster: ${d.slot || "—"}`,
    "--------------------------------",
    `Firma:       ${d.company || "—"}`,
    `Name:        ${d.name}`,
    `Telefon:     ${d.phone}`,
    `E-Mail:      ${d.email}`,
    d.message ? `\nNachricht:\n${d.message}` : "",
  ].join("\n");

  const result = await sendNotification({
    subject: `Terminanfrage: ${serviceLabel} — ${d.name}`,
    text,
    replyTo: d.email,
  });

  return NextResponse.json({ ok: true, delivered: result.delivered });
}
