// Only for `npm run auth:generate`: the Better Auth CLI needs an exported `auth`.
import { betterAuth } from "better-auth";
import { createDb } from "@/db/client";
import { authOptions } from "@/lib/auth";

export const auth = betterAuth(authOptions(createDb("postgres://unused@localhost/unused").db));
