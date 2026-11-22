"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { can, mutationActor } from "@/lib/auth";
import { canvasSchema, designTypes } from "@/lib/design-model";
import { matchVisible } from "@/lib/football";

export async function saveDesign(id: string | null, _: string, form: FormData) {
  let savedId: string;
  try {
    const mode = String(form.get("mode") || "save");
    const copy = mode === "copy" || mode === "template";
    const user = await mutationActor(
      "tasarim-studyosu",
      !id || copy ? "create" : "update",
    );
    const title = z.string().trim().min(2).max(150).parse(form.get("title"));
    const category = z.enum(designTypes).parse(form.get("category"));
    const canvas = canvasSchema.parse(JSON.parse(String(form.get("canvas"))));
    const state = z
      .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
      .parse(form.get("state"));
    if (state === "PUBLISHED" && !can(user, "tasarim-studyosu", "publish"))
      return "Yayımlama yetkiniz yok.";
    const matchId = String(form.get("matchId") || "") || null;
    const version = Number(form.get("version"));
    const mediaIds = [
      ...new Set(
        canvas.layers.filter((l) => l.kind === "image").map((l) => l.mediaId),
      ),
    ];
    savedId = await db.$transaction(async (tx) => {
      const existing = id
        ? await tx.design.findUnique({ where: { id } })
        : null;
      if (id && !existing) throw new Error("Tasarım bulunamadı.");
      if (
        existing &&
        existing.ownerId !== user.id &&
        !can(user, "tasarim-studyosu", "publish")
      )
        throw new Error("Bu tasarım için değişiklik yetkiniz yok.");
      if (
        existing?.state === "PUBLISHED" &&
        !can(user, "tasarim-studyosu", "publish")
      )
        throw new Error("Yayındaki tasarımı düzenleme yetkiniz yok.");
      const images = await tx.media.findMany({
        where: { id: { in: mediaIds }, mimeType: "image/webp" },
      });
      if (
        images.length !== mediaIds.length ||
        images.some(
          (i) =>
            !i.isPublic &&
            i.uploaderId !== user.id &&
            !can(user, "medya", "view"),
        )
      )
        throw new Error("Görsel referanslarını kontrol edin.");
      if (
        matchId &&
        !(await tx.match.findFirst({
          where: {
            id: matchId,
            ...(can(user, "maclar", "view")
              ? { deletedAt: null }
              : matchVisible()),
          },
        }))
      )
        throw new Error("Maç bulunamadı.");
      let recordId: string;
      if (existing && !copy) {
        if (
          !(
            await tx.design.updateMany({
              where: { id: existing.id, version },
              data: {
                title,
                category,
                canvas,
                state,
                editorId: user.id,
                matchId,
                version: { increment: 1 },
              },
            })
          ).count
        )
          throw new Error("Tasarım değişti. Sayfayı yenileyin.");
        recordId = existing.id;
        await tx.designMedia.deleteMany({ where: { designId: recordId } });
      } else {
        const item = await tx.design.create({
          data: {
            title,
            category,
            canvas,
            state,
            matchId,
            template: mode === "template",
            ownerId: user.id,
            editorId: user.id,
          },
        });
        recordId = item.id;
      }
      if (mediaIds.length)
        await tx.designMedia.createMany({
          data: mediaIds.map((mediaId) => ({ designId: recordId, mediaId })),
        });
      await tx.audit.create({
        data: {
          module: "tasarim-studyosu",
          action: mode,
          recordId,
          actorId: user.id,
        },
      });
      return recordId;
    });
  } catch (error) {
    return error instanceof Error &&
      !("code" in error) &&
      !error.message.startsWith("[")
      ? error.message
      : "Tasarım alanlarını kontrol edin.";
  }
  revalidatePath("/admin/tasarim-studyosu");
  redirect("/admin/tasarim-studyosu?id=" + savedId + "&saved=1");
}
