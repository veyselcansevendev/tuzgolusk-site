import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import sharp from "sharp";

test("SQLite ve WebP birlikte yedeklenip yeni dizine geri yüklenir", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("E-posta").fill("admin@example.test");
  await page.getByLabel("Parola").fill("Yalnızca-Yerel-Test-2026!");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(
    page.getByRole("heading", { name: "Yönetim paneli" }),
  ).toBeVisible();
  const buffer = await sharp({
    create: { width: 900, height: 450, channels: 3, background: "#193238" },
  })
    .webp()
    .toBuffer();
  const upload = await page.request.post("/api/medya", {
    headers: { origin: "http://127.0.0.1:3417" },
    multipart: {
      alt: "Yedek WebP",
      file: { name: "yedek.webp", mimeType: "image/webp", buffer },
    },
  });
  expect(upload.status()).toBe(201);
  const item = await upload.json();
  const dir = process.env.ESKIL_E2E_DIR!;
  const root = mkdtempSync(join(tmpdir(), "eskil-roundtrip-"));
  const backups = join(root, "backups");
  const target = join(root, "restore");
  const env = {
    ...process.env,
    DATABASE_URL: "file:" + join(dir, "club.db"),
    MEDIA_ROOT: join(dir, "media"),
    BACKUP_ROOT: backups,
  };
  function run(script: string, args: string[] = []) {
    const output = spawnSync(process.execPath, [script, ...args], {
      env,
      encoding: "utf8",
    });
    expect(output.status, output.stderr).toBe(0);
  }
  run("scripts/backup.mjs");
  const backup = join(backups, readdirSync(backups)[0]);
  run("scripts/restore.mjs", [backup, target]);
  const db = new DatabaseSync(join(target, "club.db"), { readOnly: true });
  try {
    expect(db.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe(
      "ok",
    );
    expect(db.prepare("PRAGMA foreign_key_check").all()).toHaveLength(0);
    expect(
      db.prepare('SELECT "key" FROM "Media" WHERE id=?').get(item.id)?.key,
    ).toBe(item.key);
    expect(
      db.prepare('SELECT count(*) AS count FROM "Session"').get()?.count,
    ).toBe(0);
  } finally {
    db.close();
  }
  for (const folder of ["original", "small"]) {
    const file = readFileSync(join(target, "media", folder, item.key));
    expect((await sharp(file).metadata()).format).toBe("webp");
  }
});
