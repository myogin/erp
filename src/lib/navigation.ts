import {
  BookOpenIcon,
  BuildingIcon,
  CalculatorIcon,
  FileTextIcon,
  HomeIcon,
  LockIcon,
  NotebookPenIcon,
  ReceiptIcon,
  ScaleIcon,
  ScrollTextIcon,
  ShieldIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import type { Grant, Role } from "@/modules/access/roles";

export type NavItem = { title: string; href: string; icon: LucideIcon; soon?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

/** Roles the user holds on this Company, counting the global ones. */
function rolesOn(grants: Grant[], companyId: string | null): Set<Role> {
  return new Set(grants.filter((g) => g.companyId === null || g.companyId === companyId).map((g) => g.role));
}

/**
 * The sidebar for the current Company (ADR-0008). Items marked `soon` are
 * planned modules, shown disabled so the structure is visible early.
 */
export function navigation(grants: Grant[], company: { id: string; code: string } | null): NavGroup[] {
  const roles = rolesOn(grants, company?.id ?? null);
  const has = (...wanted: Role[]) => wanted.some((r) => roles.has(r));
  const base = company ? `/${company.code.toLowerCase()}` : null;
  const groups: NavGroup[] = [{ title: "", items: [{ title: "Beranda", href: base ?? "/", icon: HomeIcon }] }];

  if (base && has("owner", "admin", "finance", "management")) {
    groups.push({
      title: "Akuntansi",
      items: [
        { title: "Bagan Akun", href: `${base}/akun`, icon: BookOpenIcon, soon: true },
        { title: "Jurnal", href: `${base}/jurnal`, icon: NotebookPenIcon, soon: true },
        { title: "Neraca Saldo", href: `${base}/neraca-saldo`, icon: ScaleIcon, soon: true },
        { title: "Tutup Buku", href: `${base}/tutup-buku`, icon: LockIcon, soon: true },
      ],
    });
  }
  // Salary data: Owner and HR only (ADR-0006).
  if (base && has("owner", "hr")) {
    groups.push({
      title: "Penggajian",
      items: [
        { title: "Karyawan", href: `${base}/karyawan`, icon: UsersIcon, soon: true },
        { title: "Komponen Gaji", href: `${base}/komponen-gaji`, icon: WalletIcon, soon: true },
        { title: "Proses Gaji", href: `${base}/proses-gaji`, icon: CalculatorIcon, soon: true },
        { title: "Slip Gaji", href: `${base}/slip-gaji`, icon: ReceiptIcon, soon: true },
      ],
    });
  }
  if (base && has("owner", "admin", "finance", "management")) {
    groups.push({ title: "Laporan", items: [{ title: "Laporan", href: `${base}/laporan`, icon: FileTextIcon, soon: true }] });
  }
  if (has("owner", "admin")) {
    groups.push({
      title: "Pengaturan",
      items: [
        { title: "Perusahaan", href: "/pengaturan/perusahaan", icon: BuildingIcon },
        { title: "Pengguna", href: "/pengaturan/pengguna", icon: ShieldIcon },
        { title: "Audit Log", href: "/pengaturan/audit", icon: ScrollTextIcon },
      ],
    });
  }
  return groups;
}
