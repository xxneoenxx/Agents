import { Reveal } from "./ui/Reveal";
import { menu } from "@/lib/restaurant";

export function Menu() {
  return (
    <section id="speisekarte" className="section">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">Aus unserer Küche</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl font-bold text-bark sm:text-4xl">
              Speisekarte (Auszug)
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-bark/70">
              Saisonale Gerichte aus frischen, regionalen Zutaten. Unsere
              Karte wechselt mit den Jahreszeiten – sprich uns gern auf
              Tagesempfehlungen an.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-3">
          {menu.map((category, ci) => (
            <Reveal key={category.id} delay={ci * 0.1} className="space-y-6">
              <h3 className="border-b-2 border-copper/30 pb-3 font-serif text-2xl font-bold text-bark">
                {category.title}
              </h3>
              <ul className="space-y-6">
                {category.dishes.map((dish) => (
                  <li key={dish.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="font-semibold text-bark">{dish.name}</h4>
                      <span className="whitespace-nowrap font-semibold text-copper">
                        {dish.price}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-bark/65">
                      {dish.description}
                    </p>
                    {dish.tags && dish.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {dish.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-12 text-center text-sm text-bark/60">
            Alle Preise in Euro inkl. MwSt. Bei Allergien oder
            Unverträglichkeiten beraten wir dich gern persönlich.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
