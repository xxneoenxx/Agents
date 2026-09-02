import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { createBooking } from "@/lib/db";
import { sendBookingMails } from "@/lib/mailer";
import {
  findShowtime,
  buildSeatLayout,
  seatPriceCents,
  type Seat,
} from "@/lib/cinema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Bitte überprüfe deine Eingaben.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Honeypot: still "ok" zurückgeben, aber nichts speichern.
  if (data.company && data.company.length > 0) {
    return NextResponse.json({ ok: true, reference: "CS-DEMO" });
  }

  // Vorstellung serverseitig verifizieren.
  const showtime = findShowtime(data.showtimeId);
  if (!showtime) {
    return NextResponse.json(
      { ok: false, message: "Diese Vorstellung ist nicht (mehr) verfügbar." },
      { status: 404 },
    );
  }

  // Preis serverseitig berechnen (Client-Werte werden ignoriert).
  const seatMap = new Map<string, Seat>();
  buildSeatLayout().forEach((row) => row.forEach((s) => seatMap.set(s.id, s)));

  let totalCents = 0;
  for (const seatId of data.seats) {
    const seat = seatMap.get(seatId);
    if (!seat) {
      return NextResponse.json(
        { ok: false, message: `Sitzplatz ${seatId} existiert nicht.` },
        { status: 422 },
      );
    }
    totalCents += seatPriceCents(showtime.priceCents, seat.type);
  }

  const result = createBooking({
    showtimeId: showtime.id,
    movieId: showtime.movieId,
    date: showtime.date,
    time: showtime.time,
    seats: data.seats,
    name: data.name,
    email: data.email,
    phone: data.phone,
    totalCents,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "seat_taken",
        takenSeats: result.takenSeats,
        message:
          "Einer deiner Plätze wurde gerade vergeben. Bitte wähle einen anderen Sitzplatz.",
      },
      { status: 409 },
    );
  }

  let mailed = false;
  try {
    mailed = await sendBookingMails({
      reference: result.reference,
      movieId: showtime.movieId,
      date: showtime.date,
      time: showtime.time,
      seats: data.seats,
      name: data.name,
      email: data.email,
      phone: data.phone,
      totalCents,
    });
  } catch (err) {
    console.error("Buchungs-Mail fehlgeschlagen:", err);
  }

  return NextResponse.json({
    ok: true,
    reference: result.reference,
    totalCents,
    seats: data.seats,
    mailed,
    message: "Buchung bestätigt! Wir haben dir alle Details per E-Mail gesendet.",
  });
}
