"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  CalendarCheck,
  CheckCircle2,
  Users,
  Loader2,
} from "lucide-react";
import { openingHours, restaurant } from "@/lib/restaurant";
import { Reveal } from "./ui/Reveal";

type FieldErrors = Record<string, string[]>;

const initialForm = {
  name: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  guests: "2",
  occasion: "",
  notes: "",
  company: "", // Honeypot
};

// Erzeugt 30-Minuten-Slots innerhalb der Öffnungszeiten eines Wochentags.
function slotsForDate(dateStr: string): string[] {
  if (!dateStr) return [];
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  const info = openingHours.find((o) => o.day === day);
  if (!info || info.ranges.length === 0) return [];

  const slots: string[] = [];
  for (const r of info.ranges) {
    // Letzte Reservierung 30 Min vor Schluss.
    for (let mins = r.from; mins <= r.to - 30; mins += 30) {
      const hh = String(Math.floor(mins / 60) % 24).padStart(2, "0");
      const mm = String(mins % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

export function Reservation() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [serverMessage, setServerMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const slots = useMemo(() => slotsForDate(form.date), [form.date]);
  const dateClosed = Boolean(form.date) && slots.length === 0;

  function update(field: keyof typeof initialForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrors({});
    setServerMessage("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: Number(form.guests) }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setStatus("success");
        setServerMessage(data.message);
        setForm(initialForm);
      } else {
        setStatus("error");
        setServerMessage(data.message ?? "Bitte überprüfe deine Eingaben.");
        if (data.errors) setErrors(data.errors as FieldErrors);
      }
    } catch {
      setStatus("error");
      setServerMessage(
        "Verbindung fehlgeschlagen. Bitte versuche es erneut oder ruf uns an.",
      );
    }
  }

  return (
    <section id="reservieren" className="section bg-sand/60">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
          {/* Linke Spalte: Telefon-Anbindung */}
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <span className="eyebrow">Tisch reservieren</span>
              <h2 className="text-3xl font-bold text-bark sm:text-4xl">
                Reserviere deinen Platz
              </h2>
              <p className="mt-4 text-bark/75">
                Sichere dir bequem in wenigen Sekunden einen Tisch. Du
                erhältst eine Bestätigung per E-Mail. Lieber persönlich?
                Wir sind telefonisch gern für dich da.
              </p>

              <a
                href={`tel:${restaurant.contact.phoneHref}`}
                className="mt-6 flex items-center gap-4 rounded-2xl border border-bark/10 bg-white/80 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-copper"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-copper/10 text-copper">
                  <Phone className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-sm text-bark/60">
                    Telefonisch reservieren
                  </span>
                  <span className="block text-lg font-bold text-bark">
                    {restaurant.contact.phoneDisplay}
                  </span>
                </span>
              </a>

              <div className="mt-4 flex items-start gap-3 rounded-xl bg-forest/5 p-4 text-sm text-bark/70">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                <span>
                  Größere Gruppen, Feiern oder unseren Bowlingstollen buchst du
                  am besten telefonisch – wir planen dein Event individuell.
                </span>
              </div>
            </div>
          </Reveal>

          {/* Rechte Spalte: Online-Formular */}
          <Reveal direction="left">
            <div className="card sm:p-8">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-forest/10 text-forest"
                    >
                      <CheckCircle2 className="h-9 w-9" />
                    </motion.span>
                    <h3 className="mt-5 text-2xl font-bold text-bark">
                      Anfrage gesendet!
                    </h3>
                    <p className="mt-3 max-w-sm text-bark/70">{serverMessage}</p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="btn-secondary mt-6"
                    >
                      Weitere Reservierung
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-5"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Name" error={errors.name}>
                        <input
                          className="field-input"
                          value={form.name}
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="Max Mustermann"
                          autoComplete="name"
                          required
                        />
                      </Field>
                      <Field label="Telefon" error={errors.phone}>
                        <input
                          className="field-input"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="0171 1234567"
                          autoComplete="tel"
                          required
                        />
                      </Field>
                    </div>

                    <Field label="E-Mail" error={errors.email}>
                      <input
                        className="field-input"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="max@beispiel.de"
                        autoComplete="email"
                        required
                      />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-3">
                      <Field label="Datum" error={errors.date}>
                        <input
                          className="field-input"
                          type="date"
                          min={today}
                          value={form.date}
                          onChange={(e) => {
                            update("date", e.target.value);
                            update("time", "");
                          }}
                          required
                        />
                      </Field>
                      <Field label="Uhrzeit" error={errors.time}>
                        <select
                          className="field-input"
                          value={form.time}
                          onChange={(e) => update("time", e.target.value)}
                          disabled={!form.date || dateClosed}
                          required
                        >
                          <option value="">
                            {!form.date
                              ? "Erst Datum wählen"
                              : dateClosed
                                ? "Geschlossen"
                                : "Bitte wählen"}
                          </option>
                          {slots.map((s) => (
                            <option key={s} value={s}>
                              {s} Uhr
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Personen" error={errors.guests}>
                        <select
                          className="field-input"
                          value={form.guests}
                          onChange={(e) => update("guests", e.target.value)}
                          required
                        >
                          {Array.from({ length: 19 }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? "Person" : "Personen"}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>
                    </div>

                    {dateClosed && (
                      <p className="rounded-lg bg-amber-100 px-4 py-2.5 text-sm text-amber-800">
                        An diesem Tag haben wir geschlossen. Bitte wähle einen
                        anderen Termin.
                      </p>
                    )}

                    <Field label="Anlass (optional)" error={errors.occasion}>
                      <input
                        className="field-input"
                        value={form.occasion}
                        onChange={(e) => update("occasion", e.target.value)}
                        placeholder="Geburtstag, Familienfeier …"
                      />
                    </Field>

                    <Field label="Anmerkungen (optional)" error={errors.notes}>
                      <textarea
                        className="field-input min-h-[90px] resize-y"
                        value={form.notes}
                        onChange={(e) => update("notes", e.target.value)}
                        placeholder="Allergien, Kinderstuhl, Sitzplatzwunsch …"
                      />
                    </Field>

                    {/* Honeypot – für Menschen unsichtbar */}
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="hidden"
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                    />

                    {status === "error" && serverMessage && (
                      <p className="rounded-lg bg-red-100 px-4 py-2.5 text-sm text-red-700">
                        {serverMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> Wird
                          gesendet …
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="h-5 w-5" /> Reservierung
                          anfragen
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-bark/55">
                      Mit dem Absenden stimmst du zu, dass wir deine Angaben zur
                      Bearbeitung der Reservierung verarbeiten.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error && error.length > 0 && (
        <span className="mt-1 block text-xs font-medium text-red-600">
          {error[0]}
        </span>
      )}
    </label>
  );
}
