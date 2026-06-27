import { NextResponse } from "next/server";
import { callbackSchema } from "@/lib/schema";
import { sendNotification } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit(`callback:${clientKey(req)}`).ok) {
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

  const parsed = callbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Bitte Eingaben prüfen.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true, delivered: true });

  const text = [
    "Neue Rückruf-Anfrage über die Website",
    "================================",
    `Name:    ${d.name}`,
    `Telefon: ${d.phone}`,
    `Thema:   ${d.topic || "—"}`,
  ].join("\n");

  const result = await sendNotification({
    subject: `Rückruf-Anfrage — ${d.name}`,
    text,
  });

  return NextResponse.json({ ok: true, delivered: result.delivered });
}
