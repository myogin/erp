// Public interface of the access module. UI, API routes and future agent tools
// call these functions; they must not reach into the tables directly (ADR-0005).
export * from "./errors";
export * from "./roles";
export * from "./rules";
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
  listCompanies,
  listUserOptions,
  listUsers,
  recordTwoFactorEnabled,
  requiresTwoFactor,
  resetPassword,
  revokeRole,
  type Actor,
  type Company,
  type AuditLogQuery,
  type CompanyListQuery,
  type PageQuery,
  type UserListQuery,
} from "./service";
