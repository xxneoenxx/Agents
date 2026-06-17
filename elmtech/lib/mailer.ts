import nodemailer from "nodemailer";
import { company, fullAddress, windowLabel, formatLongDate } from "./elmtech";
import type { Callback } from "./db";

// ---------------------------------------------------------------------------
// E-Mail-Versand für Rückruf-Bestätigungen.
// Ohne SMTP-Konfiguration werden Mails übersprungen (kein Fehler) – die
// Anfrage wird trotzdem gespeichert und dem Kunden bestätigt.
// ---------------------------------------------------------------------------

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendCallbackMails(c: Callback): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from = process.env.MAIL_FROM ?? `${company.name} <${company.contact.email}>`;
  const mailbox = process.env.MAIL_TO ?? company.contact.email;
  const dateLabel = formatLongDate(c.date);
  const slot = windowLabel(c.window);

  // Benachrichtigung an Elmtech (immer)
  const ownerMail = transport.sendMail({
    from,
    to: mailbox,
    replyTo: c.email || undefined,
    subject: `Neue Rückruf-Anfrage ${c.reference}: ${c.topic} (${dateLabel}, ${slot})`,
    text:
      `Neue Rückruf-Anfrage über die Website:\n\n` +
      `Referenz:   ${c.reference}\n` +
      `Anliegen:   ${c.topic}\n` +
      `Wunschzeit: ${dateLabel}, ${slot}\n\n` +
      `Name:       ${c.name}\n` +
      (c.company ? `Firma:      ${c.company}\n` : "") +
      `Telefon:    ${c.phone}\n` +
      (c.email ? `E-Mail:     ${c.email}\n` : "") +
      (c.message ? `\nNachricht:\n${c.message}\n` : "") +
      `\nEingegangen am: ${c.created_at}`,
  });

  const mails = [ownerMail];

  // Bestätigung an den Kunden (nur wenn E-Mail angegeben)
  if (c.email) {
    mails.push(
      transport.sendMail({
        from,
        to: c.email,
        subject: `Ihre Rückruf-Anfrage bei ${company.short} (${c.reference})`,
        text:
          `Hallo ${c.name},\n\n` +
          `vielen Dank für Ihre Rückruf-Anfrage. Wir melden uns wie gewünscht:\n\n` +
          `Anliegen:   ${c.topic}\n` +
          `Wunschzeit: ${dateLabel}, ${slot}\n` +
          `Referenz:   ${c.reference}\n\n` +
          `Sollte sich etwas ändern, erreichen Sie uns direkt unter ${company.contact.phoneInternational}.\n\n` +
          `Herzliche Grüße\n${company.name}\n${fullAddress}`,
      }),
    );
  }

  await Promise.all(mails);
  return true;
}
