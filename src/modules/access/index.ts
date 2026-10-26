// Public interface of the access module. UI, API routes and future agent tools
// call these functions; they must not reach into the tables directly (ADR-0005).
export * from "./errors";
export * from "./roles";
export {
  assertCompanyAccess,
  bootstrapOwner,
  canAccessCompany,
  completePasswordChange,
  createCompany,
  createUser,
  findAccessibleCompany,
  getGrants,
  grantRole,
  isAdministrator,
  isSetupComplete,
  listAccessibleCompanies,
  listAuditLog,
  listUserOptions,
  listUsers,
  MIN_PASSWORD_LENGTH,
  recordTwoFactorEnabled,
  requiresTwoFactor,
  resetPassword,
  RESERVED_COMPANY_CODES,
  revokeRole,
  type Actor,
  type Company,
  type UserListQuery,
} from "./service";
