"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { mutationActor } from "@/lib/auth";

const eligible =
  /^\/(haberler|duyurular|galeri|kurumsal|futbolcular|maclar)\/[a-z0-9-]{1,140}$/;
export async function editRedirect(_: string, form: FormData) {
  try {
    const mode = form.get("mode") === "delete" ? "delete" : "update";
    const user = await mutationActor("yonlendirmeler", mode);
    const from = String(form.get("from") || "");
    const to = String(form.get("to") || "");
    if (
      !eligible.test(from) ||
      (mode !== "delete" && (!eligible.test(to) || from === to))
    )
      return "Geçerli iki farklı içerik yolu girin.";
    await db.$transaction(async (tx) => {
      const existing = await tx.redirect.findUnique({
        where: { fromPath: from },
      });
      if (mode === "delete") {
        if (!existing) throw new Error("Yönlendirme bulunamadı.");
        await tx.redirect.delete({ where: { id: existing.id } });
      } else {
        if (existing?.recordId)
          throw new Error("Bu yol içerik sürümünün parçası.");
        if (
          await tx.redirect.findFirst({
            where: { OR: [{ fromPath: to }, { toPath: from }] },
          })
        )
          throw new Error("Yönlendirme zinciri oluşuyor.");
        await tx.redirect.upsert({
          where: { fromPath: from },
          create: { fromPath: from, toPath: to },
          update: { toPath: to },
        });
      }
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "yonlendirmeler",
          action: mode,
          recordId: existing?.id,
        },
      });
    });
    revalidatePath("/", "layout");
    return "Yönlendirme güncellendi.";
  } catch (e) {
    return e instanceof Error && !("code" in e)
      ? e.message
      : "Yönlendirme kaydedilemedi.";
  }
}
