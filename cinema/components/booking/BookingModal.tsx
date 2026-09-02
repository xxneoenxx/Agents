"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Ticket,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  Phone,
  Armchair,
  ArrowRight,
} from "lucide-react";
import {
  generateShowtimes,
  buildSeatLayout,
  seatPriceCents,
  formatPrice,
  formatDuration,
  toDateString,
  BOOKING_DAYS,
  cinema,
  type Movie,
  type Showtime,
  type Seat,
} from "@/lib/cinema";
import { SeatMap } from "./SeatMap";

type Step = "showtime" | "seats" | "details" | "done";

// Sitz-Typ-Nachschlagetabelle (für Preisanzeige im Client)
const seatTypeMap = new Map<string, Seat["type"]>();
buildSeatLayout().forEach((row) => row.forEach((s) => seatTypeMap.set(s.id, s.type)));

export function BookingModal({
  movie,
  initialShowtime,
  onClose,
}: {
  movie: Movie | null;
  initialShowtime?: Showtime;
  onClose: () => void;
}) {
  const open = Boolean(movie);

  return (
    <AnimatePresence>
      {open && movie && (
        <ModalInner movie={movie} initialShowtime={initialShowtime} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

function ModalInner({
  movie,
  initialShowtime,
  onClose,
}: {
  movie: Movie;
  initialShowtime?: Showtime;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(initialShowtime ? "seats" : "showtime");
  const [showtime, setShowtime] = useState<Showtime | undefined>(initialShowtime);
  const [activeDate, setActiveDate] = useState<string>(
    initialShowtime?.date ?? toDateString(new Date()),
  );

  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [justTaken, setJustTaken] = useState<string[]>([]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [confirmation, setConfirmation] = useState<{ reference: string; totalCents: number } | null>(null);

  // Alle Vorstellungen dieses Films, gruppiert nach Datum.
  const showtimesByDate = useMemo(() => {
    const all = generateShowtimes(BOOKING_DAYS).filter((s) => s.movieId === movie.id);
    const map = new Map<string, Showtime[]>();
    for (const s of all) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [movie.id]);

  const dates = useMemo(() => Array.from(showtimesByDate.keys()), [showtimesByDate]);

  // Belegte Sitze laden, sobald eine Vorstellung gewählt ist.
  useEffect(() => {
    if (!showtime) return;
    let cancelled = false;
    setLoadingSeats(true);
    fetch(`/api/showtimes/${encodeURIComponent(showtime.id)}/seats`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.ok) setBooked(new Set<string>(d.booked));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingSeats(false));
    return () => {
      cancelled = true;
    };
  }, [showtime]);

  // ESC zum Schließen + Body-Scroll sperren
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const totalCents = useMemo(() => {
    if (!showtime) return 0;
    let sum = 0;
    selected.forEach((id) => {
      const type = seatTypeMap.get(id) ?? "standard";
      sum += seatPriceCents(showtime.priceCents, type);
    });
    return sum;
  }, [selected, showtime]);

  function toggleSeat(seat: Seat) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else if (next.size < 10) next.add(seat.id);
      return next;
    });
  }

  function chooseShowtime(s: Showtime) {
    setShowtime(s);
    setSelected(new Set());
    setStep("seats");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!showtime) return;
    setSubmitting(true);
    setErrors({});
    setServerError("");
    setJustTaken([]);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showtimeId: showtime.id,
          seats: Array.from(selected),
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
        }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setConfirmation({ reference: data.reference, totalCents: data.totalCents });
        setStep("done");
      } else if (data.reason === "seat_taken") {
        // Sitze wurden zwischenzeitlich vergeben -> markieren & zurück zur Auswahl
        setBooked((prev) => new Set<string>([...prev, ...data.takenSeats]));
        setSelected((prev) => {
          const next = new Set(prev);
          data.takenSeats.forEach((s: string) => next.delete(s));
          return next;
        });
        setJustTaken(data.takenSeats);
        setServerError(data.message);
        setStep("seats");
      } else {
        setServerError(data.message ?? "Bitte überprüfe deine Eingaben.");
        if (data.errors) setErrors(data.errors);
      }
    } catch {
      setServerError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  const steps: Step[] = ["showtime", "seats", "details"];
  const stepIndex = steps.indexOf(step);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      />
      {/* Fenster */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Tickets buchen: ${movie.title}`}
        className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-3xl flex-col sm:inset-y-6 sm:top-10"
      >
        <div className="glass relative flex h-full flex-col overflow-hidden sm:rounded-3xl">
          {/* Kopf */}
          <div
            className="relative shrink-0 overflow-hidden p-5 sm:p-6"
            style={{ background: `linear-gradient(135deg, ${movie.gradient[0]}, ${movie.gradient[1]})` }}
          >
            <div className="absolute inset-0 bg-ink/40" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{movie.genre}</p>
                <h2 className="mt-1 font-display text-3xl leading-none">{movie.title}</h2>
                <p className="mt-2 text-sm text-white/70">
                  {formatDuration(movie.durationMin)} · FSK {movie.fsk}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Schließen"
                className="rounded-full bg-black/30 p-2 text-white/80 transition hover:bg-black/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Fortschritt */}
            {step !== "done" && (
              <div className="relative mt-5 flex gap-2">
                {["Vorstellung", "Sitzplätze", "Daten"].map((label, i) => (
                  <div key={label} className="flex flex-1 flex-col gap-1.5">
                    <div className="h-1 overflow-hidden rounded-full bg-white/20">
                      <motion.div
                        className="h-full bg-gold"
                        initial={{ width: 0 }}
                        animate={{ width: i <= stepIndex ? "100%" : 0 }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <span className={`text-[0.65rem] uppercase tracking-wider ${i <= stepIndex ? "text-gold" : "text-white/40"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inhalt */}
          <div className="grain relative flex-1 overflow-y-auto p-5 sm:p-7">
            <AnimatePresence mode="wait">
              {/* SCHRITT 1: Vorstellung */}
              {step === "showtime" && (
                <StepWrap key="showtime">
                  <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                    {dates.map((date) => (
                      <DateChip
                        key={date}
                        date={date}
                        active={date === activeDate}
                        onClick={() => setActiveDate(date)}
                      />
                    ))}
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {(showtimesByDate.get(activeDate) ?? []).map((s) => (
                      <motion.button
                        key={s.id}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => chooseShowtime(s)}
                        className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-gold/50"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-gold" />
                          <div>
                            <div className="text-lg font-semibold">{s.time} Uhr</div>
                            <div className="text-xs text-white/50">Saal {s.hall} · {s.format}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          ab {formatPrice(s.priceCents)}
                          <ArrowRight className="h-4 w-4 text-gold opacity-0 transition group-hover:opacity-100" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </StepWrap>
              )}

              {/* SCHRITT 2: Sitzplätze */}
              {step === "seats" && showtime && (
                <StepWrap key="seats">
                  <ShowtimeBar showtime={showtime} onChange={() => setStep("showtime")} />
                  {serverError && <ErrorBanner text={serverError} />}
                  {loadingSeats ? (
                    <div className="flex h-48 items-center justify-center text-white/50">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sitzplan wird geladen …
                    </div>
                  ) : (
                    <SeatMap booked={booked} selected={selected} onToggle={toggleSeat} justTaken={justTaken} />
                  )}
                </StepWrap>
              )}

              {/* SCHRITT 3: Daten */}
              {step === "details" && showtime && (
                <StepWrap key="details">
                  <ShowtimeBar showtime={showtime} onChange={() => setStep("seats")} />
                  <form onSubmit={submit} className="space-y-4" noValidate>
                    <Field label="Name" error={errors.name}>
                      <input
                        className="field-input"
                        value={form.name}
                        autoComplete="name"
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Max Mustermann"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="E-Mail" error={errors.email}>
                        <input
                          className="field-input"
                          type="email"
                          value={form.email}
                          autoComplete="email"
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="max@beispiel.de"
                        />
                      </Field>
                      <Field label="Telefon" error={errors.phone}>
                        <input
                          className="field-input"
                          type="tel"
                          value={form.phone}
                          autoComplete="tel"
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="0171 1234567"
                        />
                      </Field>
                    </div>
                    {/* Honeypot */}
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden
                      className="hidden"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                    {serverError && <ErrorBanner text={serverError} />}
                    <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs text-white/60">
                      <Phone className="h-4 w-4 text-gold" />
                      Lieber telefonisch buchen? Ruf uns an:{" "}
                      <a href={`tel:${cinema.contact.phoneHref}`} className="font-semibold text-gold">
                        {cinema.contact.phoneDisplay}
                      </a>
                    </div>
                    <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-70">
                      {submitting ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Buchung läuft …</>
                      ) : (
                        <><Ticket className="h-5 w-5" /> Kostenpflichtig buchen · {formatPrice(totalCents)}</>
                      )}
                    </button>
                  </form>
                </StepWrap>
              )}

              {/* SCHRITT 4: Bestätigung */}
              {step === "done" && confirmation && showtime && (
                <StepWrap key="done">
                  <div className="flex flex-col items-center py-6 text-center">
                    <motion.span
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="grid h-20 w-20 place-items-center rounded-full bg-gold/15 text-gold shadow-glow"
                    >
                      <CheckCircle2 className="h-11 w-11" />
                    </motion.span>
                    <h3 className="mt-5 text-3xl">Viel Vergnügen!</h3>
                    <p className="mt-2 max-w-sm text-white/70">{`Deine Buchung ist bestätigt.`}</p>

                    <div className="mt-6 w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm">
                      <Row label="Buchungsnummer" value={<span className="font-mono text-gold">{confirmation.reference}</span>} />
                      <Row label="Film" value={movie.title} />
                      <Row label="Termin" value={`${formatLongDate(showtime.date)}, ${showtime.time} Uhr`} />
                      <Row label="Saal" value={`Saal ${showtime.hall} · ${showtime.format}`} />
                      <Row label="Plätze" value={Array.from(selected).sort().join(", ")} />
                      <div className="border-t border-white/10 pt-3">
                        <Row label="Gesamt" value={<span className="text-base font-bold text-gold">{formatPrice(confirmation.totalCents)}</span>} />
                      </div>
                    </div>
                    <p className="mt-4 max-w-sm text-xs text-white/45">{cinema.boxOfficeNote}</p>
                    <button onClick={onClose} className="btn-ghost mt-6">Fertig</button>
                  </div>
                </StepWrap>
              )}
            </AnimatePresence>
          </div>

          {/* Fußzeile mit Auswahl-Übersicht (Schritt Sitzplätze) */}
          {step === "seats" && (
            <div className="shrink-0 border-t border-white/10 bg-ink-soft/80 p-4 backdrop-blur sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Armchair className="h-4 w-4 text-gold" />
                    {selected.size === 0
                      ? "Keine Plätze gewählt"
                      : `${selected.size} ${selected.size === 1 ? "Platz" : "Plätze"}: ${Array.from(selected).sort().join(", ")}`}
                  </div>
                  <div className="text-lg font-bold text-gold">{formatPrice(totalCents)}</div>
                </div>
                <button
                  disabled={selected.size === 0}
                  onClick={() => setStep("details")}
                  className="btn-gold disabled:opacity-40"
                >
                  Weiter <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// --- Hilfskomponenten -------------------------------------------------------

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function DateChip({ date, active, onClick }: { date: string; active: boolean; onClick: () => void }) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("de-DE", { weekday: "short" });
  const dayNum = dt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const isToday = date === toDateString(new Date());
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2 transition ${
        active ? "border-gold bg-gold/15 text-gold" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
      }`}
    >
      <span className="text-[0.7rem] uppercase tracking-wider">{isToday ? "Heute" : weekday}</span>
      <span className="text-sm font-semibold">{dayNum}</span>
    </button>
  );
}

function ShowtimeBar({ showtime, onChange }: { showtime: Showtime; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="mb-5 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm transition hover:border-gold/40"
    >
      <ChevronLeft className="h-4 w-4 text-gold" />
      <Calendar className="h-4 w-4 text-white/50" />
      <span className="font-medium">{formatLongDate(showtime.date)}</span>
      <span className="text-white/40">·</span>
      <Clock className="h-4 w-4 text-white/50" />
      <span className="font-medium">{showtime.time} Uhr</span>
      <span className="ml-auto text-xs text-white/50">Saal {showtime.hall} · {showtime.format}</span>
    </button>
  );
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error && error.length > 0 && <span className="mt-1 block text-xs font-medium text-crimson-soft">{error[0]}</span>}
    </label>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-xl border border-crimson/40 bg-crimson/15 px-4 py-2.5 text-sm text-crimson-soft"
    >
      {text}
    </motion.p>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/50">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function formatLongDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long" }).format(
    new Date(y, m - 1, d),
  );
}
