// Proposed COA Template for Finance review (issue #22, ADR-0009). Not final:
// once approved it moves into the accounting module for #5. Names follow
// Accurate (the majority name when the CVs differ, "Beban" for expenses).

export const ACCOUNT_TYPES = {
  CASH_BANK: "Kas & Bank",
  ACCOUNT_RECEIVABLE: "Piutang",
  INVENTORY: "Persediaan",
  OTHER_CURRENT_ASSET: "Aset Lancar Lainnya",
  FIXED_ASSET: "Aset Tetap",
  ACCUMULATED_DEPRECIATION: "Akumulasi Penyusutan",
  ACCOUNT_PAYABLE: "Utang Usaha",
  OTHER_CURRENT_LIABILITY: "Utang Lancar Lainnya",
  LONG_TERM_LIABILITY: "Utang Jangka Panjang",
  EQUITY: "Ekuitas",
  REVENUE: "Pendapatan",
  COGS: "Beban Pokok Penjualan",
  EXPENSE: "Beban",
  OTHER_INCOME: "Pendapatan Lain",
  OTHER_EXPENSE: "Beban Lain",
} as const;

export type AccountType = keyof typeof ACCOUNT_TYPES;

export type DraftAccount = { code: string; name: string; type: AccountType; header: boolean };

// Each header is followed by its children; children take the header's type.
type Group = [code: string, name: string, type: AccountType, children: [code: string, name: string][]];

const GROUPS: Group[] = [
  ["1101", "Kas & Bank", "CASH_BANK", [["110101", "Kas Kecil"]]],
  ["1102", "Setara Kas", "CASH_BANK", []],
  ["1103", "Piutang Usaha", "ACCOUNT_RECEIVABLE", [
    ["110301", "Piutang Dagang"],
    ["110302", "Uang Muka Pembelian"],
    ["110303", "Piutang Karyawan"],
    ["110304", "Piutang Reimburse"],
    ["110305", "Piutang Lainnya"],
    ["110306", "Piutang Reimburse - PPh"],
  ]],
  ["1104", "Persediaan", "INVENTORY", [
    ["110401", "Persediaan"],
    ["110402", "Persediaan Terkirim"],
    ["110403", "Persediaan Bahan Baku"],
    ["110404", "Persediaan Bahan Pembantu"],
    ["110405", "Persediaan Setengah Jadi"],
    ["110406", "Persediaan Barang Jadi"],
    ["110407", "Persediaan Dalam Proses Produksi"],
  ]],
  ["1105", "Aset Lancar Lainnya", "OTHER_CURRENT_ASSET", [
    ["110501", "Perlengkapan Kantor"],
    ["110502", "Sewa Gedung Dibayar Dimuka"],
    ["110503", "Asuransi Dibayar Dimuka"],
    ["110504", "Beban Dibayar Dimuka"],
    ["110505", "Pembelian Aset"],
    ["110506", "Retur Dalam Proses"],
    ["110509", "Aset Lancar Lainnya"],
  ]],
  ["1106", "Pajak Dibayar Dimuka", "OTHER_CURRENT_ASSET", [
    ["110601", "PPN Masukan"],
    ["110602", "PPh 23 Penjualan"],
    ["110603", "PPh Final Dimuka"],
  ]],
  ["1200", "Aset Tetap", "FIXED_ASSET", [
    ["120001", "Tanah"],
    ["120002", "Gedung"],
    ["120003", "Kendaraan"],
    ["120004", "Peralatan"],
    ["120005", "Inventaris Kantor"],
    ["120006", "Mesin"],
    ["120007", "Bangunan Dalam Pembangunan"],
  ]],
  ["1201", "Akumulasi Penyusutan Aset Tetap", "ACCUMULATED_DEPRECIATION", [
    ["120101", "Akumulasi Penyusutan Gedung"],
    ["120102", "Akumulasi Penyusutan Kendaraan"],
    ["120103", "Akumulasi Penyusutan Peralatan"],
    ["120104", "Akumulasi Penyusutan Inventaris Kantor"],
    ["120105", "Akumulasi Penyusutan Mesin"],
  ]],
  ["2101", "Utang Usaha", "ACCOUNT_PAYABLE", [
    ["210101", "Utang Dagang"],
    ["210102", "Uang Muka Penjualan"],
    ["210103", "Hutang Pembelian Belum Ditagih"],
  ]],
  ["2102", "Utang Pajak", "OTHER_CURRENT_LIABILITY", [
    ["210201", "PPN Keluaran"],
    ["210202", "Utang PPN"],
    ["210203", "Utang PPh 21"],
    ["210204", "Utang PPh 23"],
    ["210205", "Utang PPh Final 4 ayat 2"],
    ["210206", "Utang PPh Final UMKM"],
    ["210207", "Utang PPh 25/29"],
  ]],
  ["2103", "Kewajiban Jangka Pendek Lainnya", "OTHER_CURRENT_LIABILITY", [
    ["210301", "Utang Gaji"],
    ["210302", "Utang BPJS Kesehatan"],
    ["210303", "Utang BPJS Ketenagakerjaan"],
    ["210304", "Utang Karyawan"],
    ["210305", "Utang Sewa"],
    ["210306", "Utang Beban"],
    ["210309", "Utang Lainnya"],
  ]],
  ["2201", "Hutang Jangka Panjang", "LONG_TERM_LIABILITY", [
    ["220101", "Utang Bank"],
    ["220102", "Hutang Jangka Panjang Lainnya"],
  ]],
  ["3101", "Modal", "EQUITY", [
    ["310101", "Modal Saham"],
    ["310102", "Prive"],
    ["310103", "Laba Ditahan"],
    ["310104", "Laba (Rugi) Tahun Berjalan"],
    ["310105", "Equitas Saldo Awal"],
  ]],
  ["4101", "Pendapatan Operasional", "REVENUE", [
    ["410101", "Penjualan"],
    ["410102", "Pendapatan Jasa"],
    ["410103", "Pendapatan Ongkos Kirim"],
    ["410104", "Pendapatan Lainnya"],
  ]],
  ["4102", "Retur & Diskon Penjualan", "REVENUE", [
    ["410201", "Retur Penjualan"],
    ["410202", "Diskon Penjualan"],
  ]],
  ["5101", "Beban Pokok Penjualan", "COGS", [
    ["510101", "Beban Pokok Penjualan"],
    ["510102", "Biaya Selisih Stock Opname"],
    ["510103", "Beban Diskon Pembelian"],
  ]],
  ["5102", "Biaya Bahan", "COGS", [
    ["510201", "Biaya Bahan Baku"],
    ["510202", "Biaya Bahan Kemasan"],
    ["510203", "Biaya Bahan Pembantu"],
    ["510204", "Biaya Bahan Setengah Jadi"],
    ["510205", "Biaya Barang Jadi"],
  ]],
  ["5103", "Biaya Tenaga Kerja Langsung", "COGS", [
    ["510301", "Biaya Tenaga Kerja Langsung"],
    ["510302", "Biaya Konsumsi TKL"],
  ]],
  ["5104", "Biaya Overhead Produksi", "COGS", [
    ["510401", "Biaya Operasional - Produksi"],
    ["510402", "Biaya Penyusutan - Mesin"],
    ["510403", "Biaya Maintenance - Mesin"],
    ["510404", "Biaya Gas"],
  ]],
  ["6101", "Beban Karyawan", "EXPENSE", [
    ["610101", "Beban Gaji Karyawan Tetap"],
    ["610102", "Beban Gaji Bukan Pegawai Tetap"],
    ["610103", "Beban THR"],
    ["610104", "Beban Bonus, Pesangon & Kompensasi"],
    ["610105", "Beban BPJS Kesehatan"],
    ["610106", "Beban BPJS Ketenagakerjaan"],
    ["610107", "Beban Asuransi Karyawan"],
    ["610108", "Beban Katering & Makan Karyawan"],
    ["610109", "Beban Komisi"],
    ["610110", "Beban SDM"],
    ["610111", "Beban Tunjangan Kesehatan"],
  ]],
  ["6102", "Beban Pemasaran & Penjualan", "EXPENSE", [
    ["610201", "Beban Iklan"],
    ["610202", "Beban Sponsorship"],
    ["610203", "Beban ATK Sales"],
    ["610204", "Beban Operasional Sales & Logistik"],
    ["610205", "Beban Ekspedisi, Pos & Materai"],
    ["610206", "Beban Sewa - Sales & Marketing"],
    ["610207", "Beban Pemasaran & Iklan"],
    ["610208", "Beban Perlengkapan - Sales"],
  ]],
  ["6103", "Beban Umum & Administrasi", "EXPENSE", [
    ["610301", "Beban Operasional Kantor"],
    ["610302", "Beban Perlengkapan Kantor"],
    ["610303", "Beban Listrik"],
    ["610304", "Beban Air PDAM"],
    ["610305", "Beban Telekomunikasi"],
    ["610306", "Beban Sewa"],
    ["610307", "Beban Perjalanan Dinas"],
    ["610308", "Beban BBM"],
    ["610309", "Beban Fee Profesional"],
    ["610310", "Beban Retribusi & Sumbangan"],
    ["610311", "Beban Parkir dan Tol Kendaraan"],
    ["610312", "Beban Perizinan"],
    ["610319", "Beban Operasional Lainnya"],
  ]],
  ["6104", "Beban Pemeliharaan", "EXPENSE", [
    ["610401", "Beban Maintenance - Kendaraan"],
    ["610402", "Beban Maintenance - Gedung"],
    ["610403", "Beban Maintenance - Inventaris"],
  ]],
  ["6105", "Beban Penyusutan", "EXPENSE", [
    ["610501", "Beban Penyusutan Gedung"],
    ["610502", "Beban Penyusutan Kendaraan"],
    ["610503", "Beban Penyusutan Peralatan"],
    ["610504", "Beban Penyusutan Inventaris Kantor"],
  ]],
  ["7101", "Pendapatan Diluar Usaha", "OTHER_INCOME", [
    ["710101", "Pendapatan Jasa Giro"],
    ["710102", "Pendapatan Bunga Deposito"],
    ["710103", "Laba/Rugi Disposisi Aset"],
    ["710104", "Penjualan Persediaan / Perlengkapan"],
    ["710105", "Laba/Rugi Revaluasi Aset"],
    ["710110", "Pendapatan Diluar Usaha Lainnya"],
  ]],
  ["8101", "Beban Diluar Usaha", "OTHER_EXPENSE", [
    ["810101", "Beban Admin Bank"],
    ["810102", "Pajak Jasa Giro"],
    ["810110", "Beban Diluar Usaha Lainnya"],
  ]],
  ["8102", "Beban Pajak", "OTHER_EXPENSE", [
    ["810201", "Beban PPh 21"],
    ["810202", "Beban PPh 23"],
    ["810203", "Beban PPh 25/29"],
    ["810204", "Beban PPh Final 4 ayat 2"],
    ["810205", "Beban PPh Final UMKM"],
    ["810206", "Beban Administrasi Pajak"],
  ]],
  ["8103", "Selisih Kurs", "OTHER_EXPENSE", [
    ["810301", "Laba/Rugi Terealisasi"],
    ["810302", "Laba/Rugi Belum Terealisasi"],
  ]],
];

export const TEMPLATE: DraftAccount[] = GROUPS.flatMap(([code, name, type, children]) => [
  { code, name, type, header: true },
  ...children.map(([childCode, childName]) => ({ code: childCode, name: childName, type, header: false })),
]);
