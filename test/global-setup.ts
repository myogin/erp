import "dotenv/config";
import { Client } from "pg";
import { createDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";

// Domain modules are tested against real PostgreSQL, never mocks (spec #1).
// Each run recreates the test database from migrations.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set; see .env.example");

  const target = new URL(url);
  const name = target.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`drop database if exists "${name}" with (force)`);
  await client.query(`create database "${name}"`);
  await client.end();

  const { db, pool } = createDb(url);
  await runMigrations(db);
  await pool.end();
}
