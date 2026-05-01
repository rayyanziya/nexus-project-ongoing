import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const DEFAULT_URL = "postgres://nexus:dev@localhost:5433/nexus_dev";
const url = process.env.DATABASE_URL ?? DEFAULT_URL;

const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./db/migrations" });
await sql.end();

console.log("migrations applied");
