import { actor, can, rate, sameOrigin } from "@/lib/auth";
import { persistWebp, maxBytes } from "@/lib/media";

export async function POST(req: Request) {
  if (!(await sameOrigin()))
    return Response.json(
      { error: "İstek kaynağı doğrulanamadı." },
      { status: 403 },
    );
  const user = await actor();
  if (!can(user, "medya", "create"))
    return Response.json({ error: "Yükleme yetkiniz yok." }, { status: 403 });
  if (!(await rate("media:" + user!.id, 45, 60_000)))
    return Response.json(
      { error: "Lütfen biraz sonra tekrar deneyin." },
      { status: 429 },
    );
  const length = Number(req.headers.get("content-length"));
  if (!(length > 0 && length <= maxBytes + 32768))
    return Response.json(
      { error: "Görsel en fazla 12 MB olabilir." },
      { status: 413 },
    );
  try {
    const data = await req.formData();
    const file = data.get("file");
    const alt = String(data.get("alt") || "").trim();
    const credit = String(data.get("credit") || "").trim();
    if (
      !(file instanceof File) ||
      !alt ||
      alt.length > 250 ||
      credit.length > 250
    )
      throw new Error("Dosya ve geçerli bir alternatif metin gerekli.");
    const asset = await persistWebp(file, alt, credit, user!.id);
    return Response.json(
      { id: asset.id, key: asset.key, alt: asset.alt },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && !error.message.includes("Invalid `")
            ? error.message
            : "Yükleme tamamlanamadı.",
      },
      { status: 422 },
    );
  }
}
