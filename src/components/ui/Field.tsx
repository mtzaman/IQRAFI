import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export const controlClasses =
  "w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-muted/70 shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 aria-[invalid=true]:border-danger";

export function Field({ label, hint, error, htmlFor, children, optionalLabel }: { label: string; hint?: string; error?: string | null; htmlFor: string; children: ReactNode; optionalLabel?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {optionalLabel ? <span className="ms-1 font-normal text-muted">({optionalLabel})</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, "appearance-auto", className)} {...props} />;
}

export function Checkbox({ label, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] p-1", className)}>
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--primary)]" {...props} />
      <span>
        <span className="block text-[0.95rem]">{label}</span>
        {hint ? <span className="block text-sm text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function RadioCard({ label, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border border-line bg-surface p-3.5 transition-colors hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft",
        className,
      )}
    >
      <input type="radio" className="mt-1 size-4 shrink-0 accent-[var(--primary)]" {...props} />
      <span>
        <span className="block font-medium">{label}</span>
        {hint ? <span className="block text-sm text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
