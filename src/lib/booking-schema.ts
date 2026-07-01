import { z } from "zod";

export const tankLocations = ["keller", "erdverlegt", "freistehend", "unbekannt"] as const;
export const tankTypes = ["stahl", "gfk", "pe", "batterietank", "unbekannt"] as const;

export const bookingSchema = z.object({
  // Schritt 1 – Leistung
  service: z.string().min(1, "Bitte wählen Sie eine Leistung."),

  // Schritt 2 – Objektdaten
  tankType: z.enum(tankTypes, { errorMap: () => ({ message: "Bitte wählen." }) }),
  tankLocation: z.enum(tankLocations, { errorMap: () => ({ message: "Bitte wählen." }) }),
  tankVolume: z
    .string()
    .max(40, "Bitte kürzer angeben.")
    .optional()
    .or(z.literal("")),
  objectCity: z.string().min(2, "Bitte Ort/PLZ des Objekts angeben.").max(120),

  // Schritt 3 – Wunschtermin
  preferredDate: z.string().max(40).optional().or(z.literal("")),
  timeWindow: z.string().max(40).optional().or(z.literal("")),

  // Schritt 4 – Kontakt
  name: z.string().min(2, "Bitte Namen angeben.").max(120),
  phone: z.string().min(5, "Bitte Telefonnummer angeben.").max(40),
  email: z.string().email("Bitte gültige E-Mail-Adresse angeben."),
  message: z.string().max(2000, "Maximal 2000 Zeichen.").optional().or(z.literal("")),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte stimmen Sie der Datenverarbeitung zu." }),
  }),

  // Spam-Schutz (Honeypot) – wird serverseitig in der API-Route ausgewertet.
  // (Hier bewusst nicht per Schema abgelehnt, damit die Route "stillen Erfolg" zurückgeben kann.)
  company: z.string().max(200).optional().or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const tankTypeLabels: Record<(typeof tankTypes)[number], string> = {
  stahl: "Stahltank",
  gfk: "GFK-Tank",
  pe: "PE-/Kunststofftank",
  batterietank: "Batterietank (mehrere Behälter)",
  unbekannt: "Weiß ich nicht",
};

export const tankLocationLabels: Record<(typeof tankLocations)[number], string> = {
  keller: "Im Keller / Aufstellraum",
  erdverlegt: "Erdverlegt (im Erdreich)",
  freistehend: "Freistehend / oberirdisch",
  unbekannt: "Weiß ich nicht",
};
