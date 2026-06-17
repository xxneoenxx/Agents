import { z } from "zod";
import { callbackTopics, callbackWindows, isBusinessDay } from "./elmtech";

// ---------------------------------------------------------------------------
// Validierungsschema für Rückruf-Anfragen (Client & Server teilen es).
// ---------------------------------------------------------------------------

const windowIds = callbackWindows.map((w) => w.id) as [string, ...string[]];

export const callbackSchema = z
  .object({
    name: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(80),
    company: z.string().trim().max(120).optional().or(z.literal("")),
    phone: z
      .string()
      .trim()
      .min(5, "Bitte gib eine Telefonnummer an, unter der wir dich erreichen.")
      .max(40)
      .regex(/^[0-9+()/\s-]+$/, "Die Telefonnummer enthält ungültige Zeichen."),
    email: z
      .string()
      .trim()
      .email("Bitte gib eine gültige E-Mail-Adresse an.")
      .optional()
      .or(z.literal("")),
    topic: z.enum(callbackTopics as unknown as [string, ...string[]], {
      errorMap: () => ({ message: "Bitte wähle ein Anliegen." }),
    }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte wähle ein gültiges Datum."),
    window: z.enum(windowIds, {
      errorMap: () => ({ message: "Bitte wähle ein Zeitfenster." }),
    }),
    message: z.string().trim().max(800).optional().or(z.literal("")),
    // Honeypot-Feld gegen Spam. Bewusst OHNE max(0)-Validierung, damit ein
    // ausgefülltes Feld die Validierung passiert und in der API-Route still
    // als "ok" behandelt wird (Bots erhalten kein verwertbares Feedback).
    company2: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const [y, m, d] = data.date.split("-").map(Number);
    const chosen = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (chosen <= today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Bitte wähle einen Werktag in der Zukunft.",
      });
      return;
    }
    if (!isBusinessDay(chosen)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Rückrufe sind nur an Werktagen (Mo–Fr) möglich.",
      });
    }
  });

export type CallbackFormValues = z.infer<typeof callbackSchema>;
