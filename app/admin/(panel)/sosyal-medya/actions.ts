"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { can, mutationActor } from "@/lib/auth";
import { platforms, socialStates } from "@/lib/social";
import { visible } from "@/lib/content";
import { matchVisible } from "@/lib/football";

export async function savePost(id: string | null, _: string, form: FormData) {
  let result: string;
  try {
    const user = await mutationActor("sosyal-medya", id ? "update" : "create");
    const title = z.string().trim().min(2).max(150).parse(form.get("title"));
    const caption = z.string().trim().max(65000).parse(form.get("caption"));
    const hashtags = z.string().trim().max(5000).parse(form.get("hashtags"));
    const platform = z
      .enum(
        Object.keys(platforms) as [
          keyof typeof platforms,
          ...(keyof typeof platforms)[],
        ],
      )
      .parse(form.get("platform"));
    const state = z
      .enum(
        Object.keys(socialStates) as [
          keyof typeof socialStates,
          ...(keyof typeof socialStates)[],
        ],
      )
      .parse(form.get("state"));
    const scheduled = String(form.get("scheduledAt") || "");
    const scheduledAt = scheduled
      ? new Date(
          z
            .string()
            .regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/)
            .parse(scheduled) + "+03:00",
        )
      : null;
    if (scheduledAt && !Number.isFinite(scheduledAt.getTime()))
      return "Geçerli plan tarihi girin.";
    const matchId = String(form.get("matchId") || "") || null;
    const newsId = String(form.get("newsId") || "") || null;
    const assetIds = [
      ...new Set(form.getAll("assets").map(String).filter(Boolean)),
    ];
    if (assetIds.length > 12) return "En fazla 12 görsel seçin.";
    const version = Number(form.get("version"));
    result = await db.$transaction(async (tx) => {
      const old = id ? await tx.socialPost.findUnique({ where: { id } }) : null;
      if (id && !old) throw new Error("Taslak bulunamadı.");
      if (
        old &&
        old.ownerId !== user.id &&
        !can(user, "sosyal-medya", "approve")
      )
        throw new Error("Bu taslağı düzenleme yetkiniz yok.");
      if (
        (state === "APPROVED" || old?.state === "APPROVED") &&
        !can(user, "sosyal-medya", "approve")
      )
        throw new Error("Onay yetkisi gerekli.");
      if (
        (state === "POSTED" || old?.state === "POSTED") &&
        !can(user, "sosyal-medya", "publish")
      )
        throw new Error("Yayın yetkisi gerekli.");
      if (
        state === "POSTED" &&
        old?.state !== "POSTED" &&
        form.get("confirm") !== "on"
      )
        throw new Error("Gerçek paylaşımı manuel olarak doğrulayın.");
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
      if (
        newsId &&
        !(await tx.news.findFirst({
          where: {
            id: newsId,
            ...(can(user, "haberler", "view")
              ? { deletedAt: null }
              : visible()),
          },
        }))
      )
        throw new Error("Haber bulunamadı.");
      const assets = await tx.media.findMany({
        where: { id: { in: assetIds }, mimeType: "image/webp" },
      });
      if (
        assets.length !== assetIds.length ||
        assets.some(
          (a) =>
            !a.isPublic &&
            a.uploaderId !== user.id &&
            !can(user, "medya", "view"),
        )
      )
        throw new Error("Görsel seçimi geçersiz.");
      const isTemplate = form.get("template") === "on";
      const data = {
        title,
        caption,
        hashtags,
        platform,
        state,
        scheduledAt,
        matchId,
        newsId,
        isTemplate,
        publishedAt: state === "POSTED" ? old?.publishedAt || new Date() : null,
      };
      if (isTemplate && state === "POSTED")
        throw new Error("Şablon paylaşıldı olarak işaretlenemez.");
      let recordId: string;
      if (old) {
        if (
          !(
            await tx.socialPost.updateMany({
              where: { id: old.id, version },
              data: { ...data, version: { increment: 1 } },
            })
          ).count
        )
          throw new Error("Taslak değişti. Sayfayı yenileyin.");
        recordId = old.id;
        await tx.socialAsset.deleteMany({ where: { postId: recordId } });
      } else {
        const post = await tx.socialPost.create({
          data: { ...data, ownerId: user.id },
        });
        recordId = post.id;
      }
      if (assetIds.length)
        await tx.socialAsset.createMany({
          data: assetIds.map((mediaId) => ({ postId: recordId, mediaId })),
        });
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "sosyal-medya",
          action: old && old.state === state ? "update" : state,
          recordId,
        },
      });
      return recordId;
    });
  } catch (e) {
    return e instanceof Error && !("code" in e) && !e.message.startsWith("[")
      ? e.message
      : "Paylaşım alanlarını kontrol edin.";
  }
  revalidatePath("/admin/sosyal-medya");
  redirect("/admin/sosyal-medya?id=" + result + "&saved=1");
}
