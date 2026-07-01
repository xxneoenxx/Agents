import {
  Wrench,
  Droplets,
  ShieldCheck,
  Layers,
  Container,
  Flame,
  Hammer,
  FileCheck,
  type LucideProps,
} from "lucide-react";

const map = {
  Wrench,
  Droplets,
  ShieldCheck,
  Layers,
  Container,
  Flame,
  Hammer,
  FileCheck,
} as const;

export type IconName = keyof typeof map;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = map[name as IconName] ?? Wrench;
  return <Cmp {...props} />;
}
