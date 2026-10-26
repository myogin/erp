"use client";

import { KeyRoundIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">{initials}</span>
          <span className="hidden sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/ganti-password">
            <KeyRoundIcon /> Ganti kata sandi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/keamanan/2fa">
            <ShieldCheckIcon /> Verifikasi 2 langkah
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await authClient.signOut();
            router.push("/masuk");
            router.refresh();
          }}
        >
          <LogOutIcon /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
