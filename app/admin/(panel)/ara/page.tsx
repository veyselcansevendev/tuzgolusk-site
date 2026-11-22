import Link from "next/link";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { catalog } from "@/lib/catalog";
import { delegate } from "@/lib/cms";

export default async function AdminSearch({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [user, query] = await Promise.all([requireActor(), searchParams]);
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const modules = Object.entries(catalog).filter(
    ([key, schema]) => schema.content && can(user, key, "view"),
  );
  const results = q
    ? (
        await Promise.all(
          modules.map(async ([key, schema]) => {
            const rows = await delegate(db, schema.model).findMany({
              where: { deletedAt: null, title: { contains: q } },
              orderBy: { updatedAt: "desc" },
              take: 10,
            });
            return { key, label: schema.label, rows };
          }),
        )
      ).filter((group) => group.rows.length)
    : [];
  return (
    <div className="stack">
      <h1>Panelde ara</h1>
      {q && (
        <p>
          Arama terimi <strong>{q}</strong>
        </p>
      )}
      {results.map((group) => (
        <section className="panel stack" key={group.key}>
          <h2>{group.label}</h2>
          <ul className="link-list">
            {group.rows.map((row) => (
              <li key={row.id}>
                <Link href={"/admin/" + group.key + "?id=" + row.id}>
                  {String(row.title)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {q && !results.length && <p>Kayıt bulunamadı.</p>}
    </div>
  );
}
