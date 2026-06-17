import nodemailer from "nodemailer";
import { restaurant, fullAddress } from "./restaurant";
import type { Reservation } from "./db";

// ---------------------------------------------------------------------------
// E-Mail-Versand für Reservierungs-Bestätigungen.
// Ist KEIN SMTP konfiguriert, werden Mails übersprungen (kein Fehler) – die
// Reservierung wird trotzdem gespeichert und dem Gast bestätigt.
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

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export async function sendReservationMails(r: Reservation): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from =
    process.env.MAIL_FROM ??
    `${restaurant.name} <${restaurant.contact.email}>`;
  const restaurantMailbox = process.env.MAIL_TO ?? restaurant.contact.email;
  const dateLabel = formatDate(r.date);

  // 1) Bestätigung an den Gast
  const guestMail = transport.sendMail({
    from,
    to: r.email,
    subject: `Ihre Reservierungsanfrage – ${restaurant.name}`,
    text:
      `Hallo ${r.name},\n\n` +
      `vielen Dank für Ihre Reservierungsanfrage. Hier Ihre Angaben:\n\n` +
      `Datum:   ${dateLabel}\nUhrzeit: ${r.time} Uhr\nPersonen: ${r.guests}\n` +
      (r.occasion ? `Anlass:  ${r.occasion}\n` : "") +
      (r.notes ? `Hinweis: ${r.notes}\n` : "") +
      `\nWir melden uns kurzfristig zur Bestätigung. Bei Fragen erreichen Sie uns ` +
      `telefonisch unter ${restaurant.contact.phoneInternational}.\n\n` +
      `Herzliche Grüße\n${restaurant.name}\n${fullAddress}`,
  });

  // 2) Benachrichtigung an das Restaurant
  const ownerMail = transport.sendMail({
    from,
    to: restaurantMailbox,
    replyTo: r.email,
    subject: `Neue Reservierung: ${r.name} – ${dateLabel}, ${r.time} Uhr (${r.guests} Pers.)`,
    text:
      `Neue Reservierungsanfrage über die Website:\n\n` +
      `Name:     ${r.name}\nE-Mail:   ${r.email}\nTelefon:  ${r.phone}\n` +
      `Datum:    ${dateLabel}\nUhrzeit:  ${r.time} Uhr\nPersonen: ${r.guests}\n` +
      (r.occasion ? `Anlass:   ${r.occasion}\n` : "") +
      (r.notes ? `Hinweis:  ${r.notes}\n` : "") +
      `\nEingegangen am: ${r.created_at} (Reservierung #${r.id})`,
  });

  await Promise.all([guestMail, ownerMail]);
  return true;
}
