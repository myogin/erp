"use client";

import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import { OneTimeSecret } from "./one-time-secret";
import { useToastAction } from "./use-toast-action";

type Props = {
  title: string;
  /** Name the consequence, e.g. "Jurnal yang sudah diposting tidak bisa diubah." (docs/ui.md) */
  description: ReactNode;
  confirmLabel: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Hidden form fields sent to the action. */
  fields: Record<string, string>;
  destructive?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  secretLabel?: string;
};

/** Confirmation for a permanent action. If the action returns a secret, it is shown once before closing. */
export function ConfirmAction({ trigger, open: controlledOpen, onOpenChange, ...props }: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  // Remount the body each time it opens, so a previous result doesn't linger.
  const [round, setRound] = useState(0);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRound((r) => r + 1);
        setOpen(next);
      }}
    >
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <ConfirmBody key={round} {...props} close={() => setOpen(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmBody({
  title,
  description,
  confirmLabel,
  action,
  fields,
  destructive,
  secretLabel = "Rahasia",
  close,
}: Omit<Props, "trigger" | "open" | "onOpenChange"> & { close: () => void }) {
  const [state, formAction, pending] = useToastAction(action, (s) => {
    if (!s.secret) close();
  });

  if (state.secret) {
    return (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <OneTimeSecret label={secretLabel} value={state.secret} />
        <AlertDialogFooter>
          <Button onClick={close}>Selesai</Button>
        </AlertDialogFooter>
      </>
    );
  }

  return (
    <form action={formAction} className="contents">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel type="button" disabled={pending}>
          Batal
        </AlertDialogCancel>
        <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
