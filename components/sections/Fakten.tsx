"use client";

import { Counter } from "../ui/Counter";
import { Stagger, Reveal } from "../ui/Reveal";
import { fakten } from "@/content/site";

export function Fakten() {
  return (
    <section className="relative border-y border-alu-line/40 py-16">
      <div className="container-edge">
        <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-alu-line/70 lg:grid-cols-4">
          {fakten.map((f) => (
            <Reveal key={f.label} as="div">
              <div className="bg-stahl/40 px-6 py-10 text-center">
                <p className="font-display text-4xl font-extrabold text-metal sm:text-5xl">
                  <Counter to={f.value} suffix={f.suffix} />
                </p>
                <p className="mt-3 text-xs leading-snug text-alu/70">{f.label}</p>
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
