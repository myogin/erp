"use client";

import { CalendarIcon, XIcon } from "lucide-react";
import { id } from "react-day-picker/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatIsoDate } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = {
  /** Form field name; the form receives "yyyy-MM-dd", or "" when empty. */
  name: string;
  id?: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  "aria-invalid"?: boolean;
};

// A business date is a calendar day, not an instant: keep it as y-m-d and
// only build a local Date for the calendar widget to display.
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** A date picker showing dd/MM/yyyy, with weeks starting on Monday (docs/ui.md). */
export function DatePicker({ name, id: inputId, defaultValue, placeholder = "Pilih tanggal", required, disabled, onValueChange, ...aria }: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const select = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={inputId}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={aria["aria-invalid"]}
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon />
            {value ? formatIsoDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={id}
            weekStartsOn={1}
            selected={value ? fromIso(value) : undefined}
            defaultMonth={value ? fromIso(value) : undefined}
            onSelect={(date) => {
              select(date ? toIso(date) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value && !required && !disabled && (
        <button type="button" aria-label="Kosongkan tanggal" onClick={() => select("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground">
          <XIcon className="size-3.5" />
        </button>
      )}
      {/* Visually hidden but focusable by the browser, so `required` blocks submitting an empty date. */}
      <input name={name} value={value} required={required} onChange={() => {}} tabIndex={-1} aria-hidden className="pointer-events-none absolute inset-0 opacity-0" />
    </div>
  );
}
