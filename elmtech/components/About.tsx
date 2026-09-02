import { Reveal } from "./ui/Reveal";
import { CountUp } from "./ui/CountUp";
import { milestones, stats, company } from "@/lib/elmtech";

export function About() {
  return (
    <section id="unternehmen" className="section bg-graphite-soft/60">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <span className="eyebrow">Über Elmtech</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Familienbetrieb mit Ingenieurs­geist
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 text-steel-200">{company.intro}</p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-4 text-steel-400">
                Geschäftsführung: {company.management}
              </p>
            </Reveal>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-cyan via-brand to-transparent" />
            <ul className="space-y-7">
              {milestones.map((m, i) => (
                <Reveal as="li" key={m.year} delay={i * 0.08} direction="left">
                  <div className="relative pl-8">
                    <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-cyan bg-graphite" />
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan">{m.year}</span>
                    <h3 className="mt-1 text-lg font-semibold">{m.title}</h3>
                    <p className="mt-1 text-sm text-steel-400">{m.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* Kennzahlen */}
        <Reveal delay={0.1}>
          <div className="mt-14 grid grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl font-bold text-gradient sm:text-5xl">
                  <CountUp end={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-sm text-steel-400">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
