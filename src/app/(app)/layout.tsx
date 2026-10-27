import { Suspense, type ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { CompanySwitcher } from "@/components/shell/company-switcher";
import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { UserMenu } from "@/components/shell/user-menu";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDb } from "@/db/client";
import { requireUser } from "@/lib/session";
import { listAccessibleCompanies } from "@/modules/access";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const companies = (await listAccessibleCompanies(getDb(), user)).map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar grants={user.grants} companies={companies} />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <CompanySwitcher companies={companies} />
            <div className="ml-auto">
              <UserMenu name={user.name} email={user.email} />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
