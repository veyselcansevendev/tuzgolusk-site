import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { themeSettings } from "@/lib/site-settings";
import { canvasSchema, designTypes } from "@/lib/design-model";
import { dateTime } from "@/lib/format";
import { visible } from "@/lib/content";
import { matchVisible } from "@/lib/football";
import { Studio } from "./studio";

export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; q?: string; type?: string }>;
}) {
  const [user, query] = await Promise.all([requireActor(), searchParams]);
  if (!can(user, "tasarim-studyosu", "view")) notFound();
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const category = designTypes.includes(query.type || "")
    ? query.type
    : undefined;
  const assetScope = can(user, "medya", "view")
    ? {}
    : { OR: [{ isPublic: true }, { uploaderId: user.id }] };
  const assetFields = { id: true, key: true, alt: true } as const;
  const publishedMatch = matchVisible();
  const [designs, selected, assets, matches, { theme }] = await Promise.all([
    db.design.findMany({
      where: { ...(q ? { title: { contains: q } } : {}), category },
      select: {
        id: true,
        title: true,
        category: true,
        state: true,
        template: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
    typeof query.id === "string"
      ? db.design.findUnique({
          where: { id: query.id },
          include: {
            backDesignExportDesignId: {
              include: { media: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        })
      : null,
    db.media.findMany({
      where: assetScope,
      select: assetFields,
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    db.match.findMany({
      where: can(user, "maclar", "view") ? { deletedAt: null } : publishedMatch,
      include: {
        teamSeason: { include: { team: true } },
        opponent: true,
        stadium: true,
        competitionSeason: { include: { competition: true } },
        backLineupMatchId: {
          where: {
            starter: true,
            ...(can(user, "mac-kadrolari", "view")
              ? {}
              : { player: visible(), match: publishedMatch }),
          },
          include: { player: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { kickoff: "desc" },
      take: 100,
    }),
    themeSettings(),
  ]);
  const edit = selected
    ? can(user, "tasarim-studyosu", "update") &&
      (selected.ownerId === user.id || can(user, "tasarim-studyosu", "publish"))
    : can(user, "tasarim-studyosu", "create");
  if (query.id && !selected) notFound();
  const initial = selected
    ? canvasSchema.parse(selected.canvas)
    : { width: 1080, height: 1350, background: theme.primary, layers: [] };
  const selectedAssetIds = [
    theme.logoId,
    ...initial.layers.map((layer) => layer.mediaId),
  ].filter((id) => id && !assets.some((asset) => asset.id === id));
  const selectedAssets = selectedAssetIds.length
    ? await db.media.findMany({
        where: { ...assetScope, id: { in: selectedAssetIds } },
        select: assetFields,
      })
    : [];
  return (
    <div className="stack">
      <div className="admin-title">
        <h1>Tasarım Stüdyosu</h1>
        <Link className="button" href="/admin/tasarim-studyosu">
          Yeni tasarım
        </Link>
      </div>
      <details className="panel">
        <summary>Tasarımlar ve şablonlar ({designs.length})</summary>
        <form className="filters">
          <label>
            Başlık
            <input name="q" defaultValue={q} />
          </label>
          <label>
            Kategori
            <select name="type" defaultValue={category || ""}>
              <option value="">Tümü</option>
              {designTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <button className="button">Ara</button>
        </form>
        <ul className="link-list">
          {designs.map((d) => (
            <li key={d.id}>
              <Link href={"?id=" + d.id}>
                {d.title} · {d.category}
                {d.template ? " · Şablon" : ""}
              </Link>
            </li>
          ))}
        </ul>
      </details>
      <Studio
        key={(selected?.id || "new") + ":" + selected?.version}
        initial={initial}
        design={
          selected
            ? {
                id: selected.id,
                title: selected.title,
                category: selected.category,
                state: selected.state,
                version: selected.version,
                matchId: selected.matchId || "",
              }
            : null
        }
        media={[...assets, ...selectedAssets]}
        edit={edit}
        canCreate={can(user, "tasarim-studyosu", "create")}
        canPublish={can(user, "tasarim-studyosu", "publish")}
        canUpload={can(user, "medya", "create")}
        exportAllowed={can(user, "tasarim-studyosu", "export")}
        theme={{
          name: theme.name,
          primary: theme.primary,
          accent: theme.accent,
          primaryText: theme.primaryText,
          logoId: theme.logoId,
        }}
        matches={matches.map((m) => ({
          id: m.id,
          title: m.title,
          team: m.teamSeason.team.title,
          opponent: m.opponent.title,
          logoId: m.teamSeason.team.logoId || theme.logoId,
          opponentLogoId: m.opponent.logoId || "",
          kickoff: dateTime(m.kickoff),
          stadium: m.stadium?.title || "",
          competition: m.competitionSeason?.competition.title || "",
          venue: m.home ? "Ev sahibi" : "Deplasman",
          score:
            ["FINISHED", "AWARDED"].includes(m.matchState) &&
            m.clubScore !== null &&
            m.opponentScore !== null
              ? m.home
                ? m.clubScore + " : " + m.opponentScore
                : m.opponentScore + " : " + m.clubScore
              : "",
          lineup: m.backLineupMatchId.map((x) => x.player.title),
        }))}
      />
      {selected && selected.backDesignExportDesignId.length > 0 && (
        <section className="panel stack">
          <h2>WebP arşivi</h2>
          {selected.backDesignExportDesignId.map((x) => (
            <div className="actions" key={x.id}>
              <a className="text-link" download href={"/medya/" + x.media.key}>
                {x.width} × {x.height} · {dateTime(x.createdAt)}
              </a>
              {can(user, "sosyal-medya", "create") && (
                <Link
                  className="button"
                  href={"/admin/sosyal-medya?new=1&asset=" + x.mediaId}
                >
                  Paylaşım taslağına aktar
                </Link>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
