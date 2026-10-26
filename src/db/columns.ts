import { customType } from "drizzle-orm/pg-core";
import { money, toMoneyString, type Money } from "@/lib/money";

/** A `numeric(18,2)` column read and written as Money. */
export const moneyColumn = customType<{ data: Money; driverData: string }>({
  dataType: () => "numeric(18, 2)",
  fromDriver: (value) => money(value),
  toDriver: (value) => toMoneyString(value),
});
