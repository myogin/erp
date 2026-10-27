// Plain constants, safe to import from client components.

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Company codes become the first URL segment (`/cva/...`, ADR-0008), so they
 * must not shadow a top-level route. Keep in sync with the folders in src/app.
 */
export const RESERVED_COMPANY_CODES = ["API", "MASUK", "SETUP", "PENGATURAN", "KEAMANAN", "PORTAL", "LAPORAN"];
