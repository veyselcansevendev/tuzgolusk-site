import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { homeSettings, blockNames } from "@/lib/site-settings";
import { visible } from "@/lib/content";
import { dateTime } from "@/lib/format";
import { Builder } from "./builder";

export default async function HomeBuilder({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const query = await searchParams;
  const user = await requireActor();
  if (!can(user, "ana-sayfa", "view")) notFound();
  const [{ draft, version }, revisions] = await Promise.all([
    homeSettings(),
    db.revision.findMany({
      where: { module: "ana-sayfa" },
      orderBy: { number: "desc" },
      take: 15,
    }),
  ]);
  const [categories, pages, teamSeasons, competitionSeasons] =
    await Promise.all([
      db.category.findMany({
        where: visible(),
        orderBy: { title: "asc" },
        take: 80,
      }),
      db.page.findMany({
        where: visible(),
        orderBy: { title: "asc" },
        take: 80,
      }),
      db.teamSeason.findMany({
        where: { team: visible(), season: visible() },
        include: { team: true, season: true },
        take: 80,
      }),
      db.competitionSeason.findMany({
        where: { competition: visible(), season: visible() },
        include: { competition: true, season: true },
        take: 80,
      }),
    ]);
  const forCategory = (kind: string) =>
    categories
      .filter((c) => c.kind === kind)
      .map((c) => ({ value: c.slug, label: c.title }));
  const teams = teamSeasons.map((s) => ({
    value: s.id,
    label: s.team.title + " · " + s.season.title,
  }));
  const sources = {
    news: forCategory("NEWS"),
    gallery: forCategory("ALBUM"),
    video: forCategory("VIDEO"),
    sponsors: forCategory("SPONSOR"),
    page: pages.map((p) => ({ value: p.slug, label: p.title })),
    matches: teams,
    squad: teams,
    standings: competitionSeasons.map((s) => ({
      value: s.id,
      label: s.competition.title + " · " + s.season.title,
    })),
  };
  return (
    <div className="stack">
      <div className="admin-title">
        <h1>Ana sayfa düzenleyici</h1>
        <Link className="button" href="/admin/ana-sayfa/onizleme">
          Taslağı önizle
        </Link>
      </div>
      {query.saved && (
        <p className="notice" role="status">
          {query.saved === "draft"
            ? "Taslak kaydedildi."
            : "Ana sayfa yayımlandı."}
        </p>
      )}
      <Builder
        key={version}
        items={draft}
        labels={blockNames}
        sources={sources}
        version={version}
        edit={can(user, "ana-sayfa", "update")}
        publish={can(user, "ana-sayfa", "publish")}
        revisions={revisions.map((x) => ({
          id: x.id,
          label: "Sürüm " + x.number + " · " + dateTime(x.createdAt),
        }))}
      />
    </div>
  );
}
