import nodemailer from "nodemailer";
import { cinema, fullAddress, formatPrice, getMovie } from "./cinema";

// E-Mail-Bestätigung für Buchungen. Ohne SMTP-Konfiguration wird übersprungen.

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
  }).format(new Date(y, m - 1, d));
}

export type BookingMail = {
  reference: string;
  movieId: string;
  date: string;
  time: string;
  seats: string[];
  name: string;
  email: string;
  phone: string;
  totalCents: number;
};

export async function sendBookingMails(b: BookingMail): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const from = process.env.MAIL_FROM ?? `${cinema.name} <${cinema.contact.email}>`;
  const mailbox = process.env.MAIL_TO ?? cinema.contact.email;
  const movie = getMovie(b.movieId);
  const dateLabel = formatDate(b.date);

  const guestMail = transport.sendMail({
    from,
    to: b.email,
    subject: `Deine Kinokarten – ${movie?.title ?? "CineStar"} (${b.reference})`,
    text:
      `Hallo ${b.name},\n\n` +
      `vielen Dank für deine Buchung im ${cinema.fullName}!\n\n` +
      `Buchungsnummer: ${b.reference}\n` +
      `Film:    ${movie?.title ?? b.movieId}\n` +
      `Termin:  ${dateLabel}, ${b.time} Uhr\n` +
      `Plätze:  ${b.seats.join(", ")}\n` +
      `Summe:   ${formatPrice(b.totalCents)}\n\n` +
      `Bitte zeige diese Bestätigung (Buchungsnummer) an der Kasse vor.\n` +
      `${cinema.boxOfficeNote}\n\n` +
      `Adresse: ${fullAddress}\nTelefon: ${cinema.contact.phoneInternational}\n\n` +
      `Wir wünschen dir beste Unterhaltung!\n${cinema.fullName}`,
  });

  const ownerMail = transport.sendMail({
    from,
    to: mailbox,
    replyTo: b.email,
    subject: `Neue Buchung ${b.reference}: ${movie?.title ?? b.movieId} – ${dateLabel} ${b.time}`,
    text:
      `Neue Online-Buchung:\n\n` +
      `Nr.:     ${b.reference}\nFilm:    ${movie?.title ?? b.movieId}\n` +
      `Termin:  ${dateLabel}, ${b.time} Uhr\nPlätze:  ${b.seats.join(", ")}\n` +
      `Summe:   ${formatPrice(b.totalCents)}\n\n` +
      `Name:    ${b.name}\nE-Mail:  ${b.email}\nTelefon: ${b.phone}`,
  });

  await Promise.all([guestMail, ownerMail]);
  return true;
}
