"use client";

import { useEffect, useState } from "react";
import { getOpenStatus } from "@/lib/restaurant";

// Kleines Widget, das live anzeigt, ob das Restaurant gerade geöffnet ist.
// Rendert erst nach dem Mount, um Hydration-Mismatches zu vermeiden.
export function LiveStatusBadge({ light = false }: { light?: boolean }) {
  const [status, setStatus] = useState<ReturnType<typeof getOpenStatus> | null>(
    null,
  );

  useEffect(() => {
    const update = () => setStatus(getOpenStatus(new Date()));
    update();
    const id = setInterval(update, 60_000); // jede Minute aktualisieren
    return () => clearInterval(id);
  }, []);

  if (!status) {
    return (
      <span
        className={`inline-flex h-7 w-32 animate-pulse rounded-full ${
          light ? "bg-bark/10" : "bg-cream/10"
        }`}
      />
    );
  }

  const { isOpen, closesAt, opensAt, nextOpenLabel } = status;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur ${
        light
          ? "border-bark/15 bg-white/70 text-bark"
          : "border-cream/20 bg-cream/10 text-cream"
      }`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            isOpen ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            isOpen ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
      </span>
      {isOpen ? (
        <>Jetzt geöffnet{closesAt ? ` · bis ${closesAt} Uhr` : ""}</>
      ) : (
        <>
          Geschlossen
          {opensAt ? ` · öffnet ${nextOpenLabel} ${opensAt} Uhr` : ""}
        </>
      )}
    </span>
  );
}
