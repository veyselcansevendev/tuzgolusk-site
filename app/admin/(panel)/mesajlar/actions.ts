"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { mutationActor } from "@/lib/auth";

export async function updateMessage(id: string, _: string, form: FormData) {
  try {
    const state = z
      .enum(["NEW", "READ", "REPLIED", "ARCHIVED", "DELETE"])
      .parse(form.get("state"));
    const user = await mutationActor(
      "mesajlar",
      state === "DELETE" ? "delete" : "update",
    );
    if (state === "DELETE" && form.get("confirm") !== "on")
      return "Silme işlemini onaylayın.";
    await db.$transaction(async (tx) => {
      const data =
        state === "DELETE"
          ? {
              deletedAt: new Date(),
              name: "",
              email: "",
              subject: "",
              body: "",
            }
          : { state };
      if (
        !(await tx.message.updateMany({ where: { id, deletedAt: null }, data }))
          .count
      )
        throw new Error();
      await tx.audit.create({
        data: {
          actorId: user.id,
          module: "mesajlar",
          action: state,
          recordId: id,
        },
      });
    });
    revalidatePath("/admin/mesajlar");
    return "Mesaj güncellendi.";
  } catch {
    return "Mesaj değiştirilemedi.";
  }
}
