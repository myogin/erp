import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Memuat…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b border-zinc-200 px-6 py-3 text-sm dark:border-zinc-800">
        <Link href="/" className="font-semibold">
          ERP
        </Link>
        {user.isAdministrator && (
          <nav className="flex gap-4">
            <Link href="/pengaturan/perusahaan">Perusahaan</Link>
            <Link href="/pengaturan/pengguna">Pengguna</Link>
            <Link href="/pengaturan/audit">Audit log</Link>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-zinc-600 dark:text-zinc-400">{user.name}</span>
          <Link href="/ganti-password">Ganti kata sandi</Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">{children}</main>
    </div>
  );
}
