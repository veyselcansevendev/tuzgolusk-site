import "dotenv/config";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

const database = process.env.DATABASE_URL || "file:./data/club.db";
if (!database.startsWith("file:"))
  throw new Error("Yerel SQLite dosyası gerekli.");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx prisma/seed.ts",
  },
  datasource: { url: "file:" + resolve(database.slice(5)) },
});
