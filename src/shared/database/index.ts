import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../db/schema.ts";
import logger from "../infrastructure/logger.ts";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3, // Prevent EMAXCONNSESSION errors in high concurrency or session-mode pooling environments
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle client");
  process.exit(-1);
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
