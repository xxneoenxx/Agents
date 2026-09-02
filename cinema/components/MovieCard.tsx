"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { Star, Clock, Ticket, Play } from "lucide-react";
import { useBooking } from "./booking/BookingProvider";
import { formatDuration, type Movie } from "@/lib/cinema";

export function MovieCard({ movie, index }: { movie: Movie; index: number }) {
  const { open } = useBooking();
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D-Tilt bei Mausbewegung
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });
  const [hover, setHover] = useState(false);

  function onMove(e: React.MouseEvent) {
    if (reduce || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
    setHover(false);
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
        ref={cardRef}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative overflow-hidden rounded-3xl border border-white/10 bg-ink-card shadow-card"
      >
        {/* Poster */}
        <div
          className="relative aspect-[2/3] overflow-hidden"
          style={{ background: `linear-gradient(150deg, ${movie.gradient[0]}, ${movie.gradient[1]})` }}
        >
          {/* dekorative Lichtreflexe */}
          <div
            className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: movie.accent }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-card via-ink-card/20 to-transparent" />

          {/* FSK + Bewertung */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-md bg-black/40 px-2 py-1 text-xs font-bold backdrop-blur">
              FSK {movie.fsk}
            </span>
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs font-semibold backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" /> {movie.rating.toFixed(1)}
          </div>

          {/* Play-Overlay bei Hover */}
          <motion.div
            initial={false}
            animate={{ opacity: hover ? 1 : 0, scale: hover ? 1 : 0.8 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 grid place-items-center"
            style={{ transform: "translateZ(40px)" }}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-gold/90 text-ink shadow-glow">
              <Play className="h-7 w-7 fill-ink" />
            </span>
          </motion.div>

          {/* Titelbereich */}
          <div className="absolute inset-x-0 bottom-0 p-4" style={{ transform: "translateZ(30px)" }}>
            <h3 className="font-display text-2xl leading-none">{movie.title}</h3>
            <p className="mt-1 text-xs text-white/60">{movie.genre}</p>
          </div>
        </div>

        {/* Info + CTA */}
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {movie.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.7rem] font-medium text-white/70"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="line-clamp-2 text-sm text-white/55">{movie.synopsis}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <Clock className="h-3.5 w-3.5" /> {formatDuration(movie.durationMin)}
            </span>
            <button onClick={() => open(movie)} className="btn-gold !px-4 !py-2 text-xs">
              <Ticket className="h-4 w-4" /> Tickets
            </button>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}
