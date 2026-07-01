import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.svg"
        alt="Krebs Tanksysteme Logo"
        width={size}
        height={size}
        priority
        className="rounded-xl shadow-glow"
      />
      <span className="font-display text-lg font-bold text-white">
        Krebs <span className="text-amber-400">Tanksysteme</span>
      </span>
    </span>
  );
}
