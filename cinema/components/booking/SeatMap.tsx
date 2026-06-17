"use client";

import { motion } from "framer-motion";
import { Accessibility } from "lucide-react";
import {
  buildSeatLayout,
  AISLE_AFTER_COL,
  type Seat,
} from "@/lib/cinema";

const layout = buildSeatLayout();

export function SeatMap({
  booked,
  selected,
  onToggle,
  justTaken = [],
}: {
  booked: Set<string>;
  selected: Set<string>;
  onToggle: (seat: Seat) => void;
  justTaken?: string[];
}) {
  return (
    <div className="select-none">
      {/* Leinwand */}
      <div className="mx-auto mb-8 max-w-md">
        <motion.div
          initial={{ scaleX: 0.4, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-2 rounded-[100%] bg-gradient-to-r from-transparent via-gold to-transparent shadow-glow"
        />
        <p className="mt-2 text-center text-xs uppercase tracking-[0.4em] text-white/40">
          Leinwand
        </p>
      </div>

      {/* Sitzreihen */}
      <div className="flex flex-col items-center gap-1.5 overflow-x-auto pb-2">
        {layout.map((row, ri) => (
          <motion.div
            key={ri}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ri * 0.04, duration: 0.3 }}
            className="flex items-center gap-1.5"
          >
            <span className="w-5 text-center text-xs font-semibold text-white/35">
              {row[0].row}
            </span>
            {row.map((seat) => {
              const isBooked = booked.has(seat.id);
              const isSelected = selected.has(seat.id);
              const isFlash = justTaken.includes(seat.id);
              return (
                <span key={seat.id} className="flex">
                  <SeatButton
                    seat={seat}
                    isBooked={isBooked}
                    isSelected={isSelected}
                    isFlash={isFlash}
                    onToggle={onToggle}
                  />
                  {seat.col === AISLE_AFTER_COL && <span className="w-4" />}
                </span>
              );
            })}
          </motion.div>
        ))}
      </div>

      {/* Legende */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60">
        <Legend className="bg-white/15" label="Frei" />
        <Legend className="bg-gold" label="Ausgewählt" />
        <Legend className="bg-violet-soft/70" label="Premium" />
        <Legend className="bg-white/5 ring-1 ring-white/10" label="Belegt" />
        <span className="inline-flex items-center gap-1.5">
          <Accessibility className="h-4 w-4 text-white/50" /> Rollstuhl
        </span>
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  isBooked,
  isSelected,
  isFlash,
  onToggle,
}: {
  seat: Seat;
  isBooked: boolean;
  isSelected: boolean;
  isFlash: boolean;
  onToggle: (seat: Seat) => void;
}) {
  const base =
    "relative grid h-7 w-7 place-items-center rounded-t-lg rounded-b-sm text-[0.6rem] font-bold transition-colors";

  let style =
    "bg-white/15 text-white/70 hover:bg-white/30 hover:text-white cursor-pointer";
  if (seat.type === "premium" && !isBooked && !isSelected)
    style = "bg-violet-soft/30 text-violet-soft hover:bg-violet-soft/50 cursor-pointer";
  if (isSelected) style = "bg-gold text-ink shadow-glow cursor-pointer";
  if (isBooked) style = "bg-white/5 text-white/20 ring-1 ring-white/10 cursor-not-allowed";

  return (
    <motion.button
      type="button"
      disabled={isBooked}
      whileHover={isBooked ? undefined : { scale: 1.18, y: -2 }}
      whileTap={isBooked ? undefined : { scale: 0.9 }}
      animate={isFlash ? { x: [0, -3, 3, -2, 2, 0] } : undefined}
      transition={{ duration: 0.4 }}
      onClick={() => onToggle(seat)}
      aria-label={`Sitz ${seat.id}${isBooked ? " (belegt)" : isSelected ? " (ausgewählt)" : ""}`}
      aria-pressed={isSelected}
      className={`${base} ${style}`}
    >
      {seat.type === "wheelchair" ? (
        <Accessibility className="h-3.5 w-3.5" />
      ) : (
        seat.col
      )}
    </motion.button>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3.5 w-3.5 rounded ${className}`} />
      {label}
    </span>
  );
}
