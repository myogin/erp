"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormError } from "@/components/form-error";
import { FormActions, FormSection } from "@/components/form-layout";
import { MoneyInput } from "@/components/money-input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah, money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { saveJournalAction } from "./actions";

export type AccountOption = { id: string; code: string; name: string };

type Line = { key: number; accountId: string; debit: string; credit: string; description: string };

export type JournalFormValues = {
  entryId?: string;
  date: string;
  description: string;
  lines: Omit<Line, "key">[];
};

const FORM_ID = "journal-form";
let nextKey = 0;
const blankLine = (): Line => ({ key: nextKey++, accountId: "", debit: "", credit: "", description: "" });

const sum = (values: string[]) => values.reduce((total, v) => total.plus(v || 0), money(0));

/** A Journal Entry on its own page (docs/ui.md): header fields, then the lines with live totals. */
export function JournalForm({
  company,
  accounts,
  initial,
  cancelHref,
}: {
  company: { id: string; code: string };
  accounts: AccountOption[];
  initial?: JournalFormValues;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveJournalAction, {});
  const [lines, setLines] = useState<Line[]>(() =>
    initial ? initial.lines.map((l) => ({ ...l, key: nextKey++ })) : [blankLine(), blankLine()],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const debit = sum(lines.map((l) => l.debit));
  const credit = sum(lines.map((l) => l.credit));
  const difference = debit.minus(credit);
  const balanced = difference.isZero() && !debit.isZero();

  const update = (key: number, change: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...change } : l)));

  return (
    <form id={FORM_ID} action={action}>
      <input type="hidden" name="companyId" value={company.id} />
      <input type="hidden" name="companyCode" value={company.code} />
      {initial?.entryId && <input type="hidden" name="entryId" value={initial.entryId} />}
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(lines.map(({ accountId, debit, credit, description }) => ({ accountId, debit, credit, description })))}
      />

      <FormSection title="Jurnal" description="Tanggal transaksi dan keterangan yang menjelaskan jurnal ini.">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="journal-date">Tanggal</FieldLabel>
            <DatePicker id="journal-date" name="date" defaultValue={initial?.date} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="journal-description">Keterangan</FieldLabel>
            <Textarea id="journal-description" name="description" defaultValue={initial?.description} required rows={2} />
          </Field>
        </FieldGroup>
      </FormSection>

      <section className="space-y-3 py-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Baris jurnal</h2>
          <p className="text-sm text-muted-foreground">Setiap baris diisi debit atau kredit. Total debit dan kredit harus sama untuk bisa diposting.</p>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-72">Akun</TableHead>
                <TableHead className="w-48 text-right">Debit</TableHead>
                <TableHead className="w-48 text-right">Kredit</TableHead>
                <TableHead className="min-w-48">Keterangan baris</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={line.key} className="hover:bg-transparent">
                  <TableCell>
                    <Select value={line.accountId} onValueChange={(accountId) => update(line.key, { accountId })}>
                      <SelectTrigger className="w-full" aria-label={`Akun baris ${i + 1}`}>
                        <SelectValue placeholder="Pilih akun" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="font-mono">{a.code}</span> {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <MoneyInput
                      name={`debit-${line.key}`}
                      defaultValue={line.debit}
                      onValueChange={(debit) => update(line.key, { debit })}
                      className="text-right"
                      aria-label={`Debit baris ${i + 1}`}
                    />
                  </TableCell>
                  <TableCell>
                    <MoneyInput
                      name={`credit-${line.key}`}
                      defaultValue={line.credit}
                      onValueChange={(credit) => update(line.key, { credit })}
                      className="text-right"
                      aria-label={`Kredit baris ${i + 1}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(e) => update(line.key, { description: e.target.value })}
                      aria-label={`Keterangan baris ${i + 1}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus baris ${i + 1}`}
                      disabled={lines.length <= 1}
                      onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="numeric text-right font-medium">{formatRupiah(debit)}</TableCell>
                <TableCell className="numeric text-right font-medium">{formatRupiah(credit)}</TableCell>
                <TableCell colSpan={2} className={cn("text-sm", balanced ? "text-success" : "text-warning")}>
                  {balanced ? "Seimbang" : `Selisih ${formatRupiah(difference.abs())}`}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((all) => [...all, blankLine()])}>
          <PlusIcon /> Tambah baris
        </Button>
      </section>

      <FormError message={state.error} />
      <FormActions>
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Batal</Link>
        </Button>
        <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>
          Simpan draf
        </Button>
        <Button type="button" disabled={pending || !balanced} onClick={() => setConfirmOpen(true)}>
          Posting
        </Button>
      </FormActions>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Posting jurnal ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Jurnal yang sudah diposting tidak bisa diubah atau dihapus, dan mendapat nomor dokumen. Kesalahan nanti hanya bisa dikoreksi dengan jurnal balik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              Batal
            </AlertDialogCancel>
            {/* Submits the journal form, which sits outside this dialog's portal. */}
            <Button type="submit" form={FORM_ID} name="intent" value="post" disabled={pending} onClick={() => setConfirmOpen(false)}>
              Posting
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
