import { NextResponse } from "next/server";
import { callbackSchema } from "@/lib/validation";
import { createCallback, countForSlot } from "@/lib/db";
import { sendCallbackMails } from "@/lib/mailer";
import { MAX_CALLBACKS_PER_WINDOW } from "@/lib/elmtech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  const parsed = callbackSchema.safeParse(payload);
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

  // Honeypot ausgelöst -> stillschweigend "Erfolg" vortäuschen (Bot-Schutz).
  if (data.company2 && data.company2.length > 0) {
    return NextResponse.json({ ok: true, reference: "EL-DEMO" });
  }

  try {
    // Einfache Kapazitätsprüfung pro Zeitfenster.
    const booked = countForSlot(data.date, data.window);
    if (booked >= MAX_CALLBACKS_PER_WINDOW) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Dieses Zeitfenster ist bereits ausgebucht. Bitte wähle ein anderes – oder ruf uns direkt an.",
        },
        { status: 409 },
      );
    }

    const callback = createCallback({
      name: data.name,
      company: data.company || undefined,
      phone: data.phone,
      email: data.email || undefined,
      topic: data.topic,
      date: data.date,
      window: data.window,
      message: data.message || undefined,
    });

    let mailed = false;
    try {
      mailed = await sendCallbackMails(callback);
    } catch (err) {
      console.error("Rückruf-Mail fehlgeschlagen:", err);
    }

    return NextResponse.json({
      ok: true,
      reference: callback.reference,
      mailed,
      message:
        "Vielen Dank! Wir rufen Sie wie gewünscht zurück. Eine Bestätigung ist unterwegs.",
    });
  } catch (err) {
    console.error("Rückruf fehlgeschlagen:", err);
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
