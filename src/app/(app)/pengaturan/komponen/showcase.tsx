"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BellIcon, DownloadIcon, InboxIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/confirm-action";
import { DataTable } from "@/components/data-table";
import { DatePicker } from "@/components/date-picker";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { OneTimeSecret } from "@/components/one-time-secret";
import { useToastAction } from "@/components/use-toast-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRupiah, money } from "@/lib/money";
import { formatDate, formatDateTime, formatIsoDate } from "@/lib/time";
import { demoConfirm, demoSecret, demoSubmit } from "./actions";

type Row = { id: string; date: string; description: string; amount: string };

const SECTIONS = [
  ["warna", "Warna & tipografi"],
  ["tombol", "Tombol & badge"],
  ["form", "Form"],
  ["format", "Format angka & tanggal"],
  ["dialog", "Dialog & konfirmasi"],
  ["umpan-balik", "Toast, menu & tooltip"],
  ["tabel", "Tabel"],
  ["lainnya", "Card, tab, skeleton & kosong"],
] as const;

export function Showcase(table: { rows: Row[]; total: number; page: number; pageSize: number }) {
  return (
    <>
      <nav className="flex flex-wrap gap-2 text-sm">
        {SECTIONS.map(([id, title]) => (
          <a key={id} href={`#${id}`} className="rounded-md border px-2.5 py-1 hover:bg-muted">
            {title}
          </a>
        ))}
      </nav>
      <ColorsSection />
      <ButtonsSection />
      <FormSection />
      <FormatSection />
      <DialogSection />
      <FeedbackSection />
      <TableSection {...table} />
      <OtherSection />
    </>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 space-y-4 border-t pt-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function ColorsSection() {
  const swatches = [
    ["primary", "bg-primary", "Aksen: tombol utama, item aktif"],
    ["secondary", "bg-secondary", "Tombol & badge sekunder"],
    ["muted", "bg-muted", "Latar lembut, teks redup"],
    ["accent", "bg-accent", "Hover"],
    ["destructive", "bg-destructive", "Aksi berbahaya, error"],
    ["border", "bg-border", "Garis & border input"],
    ["sidebar", "bg-sidebar", "Latar sidebar"],
  ];
  return (
    <Section id="warna" title="Warna & tipografi" description="Mode terang saja. Ganti --primary di globals.css untuk warna brand.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {swatches.map(([name, bg, use]) => (
          <div key={name} className="space-y-1.5">
            <div className={`h-14 rounded-lg border ${bg}`} />
            <p className="font-mono text-xs">--{name}</p>
            <p className="text-xs text-muted-foreground">{use}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-semibold">Judul halaman (text-2xl)</p>
        <p className="text-lg font-semibold">Judul bagian (text-lg)</p>
        <p className="text-sm">Teks isi (text-sm), dipakai di form dan tabel.</p>
        <p className="text-sm text-muted-foreground">Teks keterangan (text-muted-foreground).</p>
        <p className="font-mono text-sm">CVA · JU-0001 (font-mono untuk kode)</p>
      </div>
    </Section>
  );
}

function ButtonsSection() {
  return (
    <Section id="tombol" title="Tombol & badge" description="Satu tombol utama per layar; aksi berbahaya pakai destructive dan selalu dikonfirmasi.">
      <Example label="Varian">
        <Button>Utama</Button>
        <Button variant="secondary">Sekunder</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Hapus</Button>
      </Example>
      <Example label="Ukuran & ikon">
        <Button size="sm">Kecil</Button>
        <Button>Normal</Button>
        <Button size="lg">Besar</Button>
        <Button>
          <PlusIcon /> Tambah jurnal
        </Button>
        <Button variant="outline">
          <DownloadIcon /> Ekspor Excel
        </Button>
        <Button size="icon" variant="ghost" aria-label="Aksi">
          <MoreHorizontalIcon />
        </Button>
        <Button disabled>Nonaktif</Button>
      </Example>
      <Example label="Badge">
        <Badge>Diposting</Badge>
        <Badge variant="secondary">Draf</Badge>
        <Badge variant="outline">Periode terbuka</Badge>
        <Badge variant="destructive">Ditolak</Badge>
      </Example>
    </Section>
  );
}

function FormSection() {
  const [state, action, pending] = useToastAction(demoSubmit);
  return (
    <Section id="form" title="Form" description="Label di atas field, keterangan di bawah, error field di bawah field, error umum di atas tombol.">
      <form action={action} className="grid max-w-3xl gap-6 md:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="demo-description">Keterangan</FieldLabel>
            <Input id="demo-description" name="description" placeholder="mis. Pembayaran listrik Januari" />
            <FieldDescription>Kosongkan lalu kirim untuk melihat error umum.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-amount">Jumlah</FieldLabel>
            <MoneyInput id="demo-amount" name="amount" defaultValue="1500000" />
            <FieldDescription>Ketik 1500000 → 1.500.000. Koma untuk sen: 1500000,5.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-date">Tanggal</FieldLabel>
            <DatePicker id="demo-date" name="date" defaultValue="2027-01-31" required />
            <FieldDescription>dd/MM/yyyy, minggu mulai Senin.</FieldDescription>
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>Akun</FieldLabel>
            <Select name="account" defaultValue="1101">
              <SelectTrigger aria-label="Akun">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1101">1101 · Kas</SelectItem>
                <SelectItem value="1102">1102 · Bank BCA</SelectItem>
                <SelectItem value="6101">6101 · Beban listrik</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="demo-invalid">Field dengan error</FieldLabel>
            <Input id="demo-invalid" aria-invalid defaultValue="CV A!" />
            <FieldError>Kode 2–10 huruf besar/angka, mis. CVA.</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-disabled">Field nonaktif</FieldLabel>
            <Input id="demo-disabled" disabled defaultValue="JU/CVA/2027/0001" />
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-notes">Catatan</FieldLabel>
            <Textarea id="demo-notes" placeholder="Opsional" />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="demo-check" defaultChecked />
            <FieldLabel htmlFor="demo-check" className="font-normal">
              Kirim slip ke email karyawan
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="demo-switch" />
            <FieldLabel htmlFor="demo-switch" className="font-normal">
              Tampilkan akun nonaktif
            </FieldLabel>
          </Field>
        </FieldGroup>
        <div className="space-y-3 md:col-span-2">
          <FormError message={state.error} />
          <Button type="submit" disabled={pending}>
            Kirim ke server (contoh)
          </Button>
        </div>
      </form>
    </Section>
  );
}

function FormatSection() {
  const now = new Date();
  const rows: [string, string][] = [
    ["Rupiah bulat", formatRupiah(money("1500000"))],
    ["Rupiah dengan sen", formatRupiah(money("1500000.5"))],
    ["Negatif", formatRupiah(money("-250000"))],
    ["Nol", formatRupiah(money("0"))],
    ["Tanggal (WITA)", formatDate(now)],
    ["Tanggal & jam (WITA)", formatDateTime(now)],
    ["Tanggal bisnis", formatIsoDate("2027-01-31")],
  ];
  return (
    <Section id="format" title="Format angka & tanggal" description="Rupiah tanpa ,00 kecuali ada sen. Semua waktu dalam WITA.">
      <div className="max-w-md overflow-hidden rounded-lg border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b px-3 py-2 last:border-b-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="numeric font-medium">{value}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function DialogSection() {
  const [open, setOpen] = useState(false);
  return (
    <Section id="dialog" title="Dialog & konfirmasi" description="Form pendek di dialog. Aksi permanen wajib dikonfirmasi dengan akibat yang jelas.">
      <Example label="Contoh">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <PencilIcon /> Dialog form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah nama akun</DialogTitle>
              <DialogDescription>Form pendek (beberapa field) dibuka di dialog.</DialogDescription>
            </DialogHeader>
            <Field className="my-4">
              <FieldLabel htmlFor="demo-dialog-name">Nama</FieldLabel>
              <Input id="demo-dialog-name" defaultValue="Beban listrik" />
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  toast.success("Contoh tersimpan.");
                }}
              >
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ConfirmAction
          title="Posting jurnal JU/CVA/2027/0001?"
          description="Jurnal yang sudah diposting tidak bisa diubah atau dihapus. Koreksi hanya lewat jurnal balik."
          confirmLabel="Posting"
          action={demoConfirm}
          fields={{}}
          trigger={<Button>Konfirmasi (posting)</Button>}
        />
        <ConfirmAction
          title="Hapus draf?"
          description="Draf ini akan dihapus permanen."
          confirmLabel="Hapus"
          destructive
          action={demoConfirm}
          fields={{}}
          trigger={
            <Button variant="destructive">
              <TrashIcon /> Konfirmasi (berbahaya)
            </Button>
          }
        />
        <ConfirmAction
          title="Reset kata sandi?"
          description="Hasilnya rahasia yang hanya ditampilkan sekali."
          confirmLabel="Reset"
          action={demoSecret}
          fields={{}}
          secretLabel="Kata sandi sementara"
          trigger={<Button variant="outline">Konfirmasi + rahasia</Button>}
        />
      </Example>
      <div className="max-w-md">
        <OneTimeSecret label="Rahasia sekali tampil" value="Contoh-Rahasia-42" />
      </div>
    </Section>
  );
}

function FeedbackSection() {
  return (
    <Section id="umpan-balik" title="Toast, menu & tooltip" description="Hasil aksi tampil sebagai toast di kanan atas.">
      <Example label="Toast">
        <Button variant="outline" onClick={() => toast.success("Jurnal diposting.")}>
          Sukses
        </Button>
        <Button variant="outline" onClick={() => toast.error("Periode Januari 2027 sudah ditutup.")}>
          Gagal
        </Button>
        <Button variant="outline" onClick={() => toast.info("Proses gaji sedang dihitung.")}>
          Info
        </Button>
        <Button variant="outline" onClick={() => toast.warning("Ada 3 karyawan tanpa NPWP.")}>
          Peringatan
        </Button>
      </Example>
      <Example label="Menu & tooltip">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontalIcon /> Menu aksi baris
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>JU/CVA/2027/0001</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <PencilIcon /> Ubah
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <TrashIcon /> Hapus draf
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifikasi">
              <BellIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tooltip untuk tombol ikon</TooltipContent>
        </Tooltip>
      </Example>
    </Section>
  );
}

// Module level so cell components keep their identity across renders (see DataTable).
const tableColumns: ColumnDef<Row>[] = [
  { accessorKey: "date", header: "Tanggal", enableSorting: true, meta: { className: "w-36" }, cell: ({ row }) => formatIsoDate(row.original.date) },
  { accessorKey: "id", header: "Nomor", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
  { accessorKey: "description", header: "Keterangan" },
  {
    accessorKey: "amount",
    header: "Jumlah",
    enableSorting: true,
    meta: { className: "numeric w-44" },
    cell: ({ row }) => formatRupiah(money(row.original.amount)),
  },
];

function TableSection({ rows, total, page, pageSize }: { rows: Row[]; total: number; page: number; pageSize: number }) {
  return (
    <Section id="tabel" title="Tabel" description="Cari, urutkan, dan pindah halaman lewat URL; data diproses di server. Angka rata kanan.">
      <DataTable
        columns={tableColumns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        searchPlaceholder="Cari nomor atau keterangan…"
        toolbar={
          <Button variant="outline" onClick={() => toast.info("Di halaman sungguhan, ini mengunduh .xlsx.")}>
            <DownloadIcon /> Ekspor Excel
          </Button>
        }
      />
    </Section>
  );
}

function OtherSection() {
  return (
    <Section id="lainnya" title="Card, tab, skeleton & kosong">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Saldo kas</CardTitle>
            <CardDescription>CVA · per 31/01/2027</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="numeric text-left text-2xl font-semibold">{formatRupiah(money("125750000"))}</p>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="h-auto p-0">
              Lihat buku besar
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Memuat</CardTitle>
            <CardDescription>Skeleton selama data dimuat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <InboxIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Belum ada jurnal</p>
            <p className="text-sm text-muted-foreground">Keadaan kosong: jelaskan dan beri aksi berikutnya.</p>
            <Button size="sm">
              <PlusIcon /> Tambah jurnal
            </Button>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="ringkasan" className="max-w-xl">
        <TabsList>
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="baris">Baris jurnal</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan" className="text-sm">Tab untuk memisahkan bagian dalam satu halaman detail.</TabsContent>
        <TabsContent value="baris" className="text-sm">Isi tab kedua.</TabsContent>
        <TabsContent value="riwayat" className="text-sm">Isi tab ketiga.</TabsContent>
      </Tabs>
    </Section>
  );
}
