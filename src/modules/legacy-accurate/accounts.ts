import type { AccurateClient } from "./client";

/** A GL account as Accurate's glaccount/list.do returns it. */
export type AccurateAccount = {
  id: number;
  no: string;
  name: string;
  accountType: string;
  // Despite the name, Accurate returns the whole parent account here.
  parentId?: Omit<AccurateAccount, "parentId"> | null;
  suspended?: boolean;
};

const FIELDS = "id,no,name,accountType,parentId,suspended";

export function listAccounts(client: AccurateClient): Promise<AccurateAccount[]> {
  return client.listAll<AccurateAccount>("/accurate/api/glaccount/list.do", { fields: FIELDS });
}

export type ChartComparison = {
  /** Account codes present in every database, with the same name. */
  identical: number;
  /** Account codes missing from at least one database: code -> databases that have it. */
  partial: Map<string, string[]>;
  /** Account codes in every database whose names differ: code -> name per database. */
  renamed: Map<string, Record<string, string>>;
};

/** Compares the Charts of Accounts of several databases by account code. */
export function compareCharts(charts: Record<string, AccurateAccount[]>): ChartComparison {
  const codes = Object.keys(charts);
  const byNo = new Map<string, Record<string, string>>();
  for (const [code, accounts] of Object.entries(charts)) {
    for (const account of accounts) {
      const names = byNo.get(account.no) ?? {};
      names[code] = account.name;
      byNo.set(account.no, names);
    }
  }

  const result: ChartComparison = { identical: 0, partial: new Map(), renamed: new Map() };
  for (const [no, names] of [...byNo].sort(([a], [b]) => a.localeCompare(b))) {
    const holders = Object.keys(names);
    if (holders.length < codes.length) {
      result.partial.set(no, holders);
    } else if (new Set(Object.values(names).map((name) => name.trim().toLowerCase())).size > 1) {
      result.renamed.set(no, names);
    } else {
      result.identical++;
    }
  }
  return result;
}
