"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { mutationActor, rate, siteUrl } from "@/lib/auth";
import { digest, token } from "@/lib/credentials";

export async function createInvite(_: string, form: FormData) {
  try {
    const user = await mutationActor("kullanicilar", "manage_users");
    if (
      user.role.key !== "super" ||
      !(await rate("invite:" + user.id, 10, 3600000))
    )
      return "Davet oluşturma sınırı veya yetkisi aşıldı.";
    const email = z
      .email()
      .max(254)
      .parse(String(form.get("email")).trim().toLowerCase());
    const roleId = z.string().min(20).max(40).parse(form.get("role"));
    const clear = token();
    await db.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email } }))
        throw new Error("Bu adres için zaten bir hesap var.");
      await tx.invite.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      });
      const invite = await tx.invite.create({
        data: {
          email,
          roleId,
          tokenHash: digest(clear),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "kullanicilar",
          action: "invite",
          recordId: invite.id,
        },
      });
    });
    revalidatePath("/admin/kullanicilar");
    return (
      "Davet bağlantısı (24 saat) " +
      new URL(
        "/davet#" + clear,
        process.env.NODE_ENV === "production"
          ? siteUrl()
          : process.env.SITE_URL || "http://localhost:3000",
      ).href
    );
  } catch (error) {
    return safe(error);
  }
}
export async function changeUser(id: string, _: string, form: FormData) {
  try {
    const user = await mutationActor("kullanicilar", "manage_users");
    if (user.role.key !== "super" || user.id === id)
      return "Kendi rolünüzü veya etkinliğinizi buradan değiştiremezsiniz.";
    const roleId = z.string().min(20).max(40).parse(form.get("role"));
    const active = form.get("active") === "on";
    await db.$transaction(async (tx) => {
      const target = await tx.user.findUniqueOrThrow({
        where: { id },
        include: { role: true },
      });
      const role = await tx.role.findUniqueOrThrow({ where: { id: roleId } });
      if (
        target.active &&
        target.role.key === "super" &&
        (!active || role.key !== "super") &&
        (await tx.user.count({
          where: { active: true, role: { key: "super" } },
        })) === 1
      )
        throw new Error("Son etkin Super Admin korunur.");
      await tx.user.update({ where: { id }, data: { active, roleId } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "kullanicilar",
          action: "update",
          recordId: id,
        },
      });
    });
    revalidatePath("/admin/kullanicilar");
    return "Kullanıcı güncellendi.";
  } catch (error) {
    return safe(error);
  }
}
function safe(e: unknown) {
  return e instanceof Error && !("code" in e) && !e.message.startsWith("[")
    ? e.message
    : "İşlem tamamlanamadı.";
}
