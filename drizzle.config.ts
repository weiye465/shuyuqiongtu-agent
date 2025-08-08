import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config; 