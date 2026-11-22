"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { mutationActor } from "@/lib/auth";
import { defaultLayout, layoutSchema } from "@/lib/site-settings";

export async function saveHome(_: string, form: FormData) {
  const mode = String(form.get("mode"));
  try {
    const user = await mutationActor(
      "ana-sayfa",
      mode === "draft" ? "update" : "publish",
    );
    const version = Number(form.get("version"));
    await db.$transaction(async (tx) => {
      const current = await tx.homeLayout.findUnique({
        where: { key: "home" },
      });
      if ((current?.version || 0) !== version)
        throw new Error("Düzen değişti. Sayfayı yenileyin.");
      const revisionId = String(form.get("revision") || "");
      const revision =
        mode === "restore" && current
          ? await tx.revision.findFirst({
              where: {
                id: revisionId,
                module: "ana-sayfa",
                recordId: current.id,
              },
            })
          : null;
      if (mode === "restore" && !revision) throw new Error("Sürüm bulunamadı.");
      const data = layoutSchema.parse(
        revision ? revision.snapshot : JSON.parse(String(form.get("layout"))),
      );
      const published =
        mode === "draft" ? current?.published || defaultLayout : data;
      const saved = await tx.homeLayout.upsert({
        where: { key: "home" },
        create: { key: "home", draft: data, published },
        update: { draft: data, published, version: { increment: 1 } },
      });
      await tx.revision.create({
        data: {
          module: "ana-sayfa",
          recordId: saved.id,
          number: saved.version,
          snapshot: data,
          actorId: user.id,
        },
      });
      await tx.audit.create({
        data: {
          module: "ana-sayfa",
          action: mode,
          recordId: saved.id,
          actorId: user.id,
        },
      });
    });
  } catch (error) {
    return error instanceof Error &&
      !("code" in error) &&
      !error.message.startsWith("[")
      ? error.message
      : "Düzen kaydedilemedi.";
  }
  revalidatePath("/", "layout");
  redirect(
    "/admin/ana-sayfa?saved=" + (mode === "draft" ? "draft" : "published"),
  );
}
