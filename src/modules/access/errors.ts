/** The actor's Roles don't allow this action. */
export class AccessDeniedError extends Error {
  constructor(message = "Anda tidak memiliki akses untuk tindakan ini.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/** The request breaks a business rule; the message is safe to show to the user. */
export class AccessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessRuleError";
  }
}
