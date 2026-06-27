import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { company } from "@/content/site";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-graphit">
      <header className="border-b border-alu-line/70 bg-graphit/80 backdrop-blur-md">
        <div className="container-edge flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-adr font-display text-base font-extrabold text-graphit">
              N
            </span>
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-papier">
              Niemeier Fahrzeugwerke
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-alu transition hover:text-adr"
          >
            <ArrowLeft size={14} /> Zurück
          </Link>
        </div>
      </header>

      <main className="container-edge max-w-3xl py-16 md:py-24">
        <p className="eyebrow mb-4">Rechtliches</p>
        <h1 className="text-4xl md:text-5xl">{title}</h1>
        <div className="legal mt-10 space-y-6 text-alu/85">{children}</div>
        <p className="mt-16 border-t border-alu-line/50 pt-6 font-mono text-xs text-alu-dark">
          © {new Date().getFullYear()} {company.legalName}
        </p>
      </main>
    </div>
  );
}
