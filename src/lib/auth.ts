import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { getDb, type Db } from "@/db/client";
import * as schema from "@/db/schema";
import { MIN_PASSWORD_LENGTH } from "@/modules/access";

// Users are created only by an Owner or Admin (or the first-run setup), never by
// public sign-up; see the access module.
export function authOptions(db: Db) {
  return {
    appName: "ERP",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    },
    user: {
      additionalFields: {
        mustChangePassword: { type: "boolean", defaultValue: false, input: false },
      },
    },
    advanced: {
      // Easypanel's Traefik sets X-Real-Ip to the connecting client; prefer it over
      // X-Forwarded-For, whose leftmost entry the client can forge. Without a
      // resolvable IP, sign-in rate limiting falls back to one bucket for everyone.
      ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
    },
    plugins: [twoFactor({ issuer: "ERP" }), nextCookies()],
  } satisfies BetterAuthOptions;
}

function createAuth(db: Db) {
  return betterAuth(authOptions(db));
}

let shared: ReturnType<typeof createAuth> | undefined;

/** Created on first use so builds don't need a database. */
export function getAuth() {
  shared ??= createAuth(getDb());
  return shared;
}
