import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { site } from "@/config/site";
import { Logo } from "@/components/ui/Logo";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-steel-950">
      <header className="border-b border-white/10">
        <div className="container-page flex h-16 items-center justify-between lg:h-20">
          <Link href="/" aria-label={`${site.name} – Startseite`}>
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-steel-300 hover:text-amber-400"
          >
            <ArrowLeft className="h-4 w-4" /> Zur Startseite
          </Link>
        </div>
      </header>

      <main className="container-page py-16 lg:py-24">
        <article className="prose-legal mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          <div className="mt-8 space-y-6 text-steel-300">{children}</div>
        </article>
      </main>

      <footer className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-8 text-sm text-steel-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {site.name}</p>
          <nav className="flex gap-6">
            <Link href="/impressum" className="hover:text-amber-400">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-amber-400">Datenschutz</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Hervorgehobener Platzhalter-Hinweis für noch zu ergänzende Rechtsangaben. */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-amber-500/20 px-1.5 py-0.5 font-medium text-amber-200">
      {children}
    </mark>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-white">{heading}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}
