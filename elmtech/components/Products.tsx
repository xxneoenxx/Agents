import { Reveal } from "./ui/Reveal";
import { ProductCard } from "./ProductCard";
import { products } from "@/lib/elmtech";

export function Products() {
  return (
    <section id="produkte" className="section">
      <div className="container-x">
        <div className="flex flex-col items-end justify-between gap-4 sm:flex-row">
          <div>
            <Reveal>
              <span className="eyebrow">Unsere Produktreihen</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="text-3xl font-bold sm:text-4xl">Verbundelemente im Überblick</h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm text-steel-400">
              Beispielhafte Produktreihen – jede Lösung fertigen wir passgenau für Ihr Projekt.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
