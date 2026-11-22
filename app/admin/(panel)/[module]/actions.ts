"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { idSchema, removeRecord, saveRecord } from "@/lib/cms";
import { catalog } from "@/lib/catalog";
import { z } from "zod";

export async function editRecord(
  key: string,
  id: string | null,
  _: string,
  form: FormData,
) {
  if (!Object.hasOwn(catalog, key)) return "Modül bulunamadı.";
  let target: string;
  try {
    target = await saveRecord(key, id ? idSchema.parse(id) : null, form);
  } catch (error) {
    return errorText(error);
  }
  revalidatePath("/", "layout");
  redirect("/admin/" + key + "?id=" + target + "&saved=1");
}
export async function deleteRecord(
  key: string,
  id: string,
  version: number,
  _: string,
  form: FormData,
) {
  if (!Object.hasOwn(catalog, key) || form.get("confirm") !== "on")
    return "Silme işlemini onaylayın.";
  try {
    await removeRecord(key, idSchema.parse(id), version);
  } catch (error) {
    return errorText(error);
  }
  revalidatePath("/", "layout");
  redirect("/admin/" + key + "?saved=1");
}
function errorText(error: unknown) {
  if (error instanceof z.ZodError)
    return (
      "Alanları kontrol edin. " + error.issues.map((i) => i.message).join(" ")
    );
  if (error instanceof Error && "code" in error) {
    if (error.code === "P2002")
      return "Aynı benzersiz değerle başka bir kayıt var.";
    if (error.code === "P2003") return "Bu kayıt başka bir kayıtla ilişkili.";
    return "Veritabanı işlemi tamamlanamadı. Lütfen tekrar deneyin.";
  }
  return error instanceof Error && !error.message.includes("Invalid `")
    ? error.message
    : "İşlem tamamlanamadı.";
}

export async function restoreRevision(
  key: string,
  id: string,
  revisionId: string,
  version: number,
  previous: string,
) {
  void previous;
  if (!Object.hasOwn(catalog, key)) return "Modül bulunamadı.";
  try {
    const { db } = await import("@/lib/db");
    const { mutationActor } = await import("@/lib/auth");
    const { inputDate } = await import("@/lib/format");
    await mutationActor(key, "publish");
    const revision = await db.revision.findFirst({
      where: {
        id: idSchema.parse(revisionId),
        module: key,
        recordId: idSchema.parse(id),
      },
    });
    if (!revision) return "Sürüm bulunamadı.";
    const snapshot = revision.snapshot as Record<
      string,
      string | number | boolean | null
    >;
    const form = new FormData();
    form.set("version", String(version));
    const fields = [
      ...catalog[key].fields,
      { name: "title", kind: "text" },
      { name: "slug", kind: "text" },
      { name: "status", kind: "text" },
      { name: "publishAt", kind: "date" },
      { name: "endAt", kind: "date" },
      { name: "position", kind: "int" },
    ];
    for (const field of fields) {
      const value = snapshot[field.name];
      if (value === null || value === undefined || value === false) continue;
      form.set(
        field.name,
        field.kind === "bool"
          ? "on"
          : field.kind === "date"
            ? inputDate(new Date(String(value)))
            : String(value),
      );
    }
    await saveRecord(key, id, form);
  } catch (error) {
    return errorText(error);
  }
  revalidatePath("/", "layout");
  redirect("/admin/" + key + "?id=" + id + "&saved=1");
}

export async function bulkArchive(key: string, _: string, form: FormData) {
  if (
    !Object.hasOwn(catalog, key) ||
    !catalog[key].content ||
    form.get("confirm") !== "on"
  )
    return "Arşivleme işlemini onaylayın.";
  try {
    const { db } = await import("@/lib/db");
    const { mutationActor } = await import("@/lib/auth");
    const { delegate } = await import("@/lib/cms");
    const user = await mutationActor(key, "publish");
    await mutationActor(key, "update");
    const ids = z
      .array(z.string().regex(/^[a-z0-9]{20,40}:\d+$/))
      .min(1)
      .max(20)
      .parse([...new Set(form.getAll("records"))]);
    await db.$transaction(async (tx) => {
      const repo = delegate(tx, catalog[key].model);
      for (const value of ids) {
        const [id, expected] = value.split(":");
        const version = Number(expected);
        if (
          !(
            await repo.updateMany({
              where: { id, version, deletedAt: null },
              data: {
                status: "ARCHIVED",
                version: version + 1,
                updatedBy: user.id,
              },
            })
          ).count
        )
          throw new Error(
            "Seçilen kayıtlardan biri değişti. Sayfayı yenileyin.",
          );
        const record = await repo.findUnique({ where: { id } });
        await tx.revision.create({
          data: {
            module: key,
            recordId: id,
            number: version + 1,
            snapshot: JSON.parse(JSON.stringify(record)),
            actorId: user.id,
          },
        });
        await tx.audit.create({
          data: {
            module: key,
            recordId: id,
            actorId: user.id,
            action: "archive",
          },
        });
      }
    });
  } catch (error) {
    return errorText(error);
  }
  revalidatePath("/", "layout");
  redirect("/admin/" + key + "?saved=1");
}
