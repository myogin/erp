"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentCompany, type CompanyOption } from "./use-current-company";

/** Switches Company by moving to the same page under the other code (ADR-0008). */
export function CompanySwitcher({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { company, fromUrl } = useCurrentCompany(companies);

  if (companies.length === 0) return <span className="text-sm text-muted-foreground">Belum ada perusahaan</span>;

  function switchTo(target: CompanyOption) {
    const code = target.code.toLowerCase();
    const rest = fromUrl ? pathname.split("/").slice(2).join("/") : "";
    router.push(rest ? `/${code}/${rest}` : `/${code}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {fromUrl && company ? (
            <>
              <span className="font-mono text-xs text-muted-foreground">{company.code}</span>
              <span className="font-medium">{company.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Pilih perusahaan</span>
          )}
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuLabel>Perusahaan</DropdownMenuLabel>
        {companies.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => switchTo(c)}>
            <span className="w-12 font-mono text-xs text-muted-foreground">{c.code}</span>
            {c.name}
            {fromUrl && c.id === company?.id && <CheckIcon className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
