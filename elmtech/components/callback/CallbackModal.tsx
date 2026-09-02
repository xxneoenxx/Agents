"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  PhoneCall,
  CalendarClock,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import {
  callbackTopics,
  callbackWindows,
  upcomingBusinessDays,
  formatLongDate,
  windowLabel,
  company,
} from "@/lib/elmtech";

type Step = "topic" | "slot" | "details" | "done";

const steps: Step[] = ["topic", "slot", "details"];

export function CallbackModal({
  open,
  presetTopic,
  onClose,
}: {
  open: boolean;
  presetTopic?: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && <ModalInner presetTopic={presetTopic} onClose={onClose} />}
    </AnimatePresence>
  );
}

function ModalInner({ presetTopic, onClose }: { presetTopic?: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>(presetTopic ? "slot" : "topic");
  const [topic, setTopic] = useState<string>(presetTopic ?? "");
  const dates = useMemo(() => upcomingBusinessDays(), []);
  const [date, setDate] = useState<string>(dates[0]);
  const [win, setWin] = useState<string>("");

  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", message: "", company2: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [reference, setReference] = useState("");

  // ESC + Body-Scroll sperren
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const stepIndex = steps.indexOf(step);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setServerError("");
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, topic, date, window: win }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setReference(data.reference);
        setStep("done");
      } else {
        setServerError(data.message ?? "Bitte überprüfe deine Eingaben.");
        if (data.errors) setErrors(data.errors);
      }
    } catch {
      setServerError("Verbindung fehlgeschlagen. Bitte versuche es erneut oder ruf uns an.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        role="dialog"
        aria-modal="true"
        aria-label="Rückruf vereinbaren"
        className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-2xl flex-col sm:inset-y-8 sm:top-12"
      >
        <div className="glass relative flex h-full flex-col overflow-hidden bg-graphite-card/95 sm:rounded-3xl">
          {/* Kopf */}
          <div className="relative shrink-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-brand-deep/40 to-graphite p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/20 text-cyan">
                  <PhoneCall className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-display text-2xl leading-none">Rückruf vereinbaren</h2>
                  <p className="mt-1 text-sm text-steel-200">Wir melden uns zu Ihrer Wunschzeit.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Schließen"
                className="rounded-full bg-black/30 p-2 text-steel-200 transition hover:bg-black/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step !== "done" && (
              <div className="mt-5 flex gap-2">
                {["Anliegen", "Zeitfenster", "Kontakt"].map((label, i) => (
                  <div key={label} className="flex flex-1 flex-col gap-1.5">
                    <div className="h-1 overflow-hidden rounded-full bg-white/15">
                      <motion.div
                        className="h-full bg-cyan"
                        initial={{ width: 0 }}
                        animate={{ width: i <= stepIndex ? "100%" : 0 }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <span className={`text-[0.65rem] uppercase tracking-wider ${i <= stepIndex ? "text-cyan" : "text-steel-400/60"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inhalt */}
          <div className="relative flex-1 overflow-y-auto p-5 sm:p-7">
            <AnimatePresence mode="wait">
              {/* SCHRITT 1: Anliegen */}
              {step === "topic" && (
                <StepWrap key="topic">
                  <p className="mb-4 flex items-center gap-2 text-sm text-steel-200">
                    <ClipboardList className="h-4 w-4 text-cyan" /> Worum geht es?
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {callbackTopics.map((t) => (
                      <motion.button
                        key={t}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setTopic(t);
                          setStep("slot");
                        }}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan/50"
                      >
                        <span className="font-medium">{t}</span>
                        <ArrowRight className="h-4 w-4 text-cyan" />
                      </motion.button>
                    ))}
                  </div>
                </StepWrap>
              )}

              {/* SCHRITT 2: Zeitfenster */}
              {step === "slot" && (
                <StepWrap key="slot">
                  <BackBar label={topic} onBack={() => setStep("topic")} />
                  <p className="mb-3 flex items-center gap-2 text-sm text-steel-200">
                    <CalendarClock className="h-4 w-4 text-cyan" /> Wann dürfen wir anrufen?
                  </p>
                  <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                    {dates.map((d) => (
                      <DateChip key={d} date={d} active={d === date} onClick={() => setDate(d)} />
                    ))}
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {callbackWindows.map((w) => (
                      <motion.button
                        key={w.id}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setWin(w.id);
                          setStep("details");
                        }}
                        className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                          win === w.id ? "border-cyan bg-cyan/10" : "border-white/10 bg-white/5 hover:border-cyan/50"
                        }`}
                      >
                        <span className="font-medium">{w.label}</span>
                        <ArrowRight className="h-4 w-4 text-cyan" />
                      </motion.button>
                    ))}
                  </div>
                </StepWrap>
              )}

              {/* SCHRITT 3: Kontakt */}
              {step === "details" && (
                <StepWrap key="details">
                  <BackBar
                    label={`${topic} · ${formatLongDate(date)}, ${windowLabel(win)}`}
                    onBack={() => setStep("slot")}
                  />
                  <form onSubmit={submit} className="space-y-4" noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Name" error={errors.name}>
                        <input
                          className="field-input"
                          value={form.name}
                          autoComplete="name"
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="Max Mustermann"
                        />
                      </Field>
                      <Field label="Firma (optional)" error={errors.company}>
                        <input
                          className="field-input"
                          value={form.company}
                          autoComplete="organization"
                          onChange={(e) => update("company", e.target.value)}
                          placeholder="Musterbau GmbH"
                        />
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Telefon" error={errors.phone}>
                        <input
                          className="field-input"
                          type="tel"
                          value={form.phone}
                          autoComplete="tel"
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="0151 23456789"
                        />
                      </Field>
                      <Field label="E-Mail (optional)" error={errors.email}>
                        <input
                          className="field-input"
                          type="email"
                          value={form.email}
                          autoComplete="email"
                          onChange={(e) => update("email", e.target.value)}
                          placeholder="max@firma.de"
                        />
                      </Field>
                    </div>
                    <Field label="Ihr Anliegen (optional)" error={errors.message}>
                      <textarea
                        className="field-input min-h-[90px] resize-y"
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        placeholder="Projekt, Maße, Stückzahl, Anwendung …"
                      />
                    </Field>
                    {/* Honeypot */}
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden
                      className="hidden"
                      value={form.company2}
                      onChange={(e) => update("company2", e.target.value)}
                    />
                    {serverError && (
                      <p className="rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm text-red-300">
                        {serverError}
                      </p>
                    )}
                    <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs text-steel-200">
                      <Phone className="h-4 w-4 text-cyan" />
                      Lieber sofort sprechen?{" "}
                      <a href={`tel:${company.contact.phoneHref}`} className="font-semibold text-cyan">
                        {company.contact.phoneDisplay}
                      </a>
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-70">
                      {submitting ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Wird gesendet …</>
                      ) : (
                        <><PhoneCall className="h-5 w-5" /> Rückruf anfordern</>
                      )}
                    </button>
                  </form>
                </StepWrap>
              )}

              {/* SCHRITT 4: Bestätigung */}
              {step === "done" && (
                <StepWrap key="done">
                  <div className="flex flex-col items-center py-6 text-center">
                    <motion.span
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="grid h-20 w-20 place-items-center rounded-full bg-brand/15 text-cyan shadow-glow"
                    >
                      <CheckCircle2 className="h-11 w-11" />
                    </motion.span>
                    <h3 className="mt-5 text-3xl">Rückruf notiert!</h3>
                    <p className="mt-2 max-w-sm text-steel-200">
                      Vielen Dank. Wir melden uns wie gewünscht bei Ihnen.
                    </p>
                    <div className="mt-6 w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm">
                      <Row label="Referenz" value={<span className="font-mono text-cyan">{reference}</span>} />
                      <Row label="Anliegen" value={topic} />
                      <Row label="Wunschzeit" value={`${formatLongDate(date)}, ${windowLabel(win)}`} />
                    </div>
                    <button onClick={onClose} className="btn-ghost mt-6">Fertig</button>
                  </div>
                </StepWrap>
              )}
            </AnimatePresence>
          </div>
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

function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="mb-5 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm transition hover:border-cyan/40"
    >
      <ChevronLeft className="h-4 w-4 text-cyan" />
      <span className="truncate font-medium text-steel-200">{label}</span>
    </button>
  );
}

function DateChip({ date, active, onClick }: { date: string; active: boolean; onClick: () => void }) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("de-DE", { weekday: "short" });
  const dayNum = dt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2 transition ${
        active ? "border-cyan bg-cyan/10 text-cyan" : "border-white/10 bg-white/5 text-steel-200 hover:border-white/25"
      }`}
    >
      <span className="text-[0.7rem] uppercase tracking-wider">{weekday}</span>
      <span className="text-sm font-semibold">{dayNum}</span>
    </button>
  );
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error && error.length > 0 && <span className="mt-1 block text-xs font-medium text-red-300">{error[0]}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-steel-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
