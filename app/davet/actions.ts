"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clientKey, openSession, rate, sameOrigin } from "@/lib/auth";
import { digest, hashPassword } from "@/lib/credentials";

export async function acceptInvite(_: string, form: FormData) {
  if (
    !(await sameOrigin()) ||
    !(await rate("invite-accept:" + (await clientKey()), 15, 900000))
  )
    return "Davet doğrulanamadı.";
  const data = z
    .object({
      key: z.string().regex(/^[a-zA-Z0-9_-]{43}$/),
      name: z.string().trim().min(2).max(100),
      password: z.string().min(14).max(256),
    })
    .safeParse(Object.fromEntries(form));
  if (!data.success) return "Adınızı ve en az 14 karakterli parolayı girin.";
  let userId: string;
  try {
    const key = digest(data.data.key);
    const now = new Date();
    const invite = await db.invite.findUnique({ where: { tokenHash: key } });
    if (!invite || invite.usedAt || invite.expiresAt <= now)
      return "Davet geçersiz veya süresi doldu.";
    const passwordHash = await hashPassword(data.data.password);
    userId = await db.$transaction(async (tx) => {
      if (
        !(
          await tx.invite.updateMany({
            where: {
              id: invite.id,
              usedAt: null,
              expiresAt: { gt: new Date() },
            },
            data: { usedAt: new Date() },
          })
        ).count
      )
        throw new Error();
      const user = await tx.user.create({
        data: {
          email: invite.email,
          name: data.data.name,
          passwordHash,
          roleId: invite.roleId,
        },
      });
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "kullanicilar",
          action: "accept-invite",
          recordId: user.id,
        },
      });
      return user.id;
    });
  } catch {
    return "Davet kullanılamadı.";
  }
  await openSession(userId);
  redirect("/admin");
}
