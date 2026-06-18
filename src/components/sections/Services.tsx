"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { services, featuredServiceIds, type Service } from "@/config/services";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

function TiltCard({ service, index }: { service: Service; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const accentText = service.accent === "amber" ? "text-amber-400" : "text-teal-400";
  const accentBg = service.accent === "amber" ? "bg-amber-500/10" : "bg-teal-500/10";
  const accentBorder = service.accent === "amber" ? "border-amber-500/30" : "border-teal-500/30";

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="border-shine group relative rounded-3xl"
    >
      <div className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-steel-900/60 p-7 backdrop-blur-sm transition-colors duration-300 group-hover:bg-steel-900/90">
        <div
          className={cn(
            "mb-6 grid h-14 w-14 place-items-center rounded-2xl border transition-transform duration-300 group-hover:scale-110",
            accentBg,
            accentBorder,
          )}
        >
          <Icon name={service.icon} className={cn("h-7 w-7", accentText)} />
        </div>

        <h3 className="font-display text-xl font-bold text-white">{service.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-steel-400">{service.short}</p>

        <ul className="mt-5 space-y-2">
          {service.bullets.slice(0, 3).map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-steel-300">
              <span className={cn("mt-1.5 h-1.5 w-1.5 flex-none rounded-full", service.accent === "amber" ? "bg-amber-400" : "bg-teal-400")} />
              {b}
            </li>
          ))}
        </ul>

        <a
          href="#anfrage"
          className={cn(
            "mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors",
            accentText,
          )}
        >
          Anfragen
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>
    </motion.div>
  );
}

export function Services() {
  const featured = featuredServiceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));

  return (
    <section id="leistungen" className="relative bg-steel-950 py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-grid-steel bg-[size:44px_44px] opacity-20" />
      <div className="container-page relative">
        <SectionHeading
          eyebrow="Unsere Leistungen"
          title={<>Alles rund um Ihren <span className="text-gradient">Öltank</span></>}
          subtitle="Von der Demontage bis zur modernen Wärmespeicher-Montage – ein Fachbetrieb für den kompletten Lebenszyklus Ihrer Tankanlage."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((service, i) => (
            <TiltCard key={service.id} service={service} index={i} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-steel-400">
          Außerdem: <span className="text-steel-200">GFK-Reparaturen &amp; Laminierarbeiten</span> sowie{" "}
          <span className="text-steel-200">Entsorgungsnachweise &amp; Behörden-Abmeldung</span>.
        </p>
      </div>
    </section>
  );
}
