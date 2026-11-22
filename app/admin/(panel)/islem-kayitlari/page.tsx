import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { dateTime } from "@/lib/format";

export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; p?: string }>;
}) {
  const [user, query] = await Promise.all([requireActor(), searchParams]);
  if (!can(user, "islem-kayitlari", "view")) notFound();
  const selectedModule =
    typeof query.module === "string" ? query.module.slice(0, 100) : "";
  const page = Math.max(1, Math.min(1000, parseInt(String(query.p), 10) || 1));
  const rows = await db.audit.findMany({
    where: selectedModule ? { module: selectedModule } : undefined,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
    skip: (page - 1) * 50,
    take: 51,
  });
  return (
    <div className="stack">
      <h1>İşlem kayıtları</h1>
      <form className="filters">
        <label>
          Modül anahtarı
          <input name="module" defaultValue={selectedModule} />
        </label>
        <button className="button">Filtrele</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kullanıcı</th>
              <th>Modül</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((x) => (
              <tr key={x.id}>
                <td>{dateTime(x.createdAt)}</td>
                <td>{x.actor?.name || "Sistem"}</td>
                <td>{x.module}</td>
                <td>{x.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        {page > 1 && (
          <Link
            href={
              "?" +
              new URLSearchParams({
                module: selectedModule,
                p: String(page - 1),
              })
            }
          >
            Önceki
          </Link>
        )}
        {rows.length > 50 && (
          <Link
            href={
              "?" +
              new URLSearchParams({
                module: selectedModule,
                p: String(page + 1),
              })
            }
          >
            Sonraki
          </Link>
        )}
      </div>
    </div>
  );
}
