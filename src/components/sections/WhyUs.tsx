"use client";

import { ShieldCheck, Recycle, BadgeEuro, Clock, Award, MapPin } from "lucide-react";
import { site } from "@/config/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Counter } from "@/components/ui/Counter";
import { Reveal } from "@/components/ui/Reveal";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Zertifizierter Fachbetrieb nach WHG",
    text: "Wir arbeiten nach den gesetzlichen Vorgaben des Wasserhaushaltsgesetzes – überwacht und geprüft durch den TÜV Süd.",
  },
  {
    icon: Recycle,
    title: "Umweltgerechte Entsorgung",
    text: "Restheizöl, Ölschlamm und alle Materialien werden fachgerecht entsorgt – inklusive lückenloser Nachweise.",
  },
  {
    icon: BadgeEuro,
    title: "Transparente Festpreise",
    text: "Sie erhalten ein klares Angebot ohne versteckte Kosten – nach einer Begutachtung vor Ort.",
  },
  {
    icon: Clock,
    title: "Termintreu & sauber",
    text: "Wir halten Termine ein und hinterlassen einen sauberen Aufstellraum – das ist für uns Ehrensache.",
  },
];

interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  custom?: string;
}

const stats: Stat[] = [
  { value: 25, suffix: "+", label: "Jahre Erfahrung" },
  { value: 2000, suffix: "+", label: "demontierte Tanks" },
  { value: 100, suffix: "%", label: "WHG-konform" },
  { value: 1, label: "Ansprechpartner", custom: "Direkt" },
];

export function WhyUs() {
  return (
    <section id="warum" className="relative bg-steel-950 py-24 lg:py-32">
      <div className="container-page relative">
        <div className="grid items-start gap-14 lg:grid-cols-2">
          {/* Linke Spalte: Gründe */}
          <div>
            <SectionHeading
              align="left"
              eyebrow="Warum Krebs Tanksysteme"
              title={<>Vertrauen, das auf <span className="text-gradient">Zertifikaten</span> steht</>}
              subtitle="Als familiengeführter Fachbetrieb stehen wir mit unserem Namen für saubere, sichere und gesetzeskonforme Arbeit."
            />

            <div className="mt-10 space-y-5">
              {reasons.map((r, i) => (
                <Reveal key={r.title} delay={i * 0.06}>
                  <div className="flex gap-4 rounded-2xl border border-white/10 bg-steel-900/50 p-5 transition-colors hover:border-amber-500/30">
                    <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                      <r.icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{r.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-steel-400">{r.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Rechte Spalte: Stats + Badge */}
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <div className="border-shine relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-steel-900 to-steel-800 p-8 shadow-soft">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="font-display text-4xl font-extrabold text-white sm:text-5xl">
                        {s.custom ? (
                          s.custom
                        ) : (
                          <Counter to={s.value} suffix={s.suffix} prefix={s.prefix} />
                        )}
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-wider text-steel-400">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-300">
                    <Award className="h-4 w-4" /> {site.trust.whg}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-steel-200">
                    <ShieldCheck className="h-4 w-4 text-teal-400" /> TÜV Süd geprüft
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-steel-200">
                    <MapPin className="h-4 w-4 text-amber-400" /> Region {site.address.region}
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
