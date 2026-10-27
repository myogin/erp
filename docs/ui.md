# UI guidelines

How screens in this app look and behave. New pages follow these patterns; deviate only with a reason.

## Foundation

- **Components**: shadcn/ui (Radix base, "Nova" preset) in `src/components/ui`. Add more with `npx shadcn@latest add <name>`. They are our code: adjust them freely.
- **Style**: "Minimalism & Swiss" from the project's `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max`): calm, dense, structure from borders rather than shadows. Use the skill as an adviser for new screens; ignore its landing-page patterns and glass effects.
- **Theme**: light mode only. Slate neutrals on a `#F8FAFC` page, white cards, tables and fields, a **trust blue** accent (`--primary`, `#1D4ED8`). Swap in the brand colour there when a logo exists. Radius `0.5rem`; shadows only on floating layers (popover, dropdown, dialog).
- **Colour tokens** (`globals.css`), never raw hex in components: `success`, `warning`, `info` and `destructive` for statuses, each readable (4.5:1) as text on its own 10% tint, which is how badges use them. `chart-1`…`chart-5` are the Okabe-Ito palette, distinguishable with any colour vision; still label every series, never rely on colour alone.
- **Typography**: Geist (has tabular digits for the `numeric` utility), chosen over the skill's Plus Jakarta Sans; Geist Mono for codes and document numbers. The root size is 18px (`globals.css`), so every rem-based size is 12.5% larger than Tailwind's defaults. Page title `text-2xl`, section title `text-base`/`text-lg`, body and tables `text-sm` (≈16px), never below `text-xs`.
- **Sizes**: controls (button, input, select) are `h-9` (≈40px), `h-11` (≈50px) on touch screens (`pointer-coarse`). Table rows are `h-9`; row action buttons use `size="icon-sm"`.
- **Language**: all UI text in Bahasa Indonesia. Code identifiers stay in English and map to UI terms through `GLOSSARY.md`.
- **Devices**: desktop-first (≥1280px), usable on tablets. The Employee Portal is the exception: mobile-first.

Every component and pattern below is on one page: **Pengaturan → Komponen UI** (`/pengaturan/komponen`, Owner/Admin). Check new screens against it.

## Layout & navigation

- Collapsible **left sidebar** grouped by module: Beranda, Akuntansi, Penggajian, Laporan, Pengaturan. A user sees only the items their Roles allow (`src/lib/navigation.ts`).
- Thin **top bar** with the Company switcher and the user menu only. The breadcrumb lives in the page header.
- Company-scoped pages live under `/<company code>/…` (ADR-0008).

## Page patterns

- **Page header**: every app page starts with `PageHeader`: breadcrumb (sidebar group, then ancestors), title, one-line description, and the page's actions on the right.
- **List pages**: a page header whose action is the primary "Tambah …" button, then the full-width table. Search and secondary actions (Ekspor Excel) sit in the table's toolbar row.
- **Short forms** (a few fields: Company, User, Role) open in a **dialog**. **Long or multi-step forms** (Journal Entry lines, Employee data, a Payroll Run) get **their own page**, split into `FormSection`s (title and help on the left, fields on the right) and ending with `FormActions`, a Simpan/Batal bar that sticks to the bottom of the window.
- **Tables** use the shared `DataTable` (TanStack Table): pagination, sorting and search run **on the server** through URL search params, so the URL describes the view. Main tables offer **Ekspor Excel**.
- Tables scroll with the page, never inside their own box (a page holds 20 rows, so the header stays close); they scroll sideways only when the screen is too narrow.
- **Empty states**: an empty list says so and shows the next step (pass the page's "Tambah …" button as `emptyAction`); a search without hits says so and offers to clear the search.
- Figures in tables are right-aligned with tabular digits (the `numeric` utility).

## Feedback

- **Statuses** (Draf, Diposting, Dibatalkan…) are badges: `secondary` for drafts, `warning` for waiting, `success` for done, `destructive` for cancelled or rejected, `info` for neutral notes. The word carries the meaning; the colour only supports it.
- Success and failure messages appear as a **toast** (sonner).
- Every **permanent action** (posting, Period Close, revoking a Role, resetting a password, posting a Payroll Run) asks for confirmation in an **alert dialog** that names the consequence, e.g. "Jurnal yang sudah diposting tidak bisa diubah."
- Field-level validation errors show under the field. A form's general error shows above its submit button.

## Accessibility

- Text contrast at least 4.5:1 (all tokens meet it on white and on the page background).
- Keep the focus ring; never remove `outline`/`ring` styles. Icon-only buttons need an `aria-label` (and a tooltip when the icon is not obvious). Icons are Lucide SVGs, never emoji.
- Motion is short and functional; `prefers-reduced-motion` turns animations and transitions off globally (`globals.css`).

## Formats (all in WITA, `src/lib/time.ts` and `src/lib/money.ts`)

- **Money**: `Rp 1.500.000`. Cents show only when they exist (`Rp 1.500.000,50`), so the screen never silently rounds. Use `MoneyInput`: it formats thousands while typing and submits a plain decimal (`1500000.50`).
- **Dates**: `dd/MM/yyyy`. Use `DatePicker` (weeks start on Monday); it submits `yyyy-MM-dd`, a calendar day with no time zone. Date-times: `dd/MM/yyyy HH.mm`.
