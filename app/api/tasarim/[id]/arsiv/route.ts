import { revalidatePath } from "next/cache";
import { actor, can, rate, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { maxBytes, persistWebp, normalizeWebp } from "@/lib/media";
import { canvasSchema } from "@/lib/design-model";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await actor();
  if (
    !(await sameOrigin()) ||
    !user ||
    !can(user, "tasarim-studyosu", "export")
  )
    return Response.json(
      { error: "Dışa aktarma yetkiniz yok." },
      { status: 403 },
    );
  if (!(await rate("design:" + user.id, 30, 60000)))
    return Response.json(
      { error: "Dışa aktarma sınırı aşıldı." },
      { status: 429 },
    );
  const length = Number(req.headers.get("content-length"));
  if (!(length > 0 && length <= maxBytes + 4096))
    return Response.json(
      { error: "Dosya boyutu sınırı aşıldı." },
      { status: 413 },
    );
  const design = await db.design.findUnique({ where: { id } });
  if (
    !design ||
    (design.ownerId !== user.id && !can(user, "tasarim-studyosu", "publish"))
  )
    return new Response(null, { status: 404 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    const version = Number(form.get("version"));
    const canvas = canvasSchema.parse(design.canvas);
    if (!(file instanceof File) || design.version !== version)
      throw new Error("Tasarım değişti. Yeniden açın.");
    const info = await normalizeWebp(file);
    if (info.width !== canvas.width || info.height !== canvas.height)
      throw new Error("Önce yeni ölçüyü kaydedin.");
    const asset = await persistWebp(
      file,
      design.title,
      "Tasarım Stüdyosu",
      user.id,
      async (tx, mediaId) => {
        const current = await tx.design.findUnique({ where: { id } });
        if (current?.version !== version)
          throw new Error("Tasarım değişti. Yeniden açın.");
        await tx.designExport.create({
          data: {
            designId: id,
            mediaId,
            width: info.width,
            height: info.height,
          },
        });
      },
    );
    revalidatePath("/admin/tasarim-studyosu");
    return Response.json({ id: asset.id, key: asset.key }, { status: 201 });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error && !("code" in e)
            ? e.message
            : "Afiş arşivlenemedi.",
      },
      { status: 422 },
    );
  }
}
