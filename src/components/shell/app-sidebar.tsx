"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navigation } from "@/lib/navigation";
import type { Grant } from "@/modules/access/roles";
import { useCurrentCompany, type CompanyOption } from "./use-current-company";

export function AppSidebar({ grants, companies }: { grants: Grant[]; companies: CompanyOption[] }) {
  const pathname = usePathname();
  const { company } = useCurrentCompany(companies);
  const groups = navigation(grants, company);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={company ? `/${company.code.toLowerCase()}` : "/"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                  E
                </div>
                <span className="font-semibold">ERP</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.title || "home"}>
            {group.title && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.soon ? (
                      <SidebarMenuButton disabled tooltip={`${item.title} (segera)`} className="opacity-60">
                        <item.icon />
                        <span>{item.title}</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          segera
                        </Badge>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
