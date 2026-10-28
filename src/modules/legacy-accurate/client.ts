import { createHmac } from "node:crypto";
import type { AccurateDatabase } from "./config";

const TOKEN_INFO_URL = "https://account.accurate.id/api/api-token.do";
const PAGE_SIZE = 100;

/** X-Api-Signature: base64 HMAC-SHA256 of the X-Api-Timestamp value. */
export function sign(timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(timestamp).digest("base64");
}

function authHeaders(database: AccurateDatabase): Record<string, string> {
  const timestamp = new Date().toISOString();
  return {
    Authorization: `Bearer ${database.apiToken}`,
    "X-Api-Timestamp": timestamp,
    "X-Api-Signature": sign(timestamp, database.signatureSecret),
  };
}

type Envelope<T> = { s: boolean; d: T; sp?: { page: number; pageCount: number; rowCount: number } };

async function readEnvelope<T>(response: Response, what: string): Promise<Envelope<T>> {
  const text = await response.text();
  let body: Envelope<T>;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${what}: HTTP ${response.status}, not JSON: ${text.slice(0, 300)}`);
  }
  if (!response.ok || !body.s) {
    throw new Error(`${what}: HTTP ${response.status}: ${JSON.stringify(body.d ?? body).slice(0, 300)}`);
  }
  return body;
}

export type DatabaseInfo = { id: number; alias: string; host: string };

/**
 * Read-only access to one Accurate database. Only list/detail endpoints are
 * called; this module must never write to the Legacy System.
 */
export class AccurateClient {
  private host: string | null = null;

  constructor(private readonly database: AccurateDatabase) {}

  /** Which Accurate database the token opens, and the host that serves it. */
  async databaseInfo(): Promise<DatabaseInfo> {
    const response = await fetch(TOKEN_INFO_URL, { method: "POST", headers: authHeaders(this.database) });
    const body = await readEnvelope<{ database: DatabaseInfo }>(response, `${this.database.code} api-token.do`);
    this.host = body.d.database.host;
    return body.d.database;
  }

  /** Every row of a list endpoint, following Accurate's sp.page paging. */
  async listAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const rows: T[] = [];
    for (let page = 1; ; page++) {
      const body = await this.get<T[]>(path, { ...params, "sp.page": String(page), "sp.pageSize": String(PAGE_SIZE) });
      rows.push(...body.d);
      if (!body.sp || page >= body.sp.pageCount) return rows;
    }
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<Envelope<T>> {
    if (!this.host) await this.databaseInfo();
    const url = new URL(path, this.host!);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    // Accurate moves databases between hosts and answers with a redirect. fetch
    // drops Authorization on a cross-origin redirect, so follow it ourselves.
    const response = await fetch(url, { headers: authHeaders(this.database), redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      await this.databaseInfo();
      return this.get(path, params);
    }
    return readEnvelope<T>(response, `${this.database.code} ${path}`);
  }
}
