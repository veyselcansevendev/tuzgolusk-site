import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { siteUrl } from "@/lib/auth";
import { db } from "@/lib/db";
import { readMatch, scoreOf } from "@/lib/match-feed";
import { themeSettings } from "@/lib/site-settings";
import { LiveMatch } from "@/components/live-match";
import { ArticleCard, MatchCard } from "@/components/site";
import { isVisible, visible } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [match, { theme, media }] = await Promise.all([
    readMatch(slug),
    themeSettings(),
  ]);
  if (!match) return { title: "Maç", robots: { index: false } };
  const cover = media.find((a) => a.id === theme.ogId);
  const url = "/maclar/" + slug;
  return {
    title: match.title,
    description: match.teamSeason.team.title + " – " + match.opponent.title,
    alternates: { canonical: url },
    openGraph: {
      title: match.title,
      url,
      images: cover ? ["/medya/" + cover.key] : [],
    },
  };
}
export default async function MatchDetail({ params }: Props) {
  const { slug } = await params;
  const match = await readMatch(slug);
  if (!match) {
    const entry = await db.redirect.findUnique({
      where: { fromPath: "/maclar/" + slug },
    });
    if (entry) permanentRedirect(entry.toPath);
    notFound();
  }
  const [{ theme, media }, news, album] = await Promise.all([
    themeSettings(),
    db.news.findMany({
      where: { ...visible(), matchId: match.id },
      include: { cover: true },
      take: 8,
    }),
    match.albumId
      ? db.album.findFirst({ where: { ...visible(), id: match.albumId } })
      : null,
  ]);
  const lineup = match.backLineupMatchId;
  const score = scoreOf(match);
  const eventStatus = (
    {
      CANCELLED: "EventCancelled",
      POSTPONED: "EventPostponed",
      PLANNED: "EventScheduled",
    } as Record<string, string>
  )[match.matchState];
  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: match.title,
    startDate: match.kickoff.toISOString(),
    url: new URL("/maclar/" + slug, siteUrl()).href,
    eventStatus: eventStatus ? "https://schema.org/" + eventStatus : undefined,
    location:
      match.stadium && isVisible(match.stadium)
        ? {
            "@type": "Place",
            name: match.stadium.title,
            address: match.stadium.address || undefined,
          }
        : undefined,
    homeTeam: {
      "@type": "SportsTeam",
      name: match.home ? match.teamSeason.team.title : match.opponent.title,
    },
    awayTeam: {
      "@type": "SportsTeam",
      name: match.home ? match.opponent.title : match.teamSeason.team.title,
    },
  };
  return (
    <>
      <div className="page-intro">
        <div className="wrap">
          <Link href="/mac-merkezi">Maç Merkezi</Link>
          <h1>{match.title}</h1>
        </div>
      </div>
      <div className="wrap page-content stack">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
        <MatchCard
          match={match}
          logo={media.find((a) => a.id === theme.logoId)}
          showScore={false}
        />
        <LiveMatch
          slug={slug}
          initial={score}
          poll={["PLANNED", "LIVE", "HALF_TIME"].includes(match.matchState)}
        />
        {(match.round || match.referee || match.broadcast || match.notes) && (
          <section className="panel stack">
            <h2>Maç bilgileri</h2>
            {match.round && <p>Tur: {match.round}</p>}
            {match.referee && <p>Hakem: {match.referee}</p>}
            {match.broadcast && <p>Yayın: {match.broadcast}</p>}
            {match.notes && <p>{match.notes}</p>}
          </section>
        )}
        {lineup.length > 0 && (
          <section className="grid-match">
            {[true, false].map((starter) => (
              <div className="panel" key={String(starter)}>
                <h2>{starter ? "İlk 11" : "Yedekler"}</h2>
                <ul className="link-list">
                  {lineup
                    .filter((x) => x.starter === starter)
                    .map((x) => (
                      <li key={x.id}>
                        <Link href={"/futbolcular/" + x.player.slug}>
                          {x.player.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>
        )}
        {album && (
          <Link className="text-link" href={"/galeri/" + album.slug}>
            Maç fotoğrafları
          </Link>
        )}
        {news.length > 0 && (
          <section className="stack">
            <h2>Maç haberleri</h2>
            <div className="card-grid">
              {news.map((x) => (
                <ArticleCard
                  key={x.id}
                  title={x.title}
                  summary={x.summary}
                  asset={x.cover}
                  href={"/haberler/" + x.slug}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
