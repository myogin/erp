// Reads the URL search params that DataTable writes (`q`, `sort`, `page`; docs/ui.md).

type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 20;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `q`, `page` and `sort` from the URL; `sort` only if it's one of `allowedSorts`. */
export function listParams<S extends string>(params: SearchParams, allowedSorts: readonly S[] = []) {
  const sort = one(params.sort);
  return {
    search: one(params.q) || undefined,
    sort: allowedSorts.find((s) => s === sort),
    page: Number(one(params.page)) || 1,
    pageSize: PAGE_SIZE,
  };
}
