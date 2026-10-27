# UI guidelines

How screens in this app look and behave. New pages follow these patterns; deviate only with a reason.

## Foundation

- **Components**: shadcn/ui (Radix base, "Nova" preset) in `src/components/ui`. Add more with `npx shadcn@latest add <name>`. They are our code: adjust them freely.
- **Theme**: light mode only. Neutral greys with a **dark blue** accent (`--primary` in `globals.css`). Swap in the brand colour there when a logo exists.
- **Language**: all UI text in Bahasa Indonesia. Code identifiers stay in English and map to UI terms through `GLOSSARY.md`.
- **Devices**: desktop-first (≥1280px), usable on tablets. The Employee Portal is the exception: mobile-first.

Every component and pattern below is on one page: **Pengaturan → Komponen UI** (`/pengaturan/komponen`, Owner/Admin). Check new screens against it.

## Layout & navigation

- Collapsible **left sidebar** grouped by module: Beranda, Akuntansi, Penggajian, Laporan, Pengaturan. A user sees only the items their Roles allow (`src/lib/navigation.ts`).
- Thin **top bar** with the Company switcher and the user menu.
- Company-scoped pages live under `/<company code>/…` (ADR-0008).

## Page patterns

- **List pages**: a full-width table with the page title and a primary "Tambah …" button at the top right.
- **Short forms** (a few fields: Company, User, Role) open in a **dialog**. **Long or multi-step forms** (Journal Entry lines, Employee data, a Payroll Run) get **their own page**.
- **Tables** use the shared `DataTable` (TanStack Table): pagination, sorting and search run **on the server** through URL search params, so the URL describes the view. Main tables offer **Ekspor Excel**.
- Figures in tables are right-aligned with tabular digits (the `numeric` utility).

## Feedback

- Success and failure messages appear as a **toast** (sonner).
- Every **permanent action** (posting, Period Close, revoking a Role, resetting a password, posting a Payroll Run) asks for confirmation in an **alert dialog** that names the consequence, e.g. "Jurnal yang sudah diposting tidak bisa diubah."
- Field-level validation errors show under the field. A form's general error shows above its submit button.

## Formats (all in WITA, `src/lib/time.ts` and `src/lib/money.ts`)

- **Money**: `Rp 1.500.000`. Cents show only when they exist (`Rp 1.500.000,50`), so the screen never silently rounds. Use `MoneyInput`: it formats thousands while typing and submits a plain decimal (`1500000.50`).
- **Dates**: `dd/MM/yyyy`. Use `DatePicker` (weeks start on Monday); it submits `yyyy-MM-dd`, a calendar day with no time zone. Date-times: `dd/MM/yyyy HH.mm`.
