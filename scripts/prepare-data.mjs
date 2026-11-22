import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const database = process.env.DATABASE_URL || "file:./data/club.db";
if (!database.startsWith("file:"))
  throw new Error("DATABASE_URL yerel SQLite file: adresi olmalı.");
mkdirSync(dirname(resolve(database.slice(5))), {
  recursive: true,
  mode: 0o700,
});
mkdirSync(resolve(process.env.MEDIA_ROOT || "./data/media"), {
  recursive: true,
  mode: 0o700,
});

const db = new DatabaseSync(resolve(database.slice(5)));
db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
db.close();
