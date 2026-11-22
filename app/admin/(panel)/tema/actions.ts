"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { can, mutationActor } from "@/lib/auth";
import { contrast, themeSchema } from "@/lib/site-settings";

export async function saveTheme(_: string, form: FormData) {
  try {
    const user = await mutationActor("tema", "update");
    const data = themeSchema.parse({
      ...Object.fromEntries(form),
      maintenance: form.get("maintenance") === "on",
    });
    if (
      contrast(data.primary, data.primaryText) < 4.5 ||
      contrast(data.surface, data.text) < 4.5 ||
      contrast(data.accent, "#102126") < 4.5
    )
      return "Renk çiftleri en az 4,5:1 kontrast sağlamalı.";
    const version = Number(form.get("version"));
    await db.$transaction(async (tx) => {
      const current = await tx.siteSetting.findUnique({
        where: { key: "theme" },
      });
      if ((current?.version || 0) !== version)
        throw new Error("Ayarlar değişti. Sayfayı yenileyin.");
      if (
        user.role.key !== "super" &&
        data.maintenance !==
          Boolean(
            (current?.data as { maintenance?: boolean } | null)?.maintenance,
          )
      )
        throw new Error("Bakım modu için Super Admin yetkisi gerekli.");
      const ids = [
        ...new Set(
          [
            data.logoId,
            data.alternateId,
            data.ogId,
            data.heroId,
            data.faviconId,
          ].filter(Boolean),
        ),
      ];
      const assets = await tx.media.findMany({ where: { id: { in: ids } } });
      if (
        assets.length !== ids.length ||
        assets.some(
          (a) =>
            !a.isPublic &&
            a.uploaderId !== user.id &&
            !can(user, "medya", "view"),
        )
      )
        throw new Error("Görsel seçimi geçersiz.");
      const saved = await tx.siteSetting.upsert({
        where: { key: "theme" },
        create: { key: "theme", data },
        update: { data, version: { increment: 1 } },
      });
      await tx.media.updateMany({
        where: { id: { in: ids } },
        data: { isPublic: true },
      });
      await tx.revision.create({
        data: {
          module: "tema",
          recordId: saved.id,
          number: saved.version,
          snapshot: data,
          actorId: user.id,
        },
      });
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "tema",
          action: "update",
          recordId: saved.id,
        },
      });
    });
  } catch (error) {
    return error instanceof Error &&
      !("code" in error) &&
      !error.message.startsWith("[")
      ? error.message
      : "Alanları kontrol edin ve yeniden deneyin.";
  }
  revalidatePath("/", "layout");
  redirect("/admin/tema?saved=1");
}
