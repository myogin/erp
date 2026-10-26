"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** A secret shown exactly once, such as a Temporary Password. */
export function OneTimeSecret({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 select-all rounded bg-white px-2 py-1 font-mono text-base">{value}</code>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Salin"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            toast.success("Disalin");
          }}
        >
          <CopyIcon />
        </Button>
      </div>
      <p className="text-muted-foreground">Hanya ditampilkan sekali. Sampaikan langsung ke pengguna, bukan lewat grup chat.</p>
    </div>
  );
}
