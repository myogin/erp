"use client";

import { InboxIcon, LockIcon, LockOpenIcon } from "lucide-react";
import { useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState } from "@/components/data-table";
import { FormError } from "@/components/form-error";
import { useToastAction } from "@/components/use-toast-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatMonth } from "@/lib/time";
import { closePeriodAction, reopenPeriodAction } from "./actions";

type Period = { month: string; closed: boolean; closedAt: Date | null; closedByName: string | null; draftCount: number };

/** Months newest first: the one to close next and the one to reopen sit near the top. */
export function PeriodsTable({
  companyId,
  months,
  nextToClose,
  lastClosed,
  currentMonth,
  canClose,
  canReopen,
}: {
  companyId: string;
  months: Period[];
  nextToClose: string | null;
  lastClosed: string | null;
  currentMonth: string;
  canClose: boolean;
  canReopen: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">Bulan</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead className="w-44" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="h-auto py-12">
                <EmptyState icon={<InboxIcon />} title="Belum ada jurnal yang diposting, jadi belum ada periode untuk ditutup." />
              </TableCell>
            </TableRow>
          ) : (
            [...months].reverse().map((p) => (
              <TableRow key={p.month}>
                <TableCell className="font-medium">{formatMonth(p.month)}</TableCell>
                <TableCell>
                  <Badge variant={p.closed ? "success" : "secondary"}>{p.closed ? "Ditutup" : "Terbuka"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.closed
                    ? `Ditutup ${p.closedAt ? formatDateTime(p.closedAt) : ""} oleh ${p.closedByName ?? "–"}`
                    : p.month === currentMonth
                      ? "Bulan berjalan"
                      : p.draftCount > 0
                        ? `${p.draftCount} draf bertanggal di bulan ini`
                        : ""}
                </TableCell>
                <TableCell className="text-right">
                  {canClose && p.month === nextToClose && p.month < currentMonth && (
                    <ConfirmAction
                      title={`Tutup buku ${formatMonth(p.month)}?`}
                      description={`Setelah ditutup, tidak ada jurnal yang bisa diposting dengan tanggal di ${formatMonth(p.month)}, termasuk jurnal balik. Koreksi dicatat di bulan berikutnya.`}
                      confirmLabel="Tutup buku"
                      action={closePeriodAction}
                      fields={{ companyId, month: p.month }}
                      trigger={
                        <Button size="sm" disabled={p.draftCount > 0} title={p.draftCount > 0 ? "Posting atau hapus draf bulan ini dulu" : undefined}>
                          <LockIcon /> Tutup buku
                        </Button>
                      }
                    />
                  )}
                  {canReopen && p.month === lastClosed && <ReopenDialog companyId={companyId} month={p.month} />}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ReopenDialog({ companyId, month }: { companyId: string; month: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LockOpenIcon /> Buka kembali
        </Button>
      </DialogTrigger>
      <DialogContent>{open && <ReopenForm companyId={companyId} month={month} close={() => setOpen(false)} />}</DialogContent>
    </Dialog>
  );
}

function ReopenForm({ companyId, month, close }: { companyId: string; month: string; close: () => void }) {
  const [state, action, pending] = useToastAction(reopenPeriodAction, close);
  return (
    <form action={action}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="month" value={month} />
      <DialogHeader>
        <DialogTitle>Buka kembali {formatMonth(month)}?</DialogTitle>
        <DialogDescription>Jurnal bisa diposting lagi dengan tanggal di bulan ini. Alasannya dicatat di Audit Log.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-6">
        <Field>
          <FieldLabel htmlFor="reopen-reason">Alasan</FieldLabel>
          <Textarea id="reopen-reason" name="reason" required rows={2} placeholder="mis. Invoice pemasok datang terlambat" />
        </Field>
      </FieldGroup>
      <FormError message={state.error} />
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          Buka kembali
        </Button>
      </DialogFooter>
    </form>
  );
}
