/** One Accurate database (one CV), reached with its own API Token. */
export type AccurateDatabase = {
  /** Our Company code, e.g. CVA; taken from the env variable name. */
  code: string;
  apiToken: string;
  signatureSecret: string;
};

const TOKEN_PREFIX = "ACCURATE_API_TOKEN_";

// An API Token is bound to one Accurate database, so each CV has its own:
// ACCURATE_API_TOKEN_<CODE>. The signature secret can be shared
// (ACCURATE_SIGNATURE_SECRET) or set per database (ACCURATE_SIGNATURE_SECRET_<CODE>).
export function readAccurateDatabases(env: Record<string, string | undefined>): AccurateDatabase[] {
  const databases: AccurateDatabase[] = [];
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith(TOKEN_PREFIX) || !value?.trim()) continue;
    const code = name.slice(TOKEN_PREFIX.length);
    if (!/^[A-Z0-9]{2,10}$/.test(code)) {
      throw new Error(`${name}: the suffix must be a Company code (2-10 uppercase letters or digits)`);
    }
    const signatureSecret = env[`ACCURATE_SIGNATURE_SECRET_${code}`]?.trim() || env.ACCURATE_SIGNATURE_SECRET?.trim();
    if (!signatureSecret) {
      throw new Error(`No signature secret for ${code}: set ACCURATE_SIGNATURE_SECRET or ACCURATE_SIGNATURE_SECRET_${code}`);
    }
    databases.push({ code, apiToken: value.trim(), signatureSecret });
  }
  return databases.sort((a, b) => a.code.localeCompare(b.code));
}
