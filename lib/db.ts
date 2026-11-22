import { resolve } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const input = process.env.DATABASE_URL || "file:./data/club.db";
if (!input.startsWith("file:"))
  throw new Error("Yerel SQLite dosyası gerekli.");
const globalDb = globalThis as typeof globalThis & { clubDb?: PrismaClient };
export const db =
  globalDb.clubDb ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: "file:" + resolve(input.slice(5)),
      timeout: 5000,
    }),
  });
globalDb.clubDb = db;
