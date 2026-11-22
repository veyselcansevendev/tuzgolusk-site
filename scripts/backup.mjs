import "dotenv/config";
import { DatabaseSync, backup } from "node:sqlite";
import {
  cp,
  mkdir,
  rename,
  rm,
  stat,
  writeFile,
  readdir,
} from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

const dbUrl = process.env.DATABASE_URL || "file:./data/club.db";
if (!dbUrl.startsWith("file:"))
  throw new Error("Yerel SQLite dosyası gerekli.");
const dbPath = resolve(dbUrl.slice(5));
const media = resolve(process.env.MEDIA_ROOT || "./data/media");
const root = resolve(process.env.BACKUP_ROOT || "./backups");
const stamp = new Date().toISOString().replaceAll(":", "-");
const name = stamp + "-" + randomBytes(3).toString("hex");
const temp = join(root, "." + name),
  target = join(root, name);
const retention = Number(process.env.BACKUP_RETENTION_DAYS || 30);
if (!Number.isInteger(retention) || retention < 1 || retention > 365)
  throw new Error("Yedek saklama süresi 1–365 gün olmalı.");
if (
  root === media ||
  root.startsWith(media + "/") ||
  media.startsWith(root + "/") ||
  root === dirname(dbPath)
)
  throw new Error("Yedek kökünü veri ve medya dizininden ayrı seçin.");
await mkdir(temp, { recursive: true, mode: 0o700 });
const source = new DatabaseSync(dbPath, { readOnly: true });
try {
  await backup(source, join(temp, "club.db"));
  const snapshot = new DatabaseSync(join(temp, "club.db"), { readOnly: true });
  let assets, integrity;
  try {
    integrity = snapshot
      .prepare("PRAGMA integrity_check")
      .get().integrity_check;
    assets = snapshot.prepare('SELECT "key","small" FROM "Media"').all();
  } finally {
    snapshot.close();
  }
  if (integrity !== "ok")
    throw new Error("SQLite bütünlük kontrolü başarısız.");
  let bytes = (await stat(join(temp, "club.db"))).size;
  for (const asset of assets) {
    if (!/^[a-f0-9]{48}\.webp$/.test(asset.key))
      throw new Error("Geçersiz medya anahtarı.");
    for (const folder of asset.small ? ["original", "small"] : ["original"]) {
      const relative = join(folder, asset.key);
      const destination = join(temp, "media", relative);
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      await cp(join(media, relative), destination, {
        force: false,
        errorOnExist: true,
      });
      bytes += (await stat(destination)).size;
    }
  }
  await mkdir(join(temp, "media"), { recursive: true, mode: 0o700 });
  await writeFile(
    join(temp, "manifest.json"),
    JSON.stringify({
      name,
      bytes,
      assets: assets.length,
      createdAt: new Date().toISOString(),
    }),
    { mode: 0o600 },
  );
  await rename(temp, target);
  const writer = new DatabaseSync(dbPath);
  try {
    writer.exec("PRAGMA busy_timeout=5000");
    writer
      .prepare(
        'INSERT INTO "BackupRecord" ("id","name","bytes") VALUES (?,?,?)',
      )
      .run(randomBytes(16).toString("hex"), name, bytes);
  } finally {
    writer.close();
  }
  const cutoff = Date.now() - retention * 86400000;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z-[a-f0-9]{6}$/.test(
        entry.name,
      )
    )
      continue;
    if ((await stat(join(root, entry.name))).mtimeMs < cutoff)
      await rm(join(root, entry.name), { recursive: true });
  }
  console.log("Yedek doğrulandı ve kaydedildi:", target);
} catch (error) {
  await rm(temp, { recursive: true, force: true });
  throw error;
} finally {
  source.close();
}
