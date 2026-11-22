import sharp from "sharp";
import { resolve } from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

export const webpError = "Yalnızca .webp formatındaki görseller yüklenebilir.";
export const maxBytes = 12 * 1024 * 1024;
export const maxPixels = 25_000_000;
export const mediaRoot = () =>
  resolve(/*turbopackIgnore: true*/ process.env.MEDIA_ROOT || "./data/media");
export const validKey = /^[a-f0-9]{48}\.webp$/;
export function mediaPath(key: string, small = false) {
  if (!validKey.test(key)) throw new Error("Geçersiz medya anahtarı.");
  return resolve(mediaRoot(), small ? "small" : "original", key);
}
export async function normalizeWebp(file: File) {
  if (file.type !== "image/webp" || !/\.webp$/i.test(file.name))
    throw new Error(webpError);
  if (!file.size || file.size > maxBytes)
    throw new Error("Görsel en fazla 12 MB olabilir.");
  const input = Buffer.from(await file.arrayBuffer());
  if (
    input.length < 20 ||
    input.toString("ascii", 0, 4) !== "RIFF" ||
    input.toString("ascii", 8, 12) !== "WEBP" ||
    input.readUInt32LE(4) + 8 !== input.length
  )
    throw new Error(webpError);
  try {
    const image = sharp(input, {
      limitInputPixels: maxPixels,
      failOn: "warning",
    });
    const info = await image.metadata();
    if (
      info.format !== "webp" ||
      (info.pages ?? 1) > 1 ||
      !info.width ||
      !info.height ||
      info.width > 8000 ||
      info.height > 8000
    )
      throw new Error();
    const original = await image
      .clone()
      .webp({ quality: 89, alphaQuality: 100 })
      .toBuffer();
    const small =
      info.width > 840
        ? await image
            .clone()
            .resize({ width: 840, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer()
        : null;
    return { original, small, width: info.width, height: info.height };
  } catch {
    throw new Error(
      "WebP dosyası bozuk, animasyonlu veya piksel sınırını aşıyor.",
    );
  }
}
export async function persistWebp<T>(
  file: File,
  alt: string,
  credit: string,
  uploaderId: string,
  after?: (tx: Prisma.TransactionClient, mediaId: string) => Promise<T>,
) {
  const { original, small, width, height } = await normalizeWebp(file);
  const key = randomBytes(24).toString("hex") + ".webp";
  await Promise.all(
    ["original", "small"].map((folder) =>
      mkdir(resolve(mediaRoot(), folder), { recursive: true, mode: 0o700 }),
    ),
  );
  try {
    await writeFile(mediaPath(key), original, { flag: "wx", mode: 0o600 });
    if (small)
      await writeFile(mediaPath(key, true), small, { flag: "wx", mode: 0o600 });
    return await db.$transaction(async (tx) => {
      const asset = await tx.media.create({
        data: {
          key,
          bytes: original.length,
          width,
          height,
          alt,
          credit,
          uploaderId,
          small: Boolean(small),
          sha256: createHash("sha256").update(original).digest("hex"),
        },
      });
      await tx.audit.create({
        data: {
          actorId: uploaderId,
          module: "medya",
          action: "upload",
          recordId: asset.id,
        },
      });
      if (after) await after(tx, asset.id);
      return asset;
    });
  } catch (error) {
    await Promise.allSettled([
      unlink(mediaPath(key)),
      unlink(mediaPath(key, true)),
    ]);
    throw error;
  }
}
