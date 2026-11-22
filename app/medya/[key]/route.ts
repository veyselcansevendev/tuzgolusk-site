import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { actor, can } from "@/lib/auth";
import { hasPublishedReference } from "@/lib/published-media";
import { mediaPath, validKey } from "@/lib/media";

const notFound = () =>
  new Response(null, {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!validKey.test(key)) return notFound();
  const item = await db.media.findUnique({ where: { key } });
  if (!item) return notFound();
  const publicAsset = await hasPublishedReference(item.id, key);
  if (!publicAsset) {
    const user = await actor();
    if (!user || !(user.id === item.uploaderId || can(user, "medya", "view")))
      return notFound();
  }
  try {
    const data = await readFile(
      mediaPath(key, item.small && new URL(req.url).searchParams.has("small")),
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": publicAsset ? "public, no-cache" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
