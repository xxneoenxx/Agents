import { Reveal } from "./Reveal";

export function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "left",
  index,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
  align?: "left" | "center";
  index?: string;
}) {
  const alignCls = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";
  return (
    <Reveal className={`flex max-w-3xl flex-col gap-5 ${alignCls}`}>
      <div className="flex items-center gap-3">
        {index && <span className="font-mono text-xs text-alu-dark">/ {index}</span>}
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <h2 className="text-3xl leading-[1.05] sm:text-4xl md:text-5xl">{title}</h2>
      {intro && <p className="max-w-2xl text-base leading-relaxed text-alu/80 md:text-lg">{intro}</p>}
    </Reveal>
  );
}
