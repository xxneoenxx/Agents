"use client";

import { useEffect, useState } from "react";
import { Clock, Phone } from "lucide-react";
import { openingHours, formatRange, restaurant } from "@/lib/restaurant";
import { Reveal } from "./ui/Reveal";
import { LiveStatusBadge } from "./LiveStatusBadge";

export function OpeningHours() {
  const [todayDay, setTodayDay] = useState<number | null>(null);

  useEffect(() => {
    setTodayDay(new Date().getDay());
  }, []);

  return (
    <section id="oeffnungszeiten" className="section bg-bark text-cream">
      <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Reveal>
            <span className="eyebrow !text-gold">Wann wir für dich da sind</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl font-bold sm:text-4xl">Öffnungszeiten</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-md text-cream/75">
              Reserviere bequem online oder ruf uns einfach an – gerade an
              Wochenenden und Feiertagen empfehlen wir eine Reservierung.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <LiveStatusBadge />
              <a
                href={`tel:${restaurant.contact.phoneHref}`}
                className="inline-flex items-center gap-2 font-semibold text-gold transition hover:text-gold/80"
              >
                <Phone className="h-4 w-4" /> {restaurant.contact.phoneDisplay}
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal direction="left">
          <div className="rounded-2xl border border-cream/15 bg-cream/5 p-6 backdrop-blur sm:p-8">
            <div className="mb-4 flex items-center gap-2 text-gold">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Wochenübersicht
              </span>
            </div>
            <ul className="divide-y divide-cream/10">
              {openingHours.map((day) => {
                const isToday = todayDay === day.day;
                const closed = day.ranges.length === 0;
                return (
                  <li
                    key={day.day}
                    className={`flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition ${
                      isToday ? "bg-gold/15" : ""
                    }`}
                  >
                    <span
                      className={`flex items-center gap-2 font-medium ${
                        isToday ? "text-gold" : "text-cream/90"
                      }`}
                    >
                      {day.label}
                      {isToday && (
                        <span className="rounded-full bg-gold px-2 py-0.5 text-[0.65rem] font-bold uppercase text-bark">
                          Heute
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        closed
                          ? "text-sm text-cream/40"
                          : "text-right text-sm text-cream/85"
                      }
                    >
                      {closed
                        ? "Geschlossen"
                        : day.ranges.map((r) => formatRange(r)).join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
