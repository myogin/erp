"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatRupiahInput, parseRupiahInput } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"input">, "name" | "value" | "defaultValue" | "onChange" | "type"> & {
  /** Form field name; the form receives a plain decimal string such as "1500000.50", or "" when empty. */
  name: string;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
};

/**
 * Money in Indonesian format (docs/ui.md): typing 1500000 shows 1.500.000, a
 * comma starts the cents. The visible text is for people; a hidden input
 * carries the exact decimal to the server.
 */
export function MoneyInput({ name, defaultValue, onValueChange, className, ...props }: Props) {
  const [text, setText] = useState(() => (defaultValue ? formatRupiahInput(defaultValue.replace(".", ",")) : ""));
  const value = parseRupiahInput(text)?.toFixed(2) ?? "";

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          const next = formatRupiahInput(e.target.value);
          setText(next);
          onValueChange?.(parseRupiahInput(next)?.toFixed(2) ?? "");
        }}
        className={cn("numeric pl-9", className)}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
