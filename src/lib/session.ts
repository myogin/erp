import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import { getAuth } from "@/lib/auth";
import { getGrants, isAdministrator, requiresTwoFactor, type Actor, type Grant } from "@/modules/access";

export type CurrentUser = Actor & {
  name: string;
  email: string;
  grants: Grant[];
  isAdministrator: boolean;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
};

// Data access layer: every page and Server Action resolves the actor through
// these functions, never by reading the session itself.

/**
 * Request headers with Cookie rebuilt from cookies(). When a Server Action
 * replaces the session cookie (a password change revokes the old session), Next
 * re-renders the page inside the same response: headers() still carries the
 * revoked cookie, but cookies() already reflects the new one.
 */
async function sessionHeaders(): Promise<Headers> {
  const result = new Headers(await headers());
  result.set("cookie", (await cookies()).toString());
  return result;
}

const loadCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Read the request first: during `next build` that's where prerendering stops,
  // before anything touches the database (which isn't configured at build time).
  const requestHeaders = await sessionHeaders();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const grants = await getGrants(getDb(), session.user.id);
  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    grants,
    isAdministrator: isAdministrator(grants),
    twoFactorEnabled: session.user.twoFactorEnabled ?? false,
    mustChangePassword: session.user.mustChangePassword,
  };
});

/** Signed in, but first-login steps (new password, 2FA) may still be pending. */
export async function requireSignedIn(): Promise<CurrentUser> {
  const user = await loadCurrentUser();
  if (!user) redirect("/masuk");
  return user;
}

/** Signed in with first-login steps done. Use this for everything except those steps. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await requireSignedIn();
  if (user.mustChangePassword) redirect("/ganti-password");
  if (requiresTwoFactor(user.grants) && !user.twoFactorEnabled) redirect("/keamanan/2fa");
  return user;
}

/** An Owner or Admin; anyone else is sent home. */
export async function requireAdministrator(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdministrator) redirect("/");
  return user;
}
