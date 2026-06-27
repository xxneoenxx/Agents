"use client";

import { forwardRef } from "react";
import Link from "next/link";

type Variant = "primary" | "ghost" | "outline";

const base =
  "group relative inline-flex items-center justify-center gap-2 font-mono text-sm uppercase tracking-widest transition-all duration-300 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-adr px-6 py-3.5 text-graphit font-medium hover:bg-adr-soft hover:shadow-[0_18px_40px_-18px_rgba(242,165,22,0.7)] active:translate-y-px",
  outline:
    "border border-alu-line px-6 py-3.5 text-alu hover:border-adr hover:text-papier active:translate-y-px",
  ghost: "px-3 py-2 text-alu hover:text-adr",
};

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonAsButton | ButtonAsLink
>(function Button({ variant = "primary", className = "", children, ...props }, ref) {
  const cls = `${base} ${variants[variant]} ${className}`;

  if ("href" in props && props.href !== undefined) {
    const { href, ...rest } = props as ButtonAsLink;
    const external = href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("http");
    if (external) {
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} className={cls} {...(props as ButtonAsButton)}>
      {children}
    </button>
  );
});
