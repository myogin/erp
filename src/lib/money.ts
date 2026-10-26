import Decimal from "decimal.js";

// All money is handled as Money, never as JS numbers (ADR-0007).
// Rounding to 2 places is an explicit domain decision, so storing a value
// with more than 2 decimal places is an error rather than a silent round.
export const Money = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});
export type Money = InstanceType<typeof Money>;

export const MONEY_SCALE = 2;

export function money(value: Decimal.Value): Money {
  return new Money(value);
}

export function toMoneyString(value: Money): string {
  if (value.decimalPlaces() > MONEY_SCALE) {
    throw new Error(
      `Money ${value.toString()} has more than ${MONEY_SCALE} decimal places; round it explicitly first`,
    );
  }
  return value.toFixed(MONEY_SCALE);
}

const rupiahWhole = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const rupiahCents = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: MONEY_SCALE,
  maximumFractionDigits: MONEY_SCALE,
});

/**
 * `Rp 1.500.000`, or `Rp 1.500.000,50` when there are cents: the screen must
 * never silently round an amount (docs/ui.md).
 */
export function formatRupiah(value: Money): string {
  const formatter = value.isInteger() ? rupiahWhole : rupiahCents;
  // Intl formats decimal strings exactly; Number() would lose precision on large amounts.
  return formatter.format(toMoneyString(value) as `${number}`);
}
