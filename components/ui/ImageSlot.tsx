import { images } from "@/content/images";

/**
 * Rendert ein Bild aus der zentralen Bildverwaltung.
 * Solange `placeholder: true`, wird ein dezenter Hinweis eingeblendet.
 */
export function ImageSlot({
  name,
  className = "",
  imgClassName = "",
}: {
  name: keyof typeof images;
  className?: string;
  imgClassName?: string;
}) {
  const img = images[name];
  if (!img) return null;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.src}
        alt={img.alt}
        loading="lazy"
        className={`h-full w-full object-cover ${imgClassName}`}
      />
      {img.placeholder && (
        <span className="absolute left-3 top-3 rounded border border-adr/50 bg-graphit/80 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-adr backdrop-blur-sm">
          Platzhalter · Foto folgt
        </span>
      )}
    </div>
  );
}
