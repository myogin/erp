import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import type { AccurateAccount } from "../accounts";
import { DRAFTS } from "./mappings";
import { ACCOUNT_TYPES, TEMPLATE, type AccountType, type DraftAccount } from "./template";

// `npm run accurate:coa-draft`: builds the Finance review workbook (issue #22)
// from the proposed template, the mappings and the export of
// `npm run accurate:export-coa`. Fails if any Accurate account is left unmapped.
const EXPORT_DIR = path.resolve("exports/accurate");
const OUT_FILE = path.join(EXPORT_DIR, "draf-coa-template.xlsx");

const QUESTIONS = [
  "Apakah daftar akun di sheet Template sudah tepat? Tambah, hapus, atau ganti nama akun di kolom Komentar Finance.",
  "Apakah pemetaan akun Accurate ke akun ERP di setiap sheet Pemetaan sudah benar? Perhatikan baris yang berisi catatan.",
  "Ketiga CV memakai nama berbeda untuk akun yang sama, jadi di ERP harus dipilih satu. Draf ini memakai nama yang dipakai mayoritas CV. Contoh: \"Gedung\" (KREASI dan KARYA), bukan \"Bangunan & Gedung\" (MERUBALI). Setuju, atau ada nama yang ingin diganti? (Lihat kolom \"Nama berubah?\" di sheet Pemetaan.)",
  "Semua akun beban memakai awalan \"Beban\" seperti di KREASI dan KARYA, sementara MERUBALI selama ini memakai \"Biaya\" (contoh: \"Biaya Sewa\" menjadi \"Beban Sewa\"). Setuju?",
  "Penomoran Sub-akun: nomor 01-49 di bawah setiap induk dicadangkan untuk template, dan 50-99 untuk Sub-akun milik CV (contoh: Bank BCA KREASI = 110150). Setuju, atau ada pola penomoran yang biasa dipakai?",
  "Seberapa sering MERUBALI bertransaksi dalam USD, dan untuk apa (ekspor, deposito, lainnya)?",
  "Akun yang dinonaktifkan di Accurate tidak dibawa ke ERP (lihat status \"Nonaktif\"). Apakah ada yang masih punya saldo?",
];

type Row = { account: AccurateAccount; isHeader: boolean };

function parentCode(code: string) {
  return code.slice(0, -2);
}

async function loadExport(code: string): Promise<Row[]> {
  const file = path.join(EXPORT_DIR, `${code}-glaccount.json`);
  const { accounts } = JSON.parse(await readFile(file, "utf8")) as { accounts: AccurateAccount[] };
  const parents = new Set(accounts.map((a) => a.parentId?.no).filter(Boolean));
  return accounts.map((account) => ({ account, isHeader: parents.has(account.no) }));
}

function validateTemplate() {
  const codes = new Set(TEMPLATE.map((a) => a.code));
  for (const account of TEMPLATE) {
    if (account.code.length === 4) continue;
    const suffix = Number(account.code.slice(-2));
    if (!codes.has(parentCode(account.code))) throw new Error(`Template ${account.code}: parent missing`);
    if (suffix < 1 || suffix > 49) throw new Error(`Template ${account.code}: child number must be 01-49`);
  }
}

/** The Company's full chart: template plus its Sub-accounts, which turn their parent into a header. */
function companyChart(code: string): Map<string, DraftAccount> {
  const chart = new Map(TEMPLATE.map((a) => [a.code, { ...a }]));
  for (const [subCode, name] of DRAFTS[code].subAccounts) {
    const parent = chart.get(parentCode(subCode));
    const suffix = Number(subCode.slice(-2));
    if (!parent) throw new Error(`${code} Sub-account ${subCode}: parent ${parentCode(subCode)} missing`);
    if (suffix < 50) throw new Error(`${code} Sub-account ${subCode}: number must be 50-99`);
    parent.header = true;
    chart.set(subCode, { code: subCode, name, type: parent.type, header: false });
  }
  return chart;
}

function typeLabel(type: string) {
  return ACCOUNT_TYPES[type as AccountType] ?? type;
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function main() {
  validateTemplate();
  const workbook = new ExcelJS.Workbook();
  const usage = new Map<string, Set<string>>();
  const mappingSheets: [string, (string | number)[][]][] = [];

  for (const company of Object.keys(DRAFTS)) {
    const rows = await loadExport(company);
    const chart = companyChart(company);
    const { mapping } = DRAFTS[company];
    const lines: (string | number)[][] = [];
    for (const { account, isHeader } of rows) {
      const status = account.suspended ? "Nonaktif" : isHeader ? "Akun Induk" : "Aktif";
      const target = mapping[account.no];
      if (!target) {
        if (status === "Aktif") throw new Error(`${company} ${account.no} ${account.name}: not mapped`);
        const reason = status === "Nonaktif" ? "Tidak dibawa (nonaktif di Accurate)" : "Akun induk, tidak membawa saldo";
        lines.push([account.no, account.name, typeLabel(account.accountType), status, "", reason, "", "", "", ""]);
        continue;
      }
      const [erpCode, note = ""] = target;
      const erp = chart.get(erpCode);
      if (!erp) throw new Error(`${company} ${account.no}: ERP account ${erpCode} does not exist`);
      if (erp.header) throw new Error(`${company} ${account.no}: ERP account ${erpCode} is a header`);
      const kind = TEMPLATE.some((a) => a.code === erpCode) ? "Template" : "Sub-akun";
      const typeNote = erp.type !== account.accountType ? `Jenis berubah dari ${typeLabel(account.accountType)}.` : "";
      if (!usage.has(erpCode)) usage.set(erpCode, new Set());
      usage.get(erpCode)!.add(company);
      const renamed = erp.name !== account.name ? "Ya" : "";
      lines.push([account.no, account.name, typeLabel(account.accountType), status, erpCode, erp.name, kind, renamed, [note, typeNote].filter(Boolean).join(" "), ""]);
    }
    for (const [subCode] of DRAFTS[company].subAccounts) {
      if (!usage.get(subCode)?.has(company)) throw new Error(`${company} Sub-account ${subCode} is never used`);
    }
    mappingSheets.push([company, lines]);
  }

  const intro = workbook.addWorksheet("Petunjuk");
  intro.getColumn(1).width = 110;
  [
    "Draf COA Template dan Pemetaan Akun (Account Mapping) - untuk direview Finance",
    "",
    "Sheet Template: daftar akun standar yang akan dimiliki SEMUA CV di ERP, dengan kode yang sama.",
    "Akun Induk hanya mengelompokkan akun di bawahnya dan tidak bisa dipakai untuk mencatat transaksi.",
    "Sub-akun: rincian milik satu CV saja (rekening bank, bahan baku MERUBALI), dibuat di bawah akun template.",
    "Sheet Pemetaan <CV>: setiap akun Accurate saat ini, dan ke akun ERP mana saldonya akan dipindahkan.",
    "Sheet Pertanyaan: hal yang perlu diputuskan Finance.",
    "",
    "Mohon isi kolom \"Komentar Finance\" bila ada yang perlu diubah. Kosong berarti setuju.",
  ].forEach((text, i) => {
    intro.getCell(i + 1, 1).value = text;
  });
  intro.getRow(1).font = { bold: true, size: 14 };

  const template = workbook.addWorksheet("Template");
  template.columns = [
    { header: "Kode", width: 10 },
    { header: "Nama Akun", width: 42 },
    { header: "Jenis", width: 24 },
    { header: "Akun Induk?", width: 12 },
    { header: "Dipakai oleh", width: 26 },
    { header: "Komentar Finance", width: 50 },
  ];
  for (const account of TEMPLATE) {
    const row = template.addRow([
      account.code,
      account.name,
      ACCOUNT_TYPES[account.type],
      account.header ? "Ya" : "",
      [...(usage.get(account.code) ?? [])].join(", "),
      "",
    ]);
    if (account.header) row.font = { bold: true };
    else row.getCell(2).alignment = { indent: 2 };
  }
  styleHeader(template);

  for (const [company, lines] of mappingSheets) {
    const sheet = workbook.addWorksheet(`Pemetaan ${company}`);
    sheet.columns = [
      { header: "Kode Accurate", width: 14 },
      { header: "Nama Akun Accurate", width: 40 },
      { header: "Jenis di Accurate", width: 22 },
      { header: "Status", width: 12 },
      { header: "Kode ERP", width: 12 },
      { header: "Nama Akun ERP", width: 40 },
      { header: "Template / Sub-akun", width: 18 },
      { header: "Nama berubah?", width: 14 },
      { header: "Catatan", width: 60 },
      { header: "Komentar Finance", width: 50 },
    ];
    for (const line of lines) {
      const row = sheet.addRow(line);
      if (line[7]) row.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
      if (line[8]) row.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      if (line[3] !== "Aktif") row.font = { color: { argb: "FF6B7280" } };
    }
    styleHeader(sheet);
  }

  const questions = workbook.addWorksheet("Pertanyaan");
  questions.columns = [
    { header: "No", width: 5 },
    { header: "Pertanyaan", width: 90 },
    { header: "Jawaban Finance", width: 60 },
  ];
  QUESTIONS.forEach((q, i) => questions.addRow([i + 1, q, ""]).alignment = { wrapText: true, vertical: "top" });
  styleHeader(questions);

  await workbook.xlsx.writeFile(OUT_FILE);
  console.log(`Template: ${TEMPLATE.length} akun. ${mappingSheets.map(([c, l]) => `${c}: ${l.length} baris`).join(", ")}`);
  console.log(`-> ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
