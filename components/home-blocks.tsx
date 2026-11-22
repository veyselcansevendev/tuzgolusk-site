import Link from "next/link";
import { db } from "@/lib/db";
import { isVisible, visible } from "@/lib/content";
import { themeSettings, type HomeBlock } from "@/lib/site-settings";
import { matchVisible, finished } from "@/lib/football";
import { matchInclude } from "@/lib/cms";
import { tableData } from "@/lib/public-data";
import {
  ArticleCard,
  Empty,
  Heading,
  MatchCard,
  Photo,
  Standings,
} from "@/components/site";
import { Hero } from "@/components/hero";
import { webpUrl } from "@/lib/format";

export async function Blocks({ blocks }: { blocks: HomeBlock[] }) {
  const { theme, media } = await themeSettings();
  const logo = media.find((a) => a.id === theme.logoId);
  return Promise.all(
    blocks
      .filter((block) => block.visible)
      .map(async (block) => {
        const { kind, title, count, source, text, url } = block;
        const orderBy = { position: "asc" } as const;
        const scope = visible();
        const featured =
          kind === "hero"
            ? await db.slide.findMany({
                where: scope,
                include: { cover: true, mobile: true },
                orderBy,
                take: count,
              })
            : [];
        if (kind === "hero") {
          const cover = media.find((a) => a.id === theme.heroId);
          const fallback = !featured.length
            ? await db.news.findFirst({
                where: { ...scope, featured: true },
                include: { cover: true },
                orderBy: { createdAt: "desc" },
              })
            : null;
          const slides = featured.map((s) => ({
            title: s.title,
            summary: s.summary,
            image: s.cover ? webpUrl(s.cover.key) : undefined,
            mobile: s.mobile ? webpUrl(s.mobile.key) : undefined,
            href: s.url || undefined,
            cta: s.cta || undefined,
            video: s.video || undefined,
          }));
          if (fallback)
            slides.push({
              title: fallback.title,
              summary: fallback.summary,
              image: fallback.cover ? webpUrl(fallback.cover.key) : undefined,
              href: "/haberler/" + fallback.slug,
              cta: "Haberi oku",
              mobile: undefined,
              video: undefined,
            });
          else if (!slides.length && cover)
            slides.push({
              title: theme.name,
              summary: theme.slogan,
              image: webpUrl(cover.key),
              href: "/fikstur",
              cta: "Fikstür",
              mobile: undefined,
              video: undefined,
            });
          return (
            <Hero
              key={block.id}
              slides={slides}
              club={theme.name}
              location={theme.address}
            />
          );
        }
        let content: React.ReactNode = null;
        let href = "";
        if (kind === "matches") {
          href = "/mac-merkezi";
          const where = {
            ...matchVisible(),
            ...(source ? { teamSeasonId: source } : {}),
          };
          const [last, next, live] = await Promise.all([
            db.match.findFirst({
              where: { ...where, matchState: { in: finished } },
              include: matchInclude,
              orderBy: { kickoff: "desc" },
            }),
            db.match.findFirst({
              where: {
                ...where,
                matchState: "PLANNED",
                kickoff: { gte: new Date() },
              },
              include: matchInclude,
              orderBy: { kickoff: "asc" },
            }),
            db.match.findFirst({
              where: { ...where, matchState: { in: ["LIVE", "HALF_TIME"] } },
              include: matchInclude,
              orderBy: { kickoff: "desc" },
            }),
          ]);
          content = (
            <div className="grid-match">
              <div>
                {live ? (
                  <MatchCard match={live} logo={logo} />
                ) : last ? (
                  <MatchCard match={last} logo={logo} caption="Son maç" />
                ) : (
                  <div className="match-card empty-match">
                    <span>Son maç</span>
                    <p>Henüz sonuç yayımlanmadı.</p>
                  </div>
                )}
              </div>
              <div>
                {next ? (
                  <MatchCard match={next} logo={logo} caption="Sıradaki maç" />
                ) : (
                  <div className="match-card empty-match">
                    <span>Sıradaki maç</span>
                    <p>Henüz maç tarihi açıklanmadı.</p>
                  </div>
                )}
              </div>
            </div>
          );
        }
        if (kind === "news") {
          href = "/haberler";
          const items = await db.news.findMany({
            where: {
              ...scope,
              ...(source ? { category: { slug: source } } : {}),
            },
            include: { cover: true, category: true },
            orderBy: [
              { featured: "desc" },
              { publishAt: "desc" },
              { createdAt: "desc" },
            ],
            take: count,
          });
          content = items.length ? (
            <div className="card-grid">
              {items.map((a) => (
                <ArticleCard
                  key={a.id}
                  title={a.title}
                  summary={a.summary}
                  asset={a.cover}
                  href={href + "/" + a.slug}
                  label={
                    a.category && isVisible(a.category)
                      ? a.category.title
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <Empty>Henüz kulüp haberi yayımlanmadı.</Empty>
          );
        }
        if (kind === "announcements") {
          href = "/duyurular";
          const items = await db.announcement.findMany({
            where: scope,
            orderBy,
            take: count,
          });
          if (!items.length) return null;
          content = (
            <div className="card-grid">
              {items.map((a) => (
                <ArticleCard
                  key={a.id}
                  title={a.title}
                  summary={a.summary}
                  href={href + "/" + a.slug}
                />
              ))}
            </div>
          );
        }
        if (kind === "squad") {
          href = "/a-takim";
          const items = await db.playerSeason.findMany({
            where: {
              visible: true,
              player: scope,
              teamSeason: {
                team: { ...scope, kind: "SENIOR" },
                season: { ...scope, current: true },
              },
              ...(source ? { teamSeasonId: source } : {}),
            },
            include: { player: { include: { photo: true } } },
            orderBy: { shirt: "asc" },
            take: count,
          });
          if (!items.length) return null;
          content = (
            <div className="card-grid">
              {items.map((a) => (
                <ArticleCard
                  key={a.id}
                  title={a.player.title}
                  label={a.shirt + " · " + a.player.positionName}
                  asset={a.player.photo}
                  href={"/futbolcular/" + a.player.slug}
                />
              ))}
            </div>
          );
        }
        if (kind === "standings") {
          href = "/puan-durumu";
          const data = await tableData(source || undefined);
          if (!data.rows.length) return null;
          content = (
            <Standings label={data.label} rows={data.rows.slice(0, count)} />
          );
        }
        if (kind === "gallery") {
          href = "/galeri";
          const items = await db.album.findMany({
            where: {
              ...scope,
              ...(source ? { category: { slug: source } } : {}),
            },
            include: { cover: true },
            orderBy,
            take: count,
          });
          if (!items.length) return null;
          content = (
            <div className="card-grid">
              {items.map((a) => (
                <ArticleCard
                  key={a.id}
                  title={a.title}
                  summary={a.summary}
                  asset={a.cover}
                  href={href + "/" + a.slug}
                />
              ))}
            </div>
          );
        }
        if (kind === "video") {
          href = "/videolar";
          const items = await db.video.findMany({
            where: {
              ...scope,
              ...(source ? { category: { slug: source } } : {}),
            },
            include: { poster: true },
            orderBy,
            take: count,
          });
          if (!items.length) return null;
          content = (
            <div className="card-grid">
              {items.map((a) => (
                <ArticleCard
                  key={a.id}
                  title={a.title}
                  summary={a.summary}
                  asset={a.poster}
                  href={a.url}
                />
              ))}
            </div>
          );
        }
        if (kind === "sponsors") {
          href = "/sponsorlar";
          const items = await db.sponsor.findMany({
            where: {
              ...scope,
              placement: { in: ["BOTH", "HOME"] },
              ...(source ? { category: { slug: source } } : {}),
            },
            include: { logo: true },
            orderBy,
            take: count,
          });
          if (!items.length) return null;
          content = (
            <div className="sponsor-grid">
              {items.map((a) => (
                <a
                  key={a.id}
                  href={a.url || href}
                  rel={a.url ? "sponsored noopener noreferrer" : undefined}
                >
                  <Photo asset={a.logo} />
                  <strong>{a.title}</strong>
                </a>
              ))}
            </div>
          );
        }
        if (kind === "page") {
          const item = await db.page.findFirst({
            where: { ...scope, ...(source ? { slug: source } : {}) },
            include: { cover: true },
            orderBy,
          });
          if (!item) return null;
          content = (
            <ArticleCard
              title={item.title}
              summary={item.summary}
              asset={item.cover}
              href={"/kurumsal/" + item.slug}
            />
          );
        }
        if (kind === "text") content = <p className="block-text">{text}</p>;
        if (kind === "cta" || kind === "contact")
          content = (
            <div className="actions">
              {text && <p>{text}</p>}
              <Link className="button" href={url || "/iletisim"}>
                {kind === "contact" ? "İletişim bilgileri" : "Detayları incele"}
              </Link>
            </div>
          );
        return (
          <section
            key={block.id}
            className={"site-section block-" + block.style}
          >
            <div className="wrap">
              <Heading title={title}>
                {href && (
                  <Link className="text-link" href={href}>
                    Tümünü gör
                  </Link>
                )}
              </Heading>
              {content}
            </div>
          </section>
        );
      }),
  );
}
