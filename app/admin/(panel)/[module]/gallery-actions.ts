"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { can, mutationActor } from "@/lib/auth";
import { idSchema } from "@/lib/cms";

export async function addAlbumPhotos(id: string, ids: string[]) {
  try {
    const user = await mutationActor("album-fotograflari", "create");
    idSchema.parse(id);
    const assets = [...new Set(z.array(idSchema).min(1).max(20).parse(ids))];
    const count = await db.$transaction(async (tx) => {
      const album = await tx.album.findFirst({
        where: { id, deletedAt: null },
      });
      if (!album) throw new Error("Albüm bulunamadı.");
      if (
        ["PUBLISHED", "SCHEDULED"].includes(album.status) &&
        !can(user, "albumler", "publish")
      )
        throw new Error("Bu albüm için yayın yetkisi gerekli.");
      const images = await tx.media.findMany({ where: { id: { in: assets } } });
      if (
        images.length !== assets.length ||
        images.some(
          (i) =>
            !i.isPublic &&
            i.uploaderId !== user.id &&
            !can(user, "medya", "view"),
        )
      )
        throw new Error("Görsel seçimi geçersiz.");
      const existing = await tx.albumImage.findMany({
        where: { albumId: id },
        select: { mediaId: true, position: true },
        orderBy: { position: "desc" },
      });
      const known = new Set(existing.map((item) => item.mediaId));
      const initial = (existing[0]?.position ?? -1) + 1;
      const data = assets
        .filter((mediaId) => !known.has(mediaId))
        .map((mediaId, i) => ({ albumId: id, mediaId, position: initial + i }));
      if (data.length) {
        await tx.albumImage.createMany({ data });
        if (
          album.status === "PUBLISHED" &&
          (!album.publishAt || album.publishAt <= new Date())
        )
          await tx.media.updateMany({
            where: { id: { in: data.map((row) => row.mediaId) } },
            data: { isPublic: true },
          });
        await tx.audit.create({
          data: {
            actorId: user.id,
            module: "albumler",
            action: "add-photos",
            recordId: id,
          },
        });
      }
      return data.length;
    });
    revalidatePath("/", "layout");
    return { ok: true, message: count + " fotoğraf albüme eklendi." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error &&
        !("code" in error) &&
        !error.message.startsWith("[")
          ? error.message
          : "Fotoğraflar bağlanamadı.",
    };
  }
}
