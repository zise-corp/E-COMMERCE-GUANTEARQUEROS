"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full bg-ink-850 border text-content placeholder:text-content-faint " +
  "rounded-sm px-[14px] py-[13px] text-sm outline-none " +
  "transition-[border-color,box-shadow] duration-150 " +
  "focus:border-brand focus:shadow-focus focus-visible:ring-0 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

function borderFor(error?: string) {
  return error ? "border-alert" : "border-line-strong";
}

/* ── Envoltorio: label + control + error ─────────────────────────────────── */

export function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  className,
  children,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="label-xs mb-[7px] text-content-dim">
          {label}
          {required ? <span className="text-brand"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-alert-soft" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-content-dim">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Controles ───────────────────────────────────────────────────────────── */

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  fieldClassName?: string;
};

export function Input({ label, error, hint, className, fieldClassName, ...rest }: InputProps) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Field
      label={label}
      required={rest.required}
      error={error}
      hint={hint}
      htmlFor={id}
      className={fieldClassName}
    >
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(control, borderFor(error), className)}
      />
    </Field>
  );
}

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  fieldClassName?: string;
};

export function Textarea({ label, error, hint, className, fieldClassName, ...rest }: TextareaProps) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Field
      label={label}
      required={rest.required}
      error={error}
      hint={hint}
      htmlFor={id}
      className={fieldClassName}
    >
      <textarea
        rows={2}
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(control, borderFor(error), "resize-y", className)}
      />
    </Field>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  fieldClassName?: string;
};

export function Select({
  label,
  error,
  hint,
  className,
  fieldClassName,
  children,
  ...rest
}: SelectProps) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Field
      label={label}
      required={rest.required}
      error={error}
      hint={hint}
      htmlFor={id}
      className={fieldClassName}
    >
      <select
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(control, borderFor(error), "cursor-pointer appearance-none", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none'><path d='M1 1.5 6 6.5 11 1.5' stroke='%236E6B67' stroke-width='1.6'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: "38px",
        }}
      >
        {children}
      </select>
    </Field>
  );
}
