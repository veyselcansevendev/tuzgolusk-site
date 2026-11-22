"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { mutationActor } from "@/lib/auth";
import { catalog } from "@/lib/catalog";
import { slugify } from "@/lib/format";

const actions = [
  "view",
  "create",
  "update",
  "delete",
  "publish",
  "approve",
  "export",
];
const modules = [
  ...Object.keys(catalog),
  "medya",
  "mesajlar",
  "tasarim-studyosu",
  "sosyal-medya",
  "tema",
  "ana-sayfa",
];
export async function saveRole(id: string | null, _: string, form: FormData) {
  try {
    const user = await mutationActor("roller", "manage_users");
    if (user.role.key !== "super") return "Super Admin yetkisi gerekli.";
    const name = z.string().trim().min(2).max(100).parse(form.get("name"));
    const permissions = [
      ...new Set(form.getAll("permission").map(String)),
    ].filter((x) => {
      const [module, action] = x.split(":");
      return modules.includes(module) && actions.includes(action);
    });
    await db.$transaction(async (tx) => {
      const current = id
        ? await tx.role.findUniqueOrThrow({ where: { id } })
        : null;
      if (current?.key === "super")
        throw new Error("Super Admin rolü korunur.");
      const role = current
        ? await tx.role.update({
            where: { id: current.id },
            data: { name, permissions },
          })
        : await tx.role.create({
            data: { key: "custom-" + slugify(name), name, permissions },
          });
      if (current)
        await tx.session.deleteMany({
          where: { user: { roleId: current.id } },
        });
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "roller",
          action: current ? "update" : "create",
          recordId: role.id,
        },
      });
    });
    revalidatePath("/admin/roller");
    return "Rol kaydedildi.";
  } catch {
    return "Rol kaydedilemedi. Adı ve yetkileri kontrol edin.";
  }
}
