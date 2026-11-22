import Link from "next/link";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { catalog } from "@/lib/catalog";

export default async function Dashboard() {
  const user = await requireActor();
  const [news, drafts, players, upcoming, messages, actions, next, last] =
    await Promise.all([
      can(user, "haberler", "view")
        ? db.news.count({ where: { deletedAt: null } })
        : null,
      can(user, "haberler", "view")
        ? db.news.count({ where: { deletedAt: null, status: "DRAFT" } })
        : null,
      can(user, "oyuncular", "view")
        ? db.player.count({ where: { deletedAt: null, status: "PUBLISHED" } })
        : null,
      can(user, "maclar", "view")
        ? db.match.count({
            where: {
              deletedAt: null,
              kickoff: { gte: new Date() },
              matchState: "PLANNED",
            },
          })
        : null,
      can(user, "mesajlar", "view")
        ? db.message.count({ where: { deletedAt: null, state: "NEW" } })
        : null,
      db.audit.findMany({
        where: { ...(user.role.key === "super" ? {} : { actorId: user.id }) },
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      can(user, "maclar", "view")
        ? db.match.findFirst({
            where: {
              deletedAt: null,
              kickoff: { gte: new Date() },
              matchState: "PLANNED",
            },
            orderBy: { kickoff: "asc" },
          })
        : null,
      can(user, "haberler", "view")
        ? db.news.findFirst({
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
          })
        : null,
    ]);
  const metrics = [
    ["Haberler", news, "haberler"],
    ["Haber taslağı", drafts, "haberler?status=DRAFT"],
    ["Yayındaki oyuncu", players, "oyuncular"],
    ["Yaklaşan maç", upcoming, "maclar"],
    ["Yeni mesaj", messages, "mesajlar"],
  ];
  return (
    <div className="stack">
      <div className="admin-title">
        <div>
          <h1>Yönetim paneli</h1>
          <p>{user.name}</p>
        </div>
        {can(user, "haberler", "create") && (
          <Link className="button" href="/admin/haberler?new=1">
            Haber ekle
          </Link>
        )}
      </div>
      <div className="kpi-grid">
        {metrics
          .filter(([, count]) => count !== null)
          .map(([title, count, link]) => (
            <Link className="panel" key={title} href={"/admin/" + link}>
              <strong>{count}</strong>
              {title}
            </Link>
          ))}
      </div>
      {(next || last) && (
        <div className="grid-match">
          {next && (
            <div className="panel stack">
              <h2>Sıradaki maç</h2>
              <Link href={"/admin/maclar?id=" + next.id}>
                {next.title} · {dateTime(next.kickoff)}
              </Link>
            </div>
          )}
          {last && (
            <div className="panel stack">
              <h2>Son haber</h2>
              <Link href={"/admin/haberler?id=" + last.id}>{last.title}</Link>
            </div>
          )}
        </div>
      )}
      <section className="panel stack">
        <h2>Son işlemler</h2>
        {actions.length ? (
          <ul className="link-list">
            {actions.map((a) => (
              <li key={a.id}>
                {dateTime(a.createdAt)} · {a.actor?.name} ·{" "}
                {catalog[a.module]?.label || a.module} · {a.action}
              </li>
            ))}
          </ul>
        ) : (
          <p>Henüz işlem yok.</p>
        )}
      </section>
    </div>
  );
}
