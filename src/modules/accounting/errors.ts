/** The request breaks an accounting rule; the message is safe to show to the user. */
export class AccountingRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountingRuleError";
  }
}
