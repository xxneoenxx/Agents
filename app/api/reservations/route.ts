import { NextResponse } from "next/server";
import { reservationSchema } from "@/lib/validation";
import { MAX_GUESTS_PER_SLOT } from "@/lib/validation";
import { createReservation, countGuestsForSlot } from "@/lib/db";
import { sendReservationMails } from "@/lib/mailer";

// Reservierungen müssen serverseitig zur Laufzeit verarbeitet werden.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ungültige Anfrage." },
      { status: 400 },
    );
  }

  const parsed = reservationSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        ok: false,
        message: "Bitte überprüfe deine Eingaben.",
        errors: fieldErrors,
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Honeypot ausgelöst -> stillschweigend "Erfolg" vortäuschen (Bot-Schutz).
  if (data.company && data.company.length > 0) {
    return NextResponse.json({ ok: true, message: "Danke!" });
  }

  // Einfache Kapazitätsprüfung pro Zeitfenster.
  try {
    const alreadyBooked = countGuestsForSlot(data.date, data.time);
    if (alreadyBooked + data.guests > MAX_GUESTS_PER_SLOT) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Für diese Uhrzeit sind wir leider schon gut gebucht. Bitte wähle eine andere Zeit oder ruf uns kurz an – wir finden bestimmt einen Platz.",
        },
        { status: 409 },
      );
    }

    const reservation = createReservation({
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.date,
      time: data.time,
      guests: data.guests,
      occasion: data.occasion || undefined,
      notes: data.notes || undefined,
    });

    let mailed = false;
    try {
      mailed = await sendReservationMails(reservation);
    } catch (err) {
      // E-Mail-Fehler dürfen die Reservierung nicht verhindern.
      console.error("Reservierungs-Mail fehlgeschlagen:", err);
    }

    return NextResponse.json({
      ok: true,
      id: reservation.id,
      mailed,
      message:
        "Vielen Dank! Deine Reservierungsanfrage ist bei uns eingegangen. Wir bestätigen sie in Kürze.",
    });
  } catch (err) {
    console.error("Reservierung fehlgeschlagen:", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut oder ruf uns an.",
      },
      { status: 500 },
    );
  }
}
