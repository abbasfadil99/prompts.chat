import { defineConfig } from "prisma/config";

// Database URL is read from the schema.prisma datasource block at runtime.
// Do NOT reference env() here — it causes postinstall to fail on Vercel
// when DATABASE_URL is not yet injected during the npm install phase.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
});
