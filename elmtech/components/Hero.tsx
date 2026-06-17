"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { Phone, PhoneCall, ArrowDown, MapPin } from "lucide-react";
import { company, fullAddress, layers } from "@/lib/elmtech";
import { useCallbackModal } from "./callback/CallbackProvider";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { open } = useCallbackModal();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-18%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  // 3D-Panel reagiert auf Mausbewegung
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [14, -6]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-28, -2]), { stiffness: 120, damping: 18 });

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <section
      ref={ref}
      id="hauptinhalt"
      onMouseMove={onMove}
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Raster-Hintergrund */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid [background-size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-60"
      />
      {/* schwebende Lichtflecken */}
      {!reduce && (
        <>
          <motion.div
            aria-hidden
            className="absolute -left-24 top-24 -z-10 h-80 w-80 rounded-full bg-brand/25 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 24, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute -right-20 bottom-10 -z-10 h-96 w-96 rounded-full bg-cyan/15 blur-3xl"
            animate={{ x: [0, -26, 0], y: [0, -18, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <motion.div
        style={{ y: textY, opacity }}
        className="container-x grid items-center gap-12 pt-28 pb-20 lg:grid-cols-2"
      >
        {/* Text */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            Verbundelemente · seit {company.foundedYear}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl font-bold leading-[1.05] sm:text-6xl"
          >
            Dämm- & Fassaden­elemente <span className="text-gradient">nach Maß</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg text-steel-200"
          >
            {company.claim} Schallschutz, Einbruchschutz, Energieeffizienz und Brandschutz –
            präzise gefertigt im Herzen Sachsens.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <button onClick={() => open()} className="btn-primary w-full sm:w-auto">
              <PhoneCall className="h-5 w-5" /> Rückruf vereinbaren
            </button>
            <a href={`tel:${company.contact.phoneHref}`} className="btn-ghost w-full sm:w-auto">
              <Phone className="h-5 w-5" /> {company.contact.phoneDisplay}
            </a>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 flex items-center gap-2 text-sm text-steel-400"
          >
            <MapPin className="h-4 w-4 text-cyan" /> {fullAddress}
          </motion.div>
        </div>

        {/* 3D-Verbundelement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mx-auto hidden h-[420px] w-full max-w-md items-center justify-center lg:flex"
          style={{ perspective: 1200 }}
        >
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative h-64 w-72"
          >
            {layers.map((layer, i) => (
              <motion.div
                key={layer.key}
                className="absolute inset-0 rounded-2xl border border-white/20 shadow-card"
                style={{
                  background: `linear-gradient(135deg, ${layer.color}, ${layer.color}cc)`,
                  transform: `translateZ(${(i - 1) * 46}px)`,
                  backfaceVisibility: "hidden",
                }}
                animate={reduce ? undefined : { y: [0, i % 2 === 0 ? -8 : 8, 0] }}
                transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex h-full flex-col justify-between p-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-graphite/70">
                    Lage {i + 1}
                  </span>
                  <span className="font-display text-xl font-bold text-graphite">{layer.name}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
          {/* Bodenschatten */}
          <div aria-hidden className="absolute bottom-6 h-6 w-60 rounded-full bg-black/50 blur-xl" />
        </motion.div>
      </motion.div>

      <motion.a
        href="#leistungen"
        aria-label="Weiter scrollen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-steel-400"
      >
        <motion.span
          className="inline-flex"
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <ArrowDown className="h-6 w-6" />
        </motion.span>
      </motion.a>
    </section>
  );
}
