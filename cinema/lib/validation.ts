import { z } from "zod";

// Maximal 10 Tickets pro Buchung.
export const MAX_SEATS = 10;

export const bookingSchema = z.object({
  showtimeId: z.string().min(3).max(80),
  seats: z
    .array(z.string().regex(/^[A-J][0-9]{1,2}$/, "Ungültiger Sitzplatz."))
    .min(1, "Bitte wähle mindestens einen Sitzplatz.")
    .max(MAX_SEATS, `Maximal ${MAX_SEATS} Plätze pro Buchung.`),
  name: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(80),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an."),
  phone: z
    .string()
    .trim()
    .min(5, "Bitte gib eine Telefonnummer an.")
    .max(40)
    .regex(/^[0-9+()/\s-]+$/, "Die Telefonnummer enthält ungültige Zeichen."),
  // Honeypot
  company: z.string().max(0).optional(),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;
