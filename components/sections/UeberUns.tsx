"use client";

import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { ImageSlot } from "../ui/ImageSlot";
import { ueberUns, company } from "@/content/site";

export function UeberUns() {
  return (
    <section id="werk" className="relative scroll-mt-20 border-t border-alu-line/40 py-24 md:py-32">
      <div className="container-edge grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <SectionHeader index="05" eyebrow={ueberUns.eyebrow} title={ueberUns.title} />
          <div className="mt-6 space-y-4">
            {ueberUns.body.map((p) => (
              <Reveal key={p.slice(0, 24)}>
                <p className="text-base leading-relaxed text-alu/80">{p}</p>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <p className="eyebrow-muted mb-4">Geschäftsführung</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ueberUns.leadership.map((l) => (
                <div key={l.name} className="metal-panel rounded-xl px-5 py-4">
                  <p className="font-display text-base font-semibold text-papier">{l.name}</p>
                  <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-adr">
                    {l.role}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-6">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-alu-line/70">
              {[
                { k: "Gegründet", v: String(company.foundedYear) },
                { k: "Standort", v: `${company.address.city}, Sachsen` },
                { k: "Register", v: company.hrb },
                { k: "Vormals", v: company.predecessor },
              ].map((row) => (
                <div key={row.k} className="bg-stahl/40 px-5 py-4">
                  <dt className="font-mono text-[0.65rem] uppercase tracking-widest text-alu-dark">
                    {row.k}
                  </dt>
                  <dd className="mt-1 text-sm text-papier">{row.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal>
            <ImageSlot
              name="werkstatt"
              className="aspect-[5/6] rounded-2xl border border-alu-line/70"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
