"use client";

import { useParams } from "next/navigation";

export type CompanyOption = { id: string; code: string; name: string };

/**
 * The Company in the URL (ADR-0008). On pages without one (e.g. settings),
 * falls back to the first accessible Company so module links still work.
 */
export function useCurrentCompany(companies: CompanyOption[]): { company: CompanyOption | null; fromUrl: boolean } {
  const params = useParams<{ company?: string }>();
  const fromUrl = companies.find((c) => c.code.toLowerCase() === params.company?.toLowerCase());
  return { company: fromUrl ?? companies[0] ?? null, fromUrl: !!fromUrl };
}
