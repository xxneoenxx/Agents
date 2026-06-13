import { z } from "zod";
import { openingHours } from "./restaurant";

// ---------------------------------------------------------------------------
// Validierungsschema für eingehende Reservierungen (Client & Server teilen es).
// ---------------------------------------------------------------------------

export const MAX_GUESTS_PER_SLOT = 40; // einfache Gesamtkapazität pro Zeitfenster

export const reservationSchema = z
  .object({
    name: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(80),
    email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an."),
    phone: z
      .string()
      .trim()
      .min(5, "Bitte gib eine Telefonnummer an, unter der wir dich erreichen.")
      .max(40)
      .regex(/^[0-9+()/\s-]+$/, "Die Telefonnummer enthält ungültige Zeichen."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte wähle ein gültiges Datum."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Bitte wähle eine gültige Uhrzeit."),
    guests: z.coerce
      .number()
      .int()
      .min(1, "Mindestens 1 Gast.")
      .max(20, "Für Gruppen ab 20 Personen rufe uns bitte direkt an."),
    occasion: z.string().trim().max(60).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    // Honeypot-Feld gegen Spam – muss leer bleiben.
    company: z.string().max(0).optional(),
  })
  .superRefine((data, ctx) => {
    // Datum darf nicht in der Vergangenheit liegen.
    const [y, m, d] = data.date.split("-").map(Number);
    const chosen = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (chosen < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Das Datum liegt in der Vergangenheit.",
      });
      return;
    }

    // Prüfen, ob das Restaurant an Wochentag + Uhrzeit geöffnet ist.
    const [hh, mm] = data.time.split(":").map(Number);
    const minutes = hh * 60 + mm;
    const dayInfo = openingHours.find((o) => o.day === chosen.getDay());
    const isWithin =
      dayInfo?.ranges.some((r) => minutes >= r.from && minutes <= r.to - 30) ?? false;
    if (!isWithin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message:
          "Zu dieser Zeit haben wir leider geschlossen. Bitte wähle eine Uhrzeit innerhalb unserer Öffnungszeiten.",
      });
    }
  });

export type ReservationFormValues = z.infer<typeof reservationSchema>;
