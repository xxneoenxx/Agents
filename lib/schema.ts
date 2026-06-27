import { z } from "zod";

export const bookingSchema = z.object({
  service: z.string().min(1, "Bitte eine Leistung wählen"),
  plate: z.string().max(20).optional().or(z.literal("")),
  vehicleType: z.string().max(80).optional().or(z.literal("")),
  adr: z.enum(["ja", "nein", "unbekannt"]).default("unbekannt"),
  date: z.string().optional().or(z.literal("")),
  slot: z.string().optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  name: z.string().min(2, "Bitte Namen angeben").max(120),
  phone: z.string().min(5, "Bitte Telefonnummer angeben").max(40),
  email: z.string().email("Bitte gültige E-Mail angeben").max(160),
  message: z.string().max(2000).optional().or(z.literal("")),
  // Honeypot — muss leer bleiben
  website: z.string().max(0).optional().or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const callbackSchema = z.object({
  name: z.string().min(2, "Bitte Namen angeben").max(120),
  phone: z.string().min(5, "Bitte Telefonnummer angeben").max(40),
  topic: z.string().max(200).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type CallbackInput = z.infer<typeof callbackSchema>;
