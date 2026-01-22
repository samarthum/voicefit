import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";

// Load .env files from web app for local development
config({ path: "apps/web/.env.local" });
config({ path: "apps/web/.env" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
