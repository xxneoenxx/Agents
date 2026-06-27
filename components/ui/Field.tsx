"use client";

import { forwardRef } from "react";

const fieldBase =
  "w-full rounded-lg border border-alu-line bg-graphit/60 px-4 py-3 font-sans text-papier placeholder:text-alu-dark/70 transition focus:border-adr focus:outline-none focus:ring-1 focus:ring-adr/50";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-alu-dark">
      {children}
    </label>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 font-mono text-xs text-glut">{msg}</p>;
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${fieldBase} ${className}`} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return <textarea ref={ref} className={`${fieldBase} min-h-[100px] resize-y ${className}`} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <select ref={ref} className={`${fieldBase} appearance-none ${className}`} {...props}>
        {children}
      </select>
    );
  },
);
