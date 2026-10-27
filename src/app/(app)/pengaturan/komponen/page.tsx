import { requireAdministrator } from "@/lib/session";
import { listParams } from "@/lib/list-params";
import { Showcase } from "./showcase";

// Sample rows for the table demo, filtered, sorted and paged on the server like real lists.
const SAMPLE = Array.from({ length: 45 }, (_, i) => {
  const n = i + 1;
  return {
    id: `JU-${String(n).padStart(4, "0")}`,
    date: `2027-01-${String((n % 28) + 1).padStart(2, "0")}`,
    description: ["Pembayaran listrik", "Penjualan tunai", "Pembelian ATK", "Gaji karyawan", "Biaya sewa"][n % 5],
    amount: ((n * 1_234_567) % 50_000_000).toString() + (n % 4 === 0 ? ".50" : ""),
  };
});
const SORTS = ["date", "-date", "amount", "-amount"] as const;

export default async function ComponentsPage({ searchParams }: PageProps<"/pengaturan/komponen">) {
  await requireAdministrator();
  const { search, sort = "date", page, pageSize } = listParams(await searchParams, SORTS);
  const key = sort.replace("-", "") as "date" | "amount";
  const filtered = SAMPLE.filter((r) => !search || `${r.id} ${r.description}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    const cmp = key === "amount" ? Number(a.amount) - Number(b.amount) : a.date.localeCompare(b.date);
    return sort.startsWith("-") ? -cmp : cmp;
  });

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Komponen UI</h1>
        <p className="text-sm text-muted-foreground">
          Acuan visual untuk semua halaman (docs/ui.md). Semua aksi di sini hanya contoh dan tidak mengubah data.
        </p>
      </div>
      <Showcase rows={filtered.slice((page - 1) * pageSize, page * pageSize)} total={filtered.length} page={page} pageSize={pageSize} />
    </>
  );
}
