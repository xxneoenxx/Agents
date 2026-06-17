import { Reveal } from "./ui/Reveal";
import { MovieCard } from "./MovieCard";
import { movies } from "@/lib/cinema";

export function NowPlaying() {
  return (
    <section id="programm" className="section">
      <div className="container-x">
        <div className="flex flex-col items-end justify-between gap-4 sm:flex-row">
          <div>
            <Reveal>
              <span className="eyebrow">Jetzt im Kino</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="text-4xl sm:text-5xl">Aktuelles Programm</h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm text-white/55">
              Wähle einen Film, einen Termin und deine Lieblingsplätze – die Buchung
              dauert keine Minute.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {movies.map((movie, i) => (
            <MovieCard key={movie.id} movie={movie} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
