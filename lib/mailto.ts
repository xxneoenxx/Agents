import { company, bookingServices } from "@/content/site";
import type { BookingInput, CallbackInput } from "./schema";

function serviceLabel(id: string) {
  return bookingServices.find((s) => s.id === id)?.label ?? id;
}

/** Vorbefüllter mailto:-Link als Fallback, falls die API/Mail nicht verfügbar ist. */
export function bookingMailto(data: BookingInput) {
  const subject = `Terminanfrage: ${serviceLabel(data.service)}`;
  const lines = [
    `Leistung: ${serviceLabel(data.service)}`,
    data.plate ? `Kennzeichen: ${data.plate}` : null,
    data.vehicleType ? `Fahrzeugtyp: ${data.vehicleType}` : null,
    `ADR: ${data.adr}`,
    data.date ? `Wunschtermin: ${data.date}` : null,
    data.slot ? `Zeitfenster: ${data.slot}` : null,
    "",
    data.company ? `Firma: ${data.company}` : null,
    `Name: ${data.name}`,
    `Telefon: ${data.phone}`,
    `E-Mail: ${data.email}`,
    data.message ? `\nNachricht:\n${data.message}` : null,
  ].filter(Boolean);
  return `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    lines.join("\n"),
  )}`;
}

export function callbackMailto(data: CallbackInput) {
  const subject = "Rückruf-Anfrage";
  const body = [
    `Name: ${data.name}`,
    `Telefon: ${data.phone}`,
    data.topic ? `Thema: ${data.topic}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
