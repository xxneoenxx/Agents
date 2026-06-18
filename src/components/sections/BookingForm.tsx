"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Phone,
  AlertCircle,
} from "lucide-react";
import {
  bookingSchema,
  type BookingInput,
  tankTypes,
  tankLocations,
  tankTypeLabels,
  tankLocationLabels,
} from "@/lib/booking-schema";
import { zodResolver } from "@/lib/zod-resolver";
import { services } from "@/config/services";
import { site } from "@/config/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type StepFields = (keyof BookingInput)[];

const stepConfig: { title: string; fields: StepFields }[] = [
  { title: "Leistung", fields: ["service"] },
  { title: "Objektdaten", fields: ["tankType", "tankLocation", "objectCity"] },
  { title: "Wunschtermin", fields: [] },
  { title: "Kontakt", fields: ["name", "phone", "email", "consent"] },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-steel-950/60 px-4 py-3 text-white placeholder:text-steel-500 transition-colors focus:border-amber-400/60 focus:outline-none";
const labelClass = "mb-2 block text-sm font-medium text-steel-200";
const errClass = "mt-1.5 flex items-center gap-1.5 text-xs text-red-400";

export function BookingForm() {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    mode: "onTouched",
    defaultValues: {
      service: "",
      tankType: "unbekannt",
      tankLocation: "unbekannt",
      tankVolume: "",
      objectCity: "",
      preferredDate: "",
      timeWindow: "",
      name: "",
      phone: "",
      email: "",
      message: "",
      consent: false as unknown as true,
      company: "",
    },
  });

  const selectedService = watch("service");

  const next = async () => {
    const valid = await trigger(stepConfig[step].fields as (keyof BookingInput)[]);
    if (valid) setStep((s) => Math.min(s + 1, stepConfig.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: BookingInput) => {
    setStatus("sending");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const progress = ((step + 1) / stepConfig.length) * 100;

  return (
    <section id="anfrage" className="relative overflow-hidden bg-steel-950 py-24 lg:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="container-page relative">
        <SectionHeading
          eyebrow="Anfrage / Terminbuchung"
          title={<>Ihr <span className="text-gradient">Festpreis-Angebot</span> in wenigen Schritten</>}
          subtitle="Schildern Sie uns kurz Ihr Vorhaben. Wir melden uns zeitnah mit einem unverbindlichen Angebot."
        />

        <div className="mx-auto mt-14 max-w-2xl">
          <div className="border-shine rounded-3xl">
            <div className="rounded-3xl border border-white/10 bg-steel-900/70 p-6 backdrop-blur-sm sm:p-9">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-10 text-center"
                  >
                    <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-teal-500/15 text-teal-400">
                      <CheckCircle2 className="h-9 w-9" />
                    </div>
                    <h3 className="font-display text-2xl font-bold text-white">Vielen Dank!</h3>
                    <p className="mx-auto mt-3 max-w-md text-steel-300">
                      Ihre Anfrage ist bei uns eingegangen. Wir melden uns in der Regel innerhalb
                      eines Werktags bei Ihnen. Bei dringenden Anliegen erreichen Sie uns telefonisch.
                    </p>
                    <div className="mt-7">
                      <Button href={site.phone.href} variant="outline">
                        <Phone className="h-4 w-4" /> {site.phone.display}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit(onSubmit)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    noValidate
                  >
                    {/* Fortschritt */}
                    <div className="mb-8">
                      <div className="mb-3 flex justify-between text-xs font-medium text-steel-400">
                        {stepConfig.map((s, i) => (
                          <span key={s.title} className={cn(i <= step && "text-amber-400")}>
                            {s.title}
                          </span>
                        ))}
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-teal-400"
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>

                    {/* Honeypot (versteckt) */}
                    <div className="hidden" aria-hidden>
                      <label>
                        Firma (bitte freilassen)
                        <input type="text" tabIndex={-1} autoComplete="off" {...register("company")} />
                      </label>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* SCHRITT 1 – Leistung */}
                        {step === 0 && (
                          <fieldset>
                            <legend className={labelClass}>Worum geht es?</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {services.map((s) => (
                                <label
                                  key={s.id}
                                  className={cn(
                                    "cursor-pointer rounded-xl border p-4 transition-all",
                                    selectedService === s.title
                                      ? "border-amber-400/70 bg-amber-500/10"
                                      : "border-white/10 bg-steel-950/40 hover:border-white/25",
                                  )}
                                >
                                  <input
                                    type="radio"
                                    value={s.title}
                                    className="sr-only"
                                    {...register("service")}
                                  />
                                  <span className="block text-sm font-semibold text-white">{s.station}</span>
                                  <span className="mt-1 block text-xs text-steel-400">{s.short}</span>
                                </label>
                              ))}
                            </div>
                            {errors.service && (
                              <p className={errClass}>
                                <AlertCircle className="h-3.5 w-3.5" />
                                {errors.service.message}
                              </p>
                            )}
                          </fieldset>
                        )}

                        {/* SCHRITT 2 – Objektdaten */}
                        {step === 1 && (
                          <div className="space-y-5">
                            <div>
                              <label className={labelClass}>Tankart</label>
                              <select className={inputClass} {...register("tankType")}>
                                {tankTypes.map((t) => (
                                  <option key={t} value={t}>
                                    {tankTypeLabels[t]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Standort des Tanks</label>
                              <select className={inputClass} {...register("tankLocation")}>
                                {tankLocations.map((t) => (
                                  <option key={t} value={t}>
                                    {tankLocationLabels[t]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>
                                  Volumen / Größe <span className="text-steel-500">(optional)</span>
                                </label>
                                <input
                                  className={inputClass}
                                  placeholder="z. B. 5.000 l"
                                  {...register("tankVolume")}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>Ort / PLZ des Objekts</label>
                                <input
                                  className={inputClass}
                                  placeholder="z. B. 09390 Gornsdorf"
                                  {...register("objectCity")}
                                />
                                {errors.objectCity && (
                                  <p className={errClass}>
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {errors.objectCity.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SCHRITT 3 – Wunschtermin */}
                        {step === 2 && (
                          <div className="space-y-5">
                            <p className="text-sm text-steel-400">
                              Wann passt es Ihnen am besten? (Unverbindlich – wir stimmen den Termin
                              gemeinsam ab.)
                            </p>
                            <div className="grid gap-5 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Wunschdatum (optional)</label>
                                <input type="date" className={inputClass} {...register("preferredDate")} />
                              </div>
                              <div>
                                <label className={labelClass}>Zeitfenster</label>
                                <select className={inputClass} {...register("timeWindow")}>
                                  <option value="">Keine Präferenz</option>
                                  <option value="vormittags">Vormittags</option>
                                  <option value="nachmittags">Nachmittags</option>
                                  <option value="ganztags">Ganztags flexibel</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SCHRITT 4 – Kontakt */}
                        {step === 3 && (
                          <div className="space-y-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Name</label>
                                <input className={inputClass} placeholder="Vor- und Nachname" {...register("name")} />
                                {errors.name && (
                                  <p className={errClass}>
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {errors.name.message}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className={labelClass}>Telefon</label>
                                <input className={inputClass} placeholder="Für den Rückruf" {...register("phone")} />
                                {errors.phone && (
                                  <p className={errClass}>
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {errors.phone.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className={labelClass}>E-Mail</label>
                              <input
                                type="email"
                                className={inputClass}
                                placeholder="ihre@email.de"
                                {...register("email")}
                              />
                              {errors.email && (
                                <p className={errClass}>
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {errors.email.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className={labelClass}>
                                Nachricht <span className="text-steel-500">(optional)</span>
                              </label>
                              <textarea
                                rows={4}
                                className={cn(inputClass, "resize-none")}
                                placeholder="Beschreiben Sie kurz Ihr Anliegen…"
                                {...register("message")}
                              />
                            </div>
                            <label className="flex items-start gap-3 text-sm text-steel-300">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 flex-none accent-amber-500"
                                {...register("consent")}
                              />
                              <span>
                                Ich willige ein, dass meine Angaben zur Bearbeitung der Anfrage
                                verarbeitet werden. Details in der{" "}
                                <a href="/datenschutz" className="text-amber-400 underline">
                                  Datenschutzerklärung
                                </a>
                                .
                              </span>
                            </label>
                            {errors.consent && (
                              <p className={errClass}>
                                <AlertCircle className="h-3.5 w-3.5" />
                                {errors.consent.message as string}
                              </p>
                            )}
                            {status === "error" && (
                              <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut
                                oder rufen Sie uns an: {site.phone.display}.
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between gap-4">
                      {step > 0 ? (
                        <Button type="button" variant="ghost" onClick={back}>
                          <ArrowLeft className="h-4 w-4" /> Zurück
                        </Button>
                      ) : (
                        <span />
                      )}

                      {step < stepConfig.length - 1 ? (
                        <Button type="button" onClick={next}>
                          Weiter <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button type="submit" variant="primary" {...(status === "sending" ? { disabled: true } : {})}>
                          {status === "sending" ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Senden…
                            </>
                          ) : (
                            <>Anfrage absenden <ArrowRight className="h-4 w-4" /></>
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-steel-500">
            Lieber persönlich? Rufen Sie uns an unter{" "}
            <a href={site.phone.href} className="text-amber-400">
              {site.phone.display}
            </a>{" "}
            oder mobil{" "}
            <a href={site.mobile.href} className="text-amber-400">
              {site.mobile.display}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
