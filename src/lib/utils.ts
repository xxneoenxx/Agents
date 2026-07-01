export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Sicherer localStorage-Zugriff. In manchen Umgebungen (z. B. iOS-Safari
 * Privat-Modus, strenge Tracking-Einstellungen) wirft der Zugriff eine
 * Exception – ungeschützt würde das die gesamte React-Hydration zum Absturz
 * bringen und die Seite leer lassen. Daher hier defensiv gekapselt.
 */
export function safeLocalGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* Speichern nicht möglich – unkritisch, Funktion läuft ohne Persistenz weiter. */
  }
}
