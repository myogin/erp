import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One block of a long form on its own page (docs/ui.md): title and help text
 * on the left, fields on the right; stacks on narrow screens.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-x-8 gap-y-4 border-b py-6 first:pt-0 md:grid-cols-[16rem_1fr]", className)}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 max-w-2xl">{children}</div>
    </section>
  );
}

/**
 * Save/cancel bar of a long form. Sticks to the bottom of the window while
 * the form scrolls, so the actions stay reachable; put the primary action last.
 * Place it as the form's last child, inside the page's padded <main>.
 */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-2 border-t bg-card px-6 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
