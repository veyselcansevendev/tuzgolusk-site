import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { cleanRichText, isVisible, visible, youtubeId } from "@/lib/content";
import { matchVisible, finished } from "@/lib/football";
import { matchInclude } from "@/lib/cms";
import {
  competitionOptions,
  seasonOptions,
  tableData,
} from "@/lib/public-data";
import { themeSettings } from "@/lib/site-settings";
import { siteUrl } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import {
  ArticleCard,
  Empty,
  MatchCard,
  Photo,
  SearchField,
  Standings,
} from "@/components/site";
import { MatchRefresh } from "@/components/match-refresh";
import { Lightbox } from "@/components/lightbox";

const titles: Record<string, string> = {
  haberler: "Haberler",
  "a-takim": "A Takım",
  "teknik-ekip": "Teknik Ekip",
  fikstur: "Fikstür",
  "mac-sonuclari": "Maç Sonuçları",
  "mac-merkezi": "Maç Merkezi",
  "puan-durumu": "Puan Durumu",
  kulup: "Kulüp",
  kurumsal: "Kurumsal",
  altyapi: "Altyapı",
  galeri: "Fotoğraf Galerisi",
  videolar: "Videolar",
  sponsorlar: "Sponsorlar",
  duyurular: "Duyurular",
  gizlilik: "Gizlilik",
  kvkk: "KVKK",
  ara: "Site İçi Arama",
};
type Props = {
  params: Promise<{ section: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
const resultsLimit = 12;
function param(value: unknown) {
  return typeof value === "string" ? value.slice(0, 100) : "";
}
const contentWithCover = { cover: true } as const;

async function findDetail(section: string, slug: string) {
  const where = { ...visible(), slug };
  if (section === "haberler")
    return db.news
      .findFirst({
        where,
        include: {
          cover: true,
          category: true,
          backNewsImageNewsId: {
            include: { media: true },
            orderBy: { position: "asc" },
          },
          backNewsTagNewsId: { include: { tag: true } },
          match: true,
          player: true,
        },
      })
      .then((row) => (row ? { ...row, detailType: "news" as const } : null));
  if (section === "kurumsal" || section === "gizlilik" || section === "kvkk")
    return db.page
      .findFirst({ where, include: contentWithCover })
      .then((row) => (row ? { ...row, detailType: "page" as const } : null));
  if (section === "duyurular")
    return db.announcement
      .findFirst({ where })
      .then((row) =>
        row ? { ...row, detailType: "announcement" as const } : null,
      );
  if (section === "galeri")
    return db.album
      .findFirst({
        where,
        include: {
          cover: true,
          backAlbumImageAlbumId: {
            include: { media: true },
            orderBy: { position: "asc" },
          },
        },
      })
      .then((row) => (row ? { ...row, detailType: "album" as const } : null));
  if (section === "futbolcular")
    return db.player
      .findFirst({
        where,
        include: {
          photo: true,
          backPlayerSeasonPlayerId: {
            where: {
              visible: true,
              teamSeason: { team: visible(), season: visible() },
            },
            include: { teamSeason: { include: { team: true, season: true } } },
            orderBy: { teamSeason: { season: { startsAt: "desc" } } },
          },
        },
      })
      .then((row) => (row ? { ...row, detailType: "player" as const } : null));
  return null;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section, slug } = await params;
  const canonical = "/" + [section, ...(slug || [])].join("/");
  const detail =
    slug?.length === 1
      ? await findDetail(section, slug[0])
      : ["gizlilik", "kvkk"].includes(section)
        ? await findDetail(section, section)
        : null;
  const { theme, media } = await themeSettings();
  const cover =
    (detail &&
      ("cover" in detail
        ? detail.cover
        : "photo" in detail
          ? detail.photo
          : null)) ||
    media.find((a) => a.id === theme.ogId);
  const title =
    (detail && "seoTitle" in detail && detail.seoTitle) ||
    detail?.title ||
    titles[section] ||
    "İçerik";
  const description =
    (detail && "seoDescription" in detail && detail.seoDescription) ||
    (detail && "summary" in detail && detail.summary) ||
    theme.description;
  const indexable =
    Boolean(
      detail ||
      (!slug?.length &&
        titles[section] &&
        !["gizlilik", "kvkk"].includes(section)),
    ) &&
    section !== "ara" &&
    !theme.maintenance &&
    process.env.INDEX_PUBLIC_SITE === "true" &&
    process.env.NODE_ENV === "production";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: cover ? ["/medya/" + cover.key] : [],
    },
    robots: { index: indexable, follow: true },
  };
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="page-intro">
        <div className="wrap">
          <Link href="/">Ana sayfa</Link>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="wrap page-content stack">{children}</div>
    </>
  );
}

export default async function PublicSection({ params, searchParams }: Props) {
  const [{ section, slug }, query] = await Promise.all([params, searchParams]);
  if (slug && slug.length !== 1) notFound();
  if (slug?.length || ["gizlilik", "kvkk"].includes(section)) {
    const path = "/" + [section, ...(slug || [])].join("/");
    const item = await findDetail(section, slug?.[0] || section);
    if (!item) {
      const old = await db.redirect.findUnique({ where: { fromPath: path } });
      if (old) permanentRedirect(old.toPath);
      if (["gizlilik", "kvkk"].includes(section) && !slug)
        return (
          <Shell title={titles[section]}>
            <Empty>Bilgilendirme metni henüz yayımlanmadı.</Empty>
          </Shell>
        );
      notFound();
    }
    const canonical = new URL(path, siteUrl()).href;
    const asset =
      "cover" in item ? item.cover : "photo" in item ? item.photo : null;
    const related =
      section === "haberler" && "categoryId" in item && "body" in item
        ? await db.news.findMany({
            where: {
              ...visible(),
              id: { not: item.id },
              ...(item.categoryId ? { categoryId: item.categoryId } : {}),
            },
            include: { cover: true },
            orderBy: { createdAt: "desc" },
            take: 3,
          })
        : [];
    return (
      <Shell
        title={item.title}
        description={"summary" in item ? item.summary : undefined}
      >
        <article className="article-detail stack">
          {asset && <Photo asset={asset} className="detail-photo" hero />}
          {"body" in item && (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: cleanRichText(item.body) }}
            />
          )}
          {"url" in item && item.url && (
            <Link className="button" href={item.url}>
              Bağlantıya git
            </Link>
          )}
          {"positionName" in item && (
            <p>
              {[
                item.positionName,
                item.nationality,
                item.height ? item.height + " cm" : null,
                item.foot,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {"backPlayerSeasonPlayerId" in item && (
            <div className="table-wrap">
              <table>
                <caption>Sezon istatistikleri</caption>
                <thead>
                  <tr>
                    {[
                      "Sezon",
                      "Takım",
                      "Forma",
                      "Maç",
                      "Gol",
                      "Asist",
                      "Dakika",
                      "Sarı",
                      "Kırmızı",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {item.backPlayerSeasonPlayerId.map((r) => (
                    <tr key={r.id}>
                      <td>{r.teamSeason.season.title}</td>
                      <td>{r.teamSeason.team.title}</td>
                      {[
                        r.shirt,
                        r.appearances,
                        r.goals,
                        r.assists,
                        r.minutes,
                        r.yellow,
                        r.red,
                      ].map((x, i) => (
                        <td key={i}>{x}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {"backAlbumImageAlbumId" in item && (
            <Lightbox images={item.backAlbumImageAlbumId.map((x) => x.media)} />
          )}
          {item.detailType === "news" && (
            <>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "NewsArticle",
                    headline: item.title,
                    description: item.summary,
                    datePublished: (
                      item.publishAt || item.createdAt
                    ).toISOString(),
                    dateModified: item.updatedAt.toISOString(),
                    mainEntityOfPage: canonical,
                    image: asset
                      ? new URL("/medya/" + asset.key, siteUrl()).href
                      : undefined,
                  }).replace(/</g, "\\u003c"),
                }}
              />
              <time dateTime={(item.publishAt || item.createdAt).toISOString()}>
                {dateTime(item.publishAt || item.createdAt)}
              </time>
              <Lightbox images={item.backNewsImageNewsId.map((x) => x.media)} />
              <div className="actions">
                {item.backNewsTagNewsId
                  .filter((x) => isVisible(x.tag))
                  .map((x) => (
                    <span className="chip" key={x.id}>
                      {x.tag.title}
                    </span>
                  ))}
                <a
                  className="text-link"
                  href={
                    "https://www.facebook.com/sharer/sharer.php?u=" +
                    encodeURIComponent(canonical)
                  }
                  rel="noopener noreferrer"
                >
                  Facebook’ta paylaş
                </a>
                <a
                  className="text-link"
                  href={
                    "https://x.com/intent/tweet?url=" +
                    encodeURIComponent(canonical)
                  }
                  rel="noopener noreferrer"
                >
                  X’te paylaş
                </a>
              </div>
              {related.length > 0 && (
                <>
                  <h2>İlgili haberler</h2>
                  <div className="card-grid">
                    {related.map((a) => (
                      <ArticleCard
                        key={a.id}
                        title={a.title}
                        asset={a.cover}
                        href={"/haberler/" + a.slug}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </article>
      </Shell>
    );
  }

  if (!Object.hasOwn(titles, section)) notFound();
  const title = titles[section];
  const q = param(query.q).trim();
  const scope = visible();
  const page = Math.max(1, Math.min(500, parseInt(param(query.p), 10) || 1));
  const paginate = { skip: (page - 1) * resultsLimit, take: resultsLimit };
  const category = param(query.kategori);
  const season = param(query.sezon);
  const competition = param(query.turnuva);
  function pages(total: number) {
    const search = new URLSearchParams();
    for (const k of ["q", "kategori", "sezon", "turnuva", "ay"]) {
      const val = param(query[k]);
      if (val) search.set(k, val);
    }
    const target = (n: number) => {
      const next = new URLSearchParams(search);
      next.set("p", String(n));
      return "?" + next.toString();
    };
    return (
      <div className="actions">
        {page > 1 && (
          <Link className="text-link" href={target(page - 1)}>
            Önceki sayfa
          </Link>
        )}
        {page * resultsLimit < total && (
          <Link className="text-link" href={target(page + 1)}>
            Sonraki sayfa
          </Link>
        )}
      </div>
    );
  }
  if (section === "haberler") {
    const where = {
      ...scope,
      ...(q ? { title: { contains: q } } : {}),
      ...(category ? { category: { ...scope, slug: category } } : {}),
    };
    const [articles, total, categories] = await Promise.all([
      db.news.findMany({
        where,
        include: { cover: true, category: true },
        orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
        ...paginate,
      }),
      db.news.count({ where }),
      db.category.findMany({
        where: { ...scope, kind: "NEWS" },
        orderBy: { position: "asc" },
        take: 50,
      }),
    ]);
    return (
      <Shell title={title}>
        <form className="filters">
          <label>
            Haber ara
            <input name="q" type="search" defaultValue={q} />
          </label>
          <label>
            Kategori
            <select name="kategori" defaultValue={category}>
              <option value="">Tüm kategoriler</option>
              {categories.map((x) => (
                <option key={x.id} value={x.slug}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
          <button className="button">Filtrele</button>
        </form>
        {articles.length ? (
          <div className="card-grid">
            {articles.map((a) => (
              <ArticleCard
                key={a.id}
                title={a.title}
                summary={a.summary}
                asset={a.cover}
                href={"/haberler/" + a.slug}
                label={
                  a.category && isVisible(a.category)
                    ? a.category.title
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <Empty />
        )}
        {pages(total)}
      </Shell>
    );
  }
  if (["a-takim", "altyapi"].includes(section)) {
    const seasons = await seasonOptions();
    const chosen = season || seasons[0]?.id;
    const teams = await db.team.findMany({
      where: { ...scope, kind: section === "altyapi" ? "YOUTH" : "SENIOR" },
      include: {
        backTeamSeasonTeamId: {
          where: { seasonId: chosen, season: scope },
          include: {
            backPlayerSeasonTeamSeasonId: {
              where: { visible: true, player: scope },
              include: { player: { include: { photo: true } } },
              orderBy: { shirt: "asc" },
            },
          },
        },
      },
      orderBy: { position: "asc" },
      take: 40,
    });
    return (
      <Shell title={title}>
        {seasons.length > 0 && (
          <form className="filters">
            <label>
              Sezon
              <select name="sezon" defaultValue={chosen}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="button">Göster</button>
          </form>
        )}
        {teams.length ? (
          teams.map((team) => (
            <section key={team.id} className="stack">
              <h2>{team.title}</h2>
              <p>{team.summary}</p>
              {team.backTeamSeasonTeamId.flatMap(
                (t) => t.backPlayerSeasonTeamSeasonId,
              ).length ? (
                <div className="card-grid">
                  {team.backTeamSeasonTeamId
                    .flatMap((t) => t.backPlayerSeasonTeamSeasonId)
                    .map((a) => (
                      <ArticleCard
                        key={a.id}
                        title={a.player.title}
                        asset={a.player.photo}
                        label={a.shirt + " · " + a.player.positionName}
                        href={"/futbolcular/" + a.player.slug}
                      />
                    ))}
                </div>
              ) : (
                <Empty>Bu sezon için kadro yayımlanmadı.</Empty>
              )}
            </section>
          ))
        ) : (
          <Empty>Henüz takım bilgisi yayımlanmadı.</Empty>
        )}
        {section === "a-takim" && (
          <Link href="/teknik-ekip" className="text-link">
            Teknik ekip
          </Link>
        )}
      </Shell>
    );
  }
  if (section === "teknik-ekip") {
    const staff = await db.staff.findMany({
      where: scope,
      include: { photo: true },
      orderBy: { position: "asc" },
      take: 100,
    });
    return (
      <Shell title={title}>
        {staff.length ? (
          <div className="card-grid">
            {staff.map((x) => (
              <article key={x.id} className="panel stack">
                <Photo asset={x.photo} />
                <p>{x.roleName}</p>
                <h2>{x.title}</h2>
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: cleanRichText(x.body) }}
                />
              </article>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Shell>
    );
  }
  if (
    ["fikstur", "mac-sonuclari", "mac-merkezi", "puan-durumu"].includes(section)
  ) {
    const [seasons, competitions, { theme, media }] = await Promise.all([
      seasonOptions(),
      competitionOptions(season || undefined),
      themeSettings(),
    ]);
    const logo = media.find((a) => a.id === theme.logoId);
    const month = param(query.ay);
    const hasMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
    const monthStart = hasMonth ? new Date(month + "-01T00:00:00+03:00") : null;
    const monthParts = month.split("-").map(Number);
    const monthEnd = hasMonth
      ? new Date(Date.UTC(monthParts[0], monthParts[1], 1) - 10800000)
      : null;
    const where = {
      ...matchVisible(),
      ...(season
        ? { teamSeason: { seasonId: season, team: scope, season: scope } }
        : {}),
      ...(competition ? { competitionSeasonId: competition } : {}),
      ...(section === "mac-sonuclari" ? { matchState: { in: finished } } : {}),
      ...(monthStart && monthEnd
        ? { kickoff: { gte: monthStart, lt: monthEnd } }
        : {}),
    };
    const matchList =
      section === "puan-durumu"
        ? []
        : await db.match.findMany({
            where,
            include: matchInclude,
            orderBy: { kickoff: section === "fikstur" ? "asc" : "desc" },
            ...paginate,
          });
    const table =
      section === "puan-durumu"
        ? await tableData(competition || competitions[0]?.id || "missing")
        : null;
    const total = table ? 0 : await db.match.count({ where });
    return (
      <Shell title={title}>
        <div className="actions">
          {[
            ["Fikstür", "/fikstur"],
            ["Maç Sonuçları", "/mac-sonuclari"],
            ["Puan Durumu", "/puan-durumu"],
          ]
            .filter((x) => x[1] !== "/" + section)
            .map((x) => (
              <Link key={x[1]} className="text-link" href={x[1]}>
                {x[0]}
              </Link>
            ))}
        </div>
        <form className="filters">
          <label>
            Sezon
            <select name="sezon" defaultValue={season}>
              <option value="">Tüm sezonlar</option>
              {seasons.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Turnuva
            <select name="turnuva" defaultValue={competition}>
              <option value="">Turnuva seçin</option>
              {competitions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.competition.title} · {x.season.title}
                </option>
              ))}
            </select>
          </label>
          {!table && (
            <label>
              Ay
              <input type="month" name="ay" defaultValue={month} />
            </label>
          )}
          <button className="button">Göster</button>
        </form>
        {section === "mac-merkezi" && <MatchRefresh />}
        {table ? (
          <Standings {...table} />
        ) : matchList.length ? (
          <div className="grid-match">
            {matchList.map((m) => (
              <MatchCard key={m.id} match={m} logo={logo} />
            ))}
          </div>
        ) : (
          <Empty>Henüz maç bilgisi yayımlanmadı.</Empty>
        )}
        {pages(total)}
      </Shell>
    );
  }
  if (section === "ara") {
    const where = { ...scope, title: { contains: q } };
    const [news, pages, players, announcements] = q
      ? await Promise.all([
          db.news.findMany({ where, take: 20 }),
          db.page.findMany({ where, take: 20 }),
          db.player.findMany({ where, take: 20 }),
          db.announcement.findMany({ where, take: 20 }),
        ])
      : [[], [], [], []];
    const items = [
      ...news.map((x) => ({ ...x, path: "/haberler/" })),
      ...pages.map((x) => ({ ...x, path: "/kurumsal/" })),
      ...players.map((x) => ({ ...x, path: "/futbolcular/" })),
      ...announcements.map((x) => ({ ...x, path: "/duyurular/" })),
    ];
    return (
      <Shell title={title}>
        <SearchField value={q} />
        {q &&
          (!items.length ? (
            <Empty>Aramanıza uygun sonuç bulunamadı.</Empty>
          ) : (
            <ul className="link-list">
              {items.map((x) => (
                <li key={x.id}>
                  <Link href={x.path + x.slug}>{x.title}</Link>
                </li>
              ))}
            </ul>
          ))}
      </Shell>
    );
  }
  if (section === "sponsorlar") {
    const items = await db.sponsor.findMany({
      where: { ...scope, placement: { in: ["BOTH", "PAGE"] } },
      include: { category: true, logo: true },
      orderBy: { position: "asc" },
      take: 100,
    });
    const groupTitle = (item: (typeof items)[number]) =>
      item.category && isVisible(item.category)
        ? item.category.title
        : "Sponsorlarımız";
    const groups = [...new Set(items.map(groupTitle))];
    return (
      <Shell title={title}>
        {groups.length ? (
          groups.map((group) => (
            <section key={group} className="stack">
              <h2>{group}</h2>
              <div className="sponsor-grid">
                {items
                  .filter((x) => groupTitle(x) === group)
                  .map((x) => (
                    <article className="panel" key={x.id}>
                      <Photo asset={x.logo} />
                      {x.url ? (
                        <a rel="sponsored noopener noreferrer" href={x.url}>
                          {x.title}
                        </a>
                      ) : (
                        <strong>{x.title}</strong>
                      )}
                    </article>
                  ))}
              </div>
            </section>
          ))
        ) : (
          <Empty />
        )}
      </Shell>
    );
  }
  if (section === "videolar") {
    const videos = await db.video.findMany({
      where: scope,
      include: { poster: true },
      orderBy: { position: "asc" },
      take: 24,
    });
    return (
      <Shell title={title}>
        {videos.length ? (
          <div className="card-grid">
            {videos.map((x) => (
              <article key={x.id} className="panel stack">
                <h2>{x.title}</h2>
                <p>{x.summary}</p>
                {youtubeId(x.url) && (
                  <details>
                    <summary>Videoyu aç</summary>
                    <iframe
                      title={x.title}
                      className="video"
                      src={
                        "https://www.youtube-nocookie.com/embed/" +
                        youtubeId(x.url)
                      }
                      allow="fullscreen"
                      allowFullScreen
                      loading="lazy"
                    />
                  </details>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Shell>
    );
  }
  const [items, total] = await (section === "galeri"
    ? Promise.all([
        db.album.findMany({
          where: scope,
          include: { cover: true },
          orderBy: { position: "asc" },
          ...paginate,
        }),
        db.album.count({ where: scope }),
      ])
    : section === "duyurular"
      ? Promise.all([
          db.announcement.findMany({
            where: scope,
            orderBy: { position: "asc" },
            ...paginate,
          }),
          db.announcement.count({ where: scope }),
        ])
      : Promise.all([
          db.page.findMany({
            where: { ...scope, slug: { notIn: ["gizlilik", "kvkk"] } },
            include: contentWithCover,
            orderBy: { position: "asc" },
            ...paginate,
          }),
          db.page.count({
            where: { ...scope, slug: { notIn: ["gizlilik", "kvkk"] } },
          }),
        ]));
  const base =
    section === "kulup" || section === "kurumsal"
      ? "/kurumsal/"
      : "/" + section + "/";
  return (
    <Shell title={title}>
      {items.length ? (
        <div className="card-grid">
          {items.map((x) => (
            <ArticleCard
              key={x.id}
              title={x.title}
              summary={x.summary}
              asset={"cover" in x ? x.cover : null}
              href={base + x.slug}
            />
          ))}
        </div>
      ) : (
        <Empty />
      )}
      {pages(total)}
    </Shell>
  );
}
