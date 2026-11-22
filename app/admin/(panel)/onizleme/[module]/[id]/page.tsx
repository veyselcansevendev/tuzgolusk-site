import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { catalog } from "@/lib/catalog";
import { delegate, idSchema } from "@/lib/cms";
import { cleanRichText } from "@/lib/content";

export default async function Preview({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const [{ module: key, id }, user] = await Promise.all([
    params,
    requireActor(),
  ]);
  if (
    !Object.hasOwn(catalog, key) ||
    !can(user, key, "view") ||
    !idSchema.safeParse(id).success
  )
    notFound();
  const row = await delegate(db, catalog[key].model).findUnique({
    where: { id },
  });
  if (!row || row.deletedAt) notFound();
  return (
    <article className="panel stack">
      <p className="eyebrow">Önizleme</p>
      <h1>{String(row.title || "")}</h1>
      <p>{String(row.summary || "")}</p>
      <div
        className="prose"
        dangerouslySetInnerHTML={{
          __html: cleanRichText(String(row.body || "")),
        }}
      />
    </article>
  );
}
