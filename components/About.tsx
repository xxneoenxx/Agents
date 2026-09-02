import { Reveal } from "./ui/Reveal";
import { CountUp } from "./ui/CountUp";
import { stats, restaurant } from "@/lib/restaurant";

export function About() {
  return (
    <section id="ueber-uns" className="section">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Reveal>
            <span className="eyebrow">Unsere Geschichte</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl font-bold leading-tight text-bark sm:text-4xl">
              Herzliche Gastlichkeit rund ums alte Silberbergwerk
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-6 space-y-4 text-bark/75">
              <p>
                Bereits seit Dezember {restaurant.foundedYear} heißen wir
                unsere Gäste im „Bauernhof zum Silberbergwerk“ willkommen. Was
                als kleine Ausflugsgaststätte begann, ist heute ein
                Erlebnisrestaurant mit eigener Pension – mitten im
                Zeitsprungland von Limbach-Oberfrohna.
              </p>
              <p>
                Bei uns treffen ehrliche, gut bürgerliche Küche und regionale
                Spezialitäten auf historisches Ambiente. Fisch, Wild, Lamm,
                Rind und Geflügel beziehen wir von Produzenten aus der Region –
                frisch, saisonal und mit Liebe zubereitet.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Animierte Kennzahlen-Widgets */}
        <Reveal direction="left">
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="card flex flex-col items-center justify-center text-center transition-transform duration-300 hover:-translate-y-1"
                style={{ transitionDelay: `${i * 30}ms` }}
              >
                <span className="font-serif text-4xl font-bold text-copper sm:text-5xl">
                  <CountUp end={s.value} suffix={s.suffix} />
                </span>
                <span className="mt-2 text-sm font-medium text-bark/70">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
