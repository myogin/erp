import type { ComponentProps, ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    />
  );
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    />
  );
}

export function Button({ variant = "primary", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900",
    secondary: "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
    danger: "text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
  }[variant];
  return <button {...props} className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${styles}`} />;
}

export function FormMessage({ state }: { state: { error?: string; message?: string } }) {
  if (state.error) return <p role="alert" className="text-sm text-red-700 dark:text-red-400">{state.error}</p>;
  if (state.message) return <p aria-live="polite" className="text-sm text-green-700 dark:text-green-400">{state.message}</p>;
  return null;
}

/** A secret shown exactly once, such as a temporary password. */
export function OneTimeSecret({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
      <p className="font-medium">{label}</p>
      <code className="mt-1 block select-all font-mono text-base">{value}</code>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">Hanya ditampilkan sekali. Sampaikan langsung ke pengguna.</p>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
