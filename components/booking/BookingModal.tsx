"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Phone, CalendarCheck, Loader2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Label, Input, Textarea, Select, FieldError } from "../ui/Field";
import { bookingServices, timeSlots, company } from "@/content/site";
import { bookingSchema, type BookingInput } from "@/lib/schema";
import { bookingMailto } from "@/lib/mailto";

const empty: BookingInput = {
  service: "",
  plate: "",
  vehicleType: "",
  adr: "unbekannt",
  date: "",
  slot: "",
  company: "",
  name: "",
  phone: "",
  email: "",
  message: "",
  website: "",
};

const steps = ["Leistung", "Fahrzeug", "Termin", "Kontakt", "Übersicht"];

export function BookingModal({
  open,
  onClose,
  presetService,
}: {
  open: boolean;
  onClose: () => void;
  presetService?: string;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingInput>(empty);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "fallback">("idle");

  useEffect(() => {
    if (open) {
      setStep(presetService ? 1 : 0);
      setData({ ...empty, service: presetService ?? "" });
      setErrors({});
      setStatus("idle");
    }
  }, [open, presetService]);

  const set = (patch: Partial<BookingInput>) => setData((d) => ({ ...d, ...patch }));

  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  function validateStep(): boolean {
    const e: Record<string, string | undefined> = {};
    if (step === 0 && !data.service) e.service = "Bitte eine Leistung wählen";
    if (step === 3) {
      if (data.name.trim().length < 2) e.name = "Bitte Namen angeben";
      if (data.phone.trim().length < 5) e.phone = "Bitte Telefonnummer angeben";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) e.email = "Bitte gültige E-Mail angeben";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    const parsed = bookingSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]]),
        ),
      );
      setStep(3);
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const out = await res.json();
      if (res.ok && out.delivered) setStatus("done");
      else setStatus("fallback");
    } catch {
      setStatus("fallback");
    }
  }

  const serviceLabel = bookingServices.find((s) => s.id === data.service)?.label ?? "—";

  return (
    <Modal open={open} onClose={onClose} eyebrow="Service-Termin" title="Termin buchen" size="lg">
      {status === "done" || status === "fallback" ? (
        <SuccessView status={status} data={data} onClose={onClose} />
      ) : (
        <>
          {/* Fortschritt */}
          <div className="mb-6 flex items-center gap-2">
            {steps.map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition ${
                    i < step
                      ? "border-adr bg-adr text-graphit"
                      : i === step
                        ? "border-adr text-adr"
                        : "border-alu-line text-alu-dark"
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 ${i < step ? "bg-adr" : "bg-alu-line"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="eyebrow-muted mb-4">
            Schritt {step + 1} / {steps.length} · {steps[step]}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {step === 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {bookingServices.map((s) => {
                    const active = data.service === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => set({ service: s.id })}
                        className={`rounded-lg border p-4 text-left transition ${
                          active
                            ? "border-adr bg-adr/10"
                            : "border-alu-line hover:border-alu-dark"
                        }`}
                      >
                        <span className="block font-display text-base font-semibold text-papier">
                          {s.label}
                        </span>
                        <span className="mt-1 block text-sm text-alu/70">{s.desc}</span>
                      </button>
                    );
                  })}
                  <FieldError msg={errors.service} />
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="plate">Kennzeichen</Label>
                    <Input
                      id="plate"
                      value={data.plate}
                      onChange={(e) => set({ plate: e.target.value })}
                      placeholder="z. B. C-NF 1234"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleType">Fahrzeugtyp</Label>
                    <Input
                      id="vehicleType"
                      value={data.vehicleType}
                      onChange={(e) => set({ vehicleType: e.target.value })}
                      placeholder="z. B. Tankauflieger"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Gefahrgut / ADR</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["ja", "nein", "unbekannt"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set({ adr: opt })}
                          className={`rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-widest transition ${
                            data.adr === opt
                              ? "border-adr bg-adr/10 text-adr"
                              : "border-alu-line text-alu hover:border-alu-dark"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="date">Wunschtermin</Label>
                    <Input
                      id="date"
                      type="date"
                      min={minDate}
                      value={data.date}
                      onChange={(e) => set({ date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slot">Zeitfenster</Label>
                    <Select
                      id="slot"
                      value={data.slot}
                      onChange={(e) => set({ slot: e.target.value })}
                    >
                      <option value="">Bitte wählen</option>
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <p className="sm:col-span-2 font-mono text-xs text-alu-dark">
                    Hinweis: Der Termin wird von uns telefonisch oder per E-Mail bestätigt.
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={data.website}
                    onChange={(e) => set({ website: e.target.value })}
                    className="hidden"
                    aria-hidden="true"
                  />
                  <div className="sm:col-span-2">
                    <Label htmlFor="company">Firma</Label>
                    <Input
                      id="company"
                      value={data.company}
                      onChange={(e) => set({ company: e.target.value })}
                      placeholder="Spedition Mustermann GmbH"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={(e) => set({ name: e.target.value })}
                      aria-invalid={!!errors.name}
                    />
                    <FieldError msg={errors.name} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={data.phone}
                      onChange={(e) => set({ phone: e.target.value })}
                      aria-invalid={!!errors.phone}
                    />
                    <FieldError msg={errors.phone} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => set({ email: e.target.value })}
                      aria-invalid={!!errors.email}
                    />
                    <FieldError msg={errors.email} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="message">Nachricht</Label>
                    <Textarea
                      id="message"
                      value={data.message}
                      onChange={(e) => set({ message: e.target.value })}
                      placeholder="Beschreiben Sie kurz Ihr Anliegen…"
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <dl className="divide-y divide-alu-line/60 rounded-lg border border-alu-line">
                  <SummaryRow k="Leistung" v={serviceLabel} />
                  <SummaryRow k="Kennzeichen" v={data.plate || "—"} />
                  <SummaryRow k="Fahrzeugtyp" v={data.vehicleType || "—"} />
                  <SummaryRow k="ADR" v={data.adr} />
                  <SummaryRow k="Wunschtermin" v={data.date || "—"} />
                  <SummaryRow k="Zeitfenster" v={data.slot || "—"} />
                  <SummaryRow k="Firma" v={data.company || "—"} />
                  <SummaryRow k="Name" v={data.name} />
                  <SummaryRow k="Telefon" v={data.phone} />
                  <SummaryRow k="E-Mail" v={data.email} />
                </dl>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-7 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 0}
              className={step === 0 ? "invisible" : ""}
            >
              <ArrowLeft size={16} /> Zurück
            </Button>

            {step < steps.length - 1 ? (
              <Button variant="primary" onClick={next}>
                Weiter <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={submit} disabled={status === "sending"}>
                {status === "sending" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Wird gesendet…
                  </>
                ) : (
                  <>
                    <CalendarCheck size={16} /> Termin anfragen
                  </>
                )}
              </Button>
            )}
          </div>

          <p className="mt-5 flex items-center gap-2 border-t border-alu-line/60 pt-4 font-mono text-xs text-alu-dark">
            <Phone size={14} className="text-adr" /> Lieber direkt? {""}
            <a href={`tel:${company.phoneHref}`} className="text-adr hover:underline">
              {company.phoneDisplay}
            </a>
          </p>
        </>
      )}
    </Modal>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="font-mono text-xs uppercase tracking-widest text-alu-dark">{k}</dt>
      <dd className="text-right text-sm text-papier">{v}</dd>
    </div>
  );
}

function SuccessView({
  status,
  data,
  onClose,
}: {
  status: "done" | "fallback";
  data: BookingInput;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-6 text-center"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-adr text-adr">
        <Check size={30} />
      </div>
      {status === "done" ? (
        <>
          <h3 className="text-2xl text-papier">Anfrage gesendet</h3>
          <p className="mt-3 max-w-md text-alu/80">
            Vielen Dank, {data.name.split(" ")[0] || "wir haben Ihre Anfrage erhalten"}. Wir melden
            uns zur Terminbestätigung telefonisch oder per E-Mail bei Ihnen.
          </p>
          <Button variant="outline" onClick={onClose} className="mt-7">
            Schließen
          </Button>
        </>
      ) : (
        <>
          <h3 className="text-2xl text-papier">Fast geschafft</h3>
          <p className="mt-3 max-w-md text-alu/80">
            Der automatische Versand ist gerade nicht verfügbar. Senden Sie Ihre Anfrage mit einem
            Klick als vorausgefüllte E-Mail — oder rufen Sie uns direkt an.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" href={bookingMailto(data)}>
              Als E-Mail senden
            </Button>
            <Button variant="outline" href={`tel:${company.phoneHref}`}>
              <Phone size={16} /> {company.phoneDisplay}
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
