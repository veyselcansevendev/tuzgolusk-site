import { DatabaseSync, backup } from "node:sqlite";
import { cp, mkdir, rename, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

if (process.argv.length !== 4)
  throw new Error("Kullanım: npm run restore -- YEDEK_DIZINI YENI_VERI_DIZINI");
const source = resolve(process.argv[2]),
  target = resolve(process.argv[3]);
const stage = join(
  dirname(target),
  ".restore-" + randomBytes(10).toString("hex"),
);
const db = new DatabaseSync(join(source, "club.db"), { readOnly: true });
let reserved = false;
try {
  const integrity = db.prepare("PRAGMA integrity_check").get().integrity_check;
  if (integrity !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length)
    throw new Error("Yedeğin SQLite bütünlüğü hatalı.");
  const assets = db.prepare('SELECT "key","small" FROM "Media"').all();
  await mkdir(target, { mode: 0o700 });
  reserved = true; // Existing targets are never overwritten.
  await mkdir(stage, { mode: 0o700 });
  await backup(db, join(stage, "club.db"));
  await mkdir(join(stage, "media"), { mode: 0o700 });
  for (const asset of assets) {
    if (!/^[a-f0-9]{48}\.webp$/.test(asset.key))
      throw new Error("Geçersiz medya anahtarı.");
    for (const folder of asset.small ? ["original", "small"] : ["original"]) {
      await mkdir(join(stage, "media", folder), {
        mode: 0o700,
        recursive: true,
      });
      await cp(
        join(source, "media", folder, asset.key),
        join(stage, "media", folder, asset.key),
        { force: false, errorOnExist: true },
      );
    }
  }
  await rename(join(stage, "club.db"), join(target, "club.db"));
  await rename(join(stage, "media"), join(target, "media"));
  const restored = new DatabaseSync(join(target, "club.db"));
  try {
    restored.exec(
      'DELETE FROM "Session"; DELETE FROM "Invite"; DELETE FROM "Throttle"; PRAGMA journal_mode=WAL;',
    );
  } finally {
    restored.close();
  }
  console.log("Yeni veri dizinine geri yüklendi:", target);
} catch (error) {
  if (reserved) await rm(target, { recursive: true, force: true });
  throw error;
} finally {
  db.close();
  await rm(stage, { recursive: true, force: true });
}
