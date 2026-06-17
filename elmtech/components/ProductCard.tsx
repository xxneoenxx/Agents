"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { ArrowUpRight, PhoneCall } from "lucide-react";
import { useCallbackModal } from "./callback/CallbackProvider";
import type { Product } from "@/lib/elmtech";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const { open } = useCallbackModal();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 200, damping: 20 });

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-graphite-card shadow-card"
      >
        {/* Kopf mit Farbverlauf */}
        <div
          className="relative h-36 overflow-hidden p-5"
          style={{ background: `linear-gradient(150deg, ${product.gradient[0]}, ${product.gradient[1]})` }}
        >
          <div
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: product.accent }}
          />
          <div className="relative flex items-start justify-between">
            <span className="rounded-md bg-black/30 px-2.5 py-1 text-xs font-medium backdrop-blur">
              {product.category}
            </span>
            <span
              className="rounded-md px-2.5 py-1 text-xs font-bold text-graphite"
              style={{ background: product.accent }}
            >
              {product.highlight}
            </span>
          </div>
          <h3
            className="absolute bottom-4 left-5 font-display text-3xl font-bold"
            style={{ transform: "translateZ(30px)" }}
          >
            {product.name}
          </h3>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          <p className="text-sm text-steel-400">{product.description}</p>

          <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            {product.specs.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3">
                <dt className="text-steel-400">{s.label}</dt>
                <dd className="font-medium text-steel-50">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {product.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.7rem] font-medium text-steel-200"
              >
                {t}
              </span>
            ))}
          </div>

          <button
            onClick={() => open(mapTopic(product.tags))}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan transition hover:gap-3"
          >
            <PhoneCall className="h-4 w-4" /> Beratung anfordern
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.article>
  );
}

function mapTopic(tags: string[]): string {
  if (tags.includes("Schallschutz")) return "Schallschutz";
  if (tags.includes("Einbruchschutz")) return "Einbruchschutz";
  if (tags.includes("Energieeffizienz")) return "Energieeffizienz";
  if (tags.includes("Brandschutz")) return "Brandschutz";
  if (tags.includes("Sonderbau")) return "Sonderkonstruktion";
  return "Allgemeine Anfrage";
}
