import { sql } from "drizzle-orm";
import { pgTable, serial } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { useTestDb } from "../../test/db";
import { money } from "@/lib/money";
import { moneyColumn } from "./columns";

const amounts = pgTable("money_column_test", {
  id: serial("id").primaryKey(),
  amount: moneyColumn("amount").notNull(),
});

describe("moneyColumn", () => {
  const db = useTestDb();

  it("stores and reads amounts exactly as numeric(18,2)", async () => {
    await db.execute(sql`create temp table money_column_test (id serial primary key, amount numeric(18, 2) not null)`);
    await db.insert(amounts).values([{ amount: money("0.1").plus("0.2") }, { amount: money("9999999999999999.99") }]);

    const rows = await db.select().from(amounts).orderBy(amounts.id);

    expect(rows.map((r) => r.amount.toFixed(2))).toEqual(["0.30", "9999999999999999.99"]);
  });

  it("refuses to store an amount with more than 2 decimal places", async () => {
    await expect(db.insert(amounts).values({ amount: money("1.005") })).rejects.toThrow(/round it explicitly/);
  });
});

describe("database session", () => {
  const db = useTestDb();

  it("uses the business time zone", async () => {
    const { rows } = await db.execute<{ TimeZone: string }>(sql`show timezone`);
    expect(rows[0].TimeZone).toBe("Asia/Makassar");
  });
});
