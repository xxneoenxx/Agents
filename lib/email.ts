import { Resend } from "resend";
import { company } from "@/content/site";

const apiKey = process.env.RESEND_API_KEY;
const to = process.env.BOOKING_TO_EMAIL || company.email;
const from = process.env.BOOKING_FROM_EMAIL || "Website <onboarding@resend.dev>";

export type MailResult = { delivered: boolean; reason?: string };

/**
 * Versendet eine Benachrichtigung per Resend.
 * Ohne RESEND_API_KEY wird nichts versendet (delivered:false) — der Client
 * bietet dann den mailto:-Fallback an, sodass keine Anfrage verloren geht.
 */
export async function sendNotification(opts: {
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<MailResult> {
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY fehlt — Anfrage nicht per Mail versendet. Inhalt:\n" + opts.text,
    );
    return { delivered: false, reason: "no_api_key" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: opts.subject,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    if (error) {
      console.error("[email] Resend-Fehler:", error);
      return { delivered: false, reason: "send_error" };
    }
    return { delivered: true };
  } catch (err) {
    console.error("[email] Ausnahme beim Versand:", err);
    return { delivered: false, reason: "exception" };
  }
}
