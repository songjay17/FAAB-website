import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, which is what normally loads .env.local —
// pull DATABASE_URL from it here so CLI migrations just work.
if (!process.env.DATABASE_URL) {
  try {
    const match = readFileSync(".env.local", "utf-8").match(/^DATABASE_URL=(.+)$/m);
    if (match) process.env.DATABASE_URL = match[1].trim();
  } catch {
    // No .env.local — fall through; drizzle-kit will error on the missing url.
  }
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
