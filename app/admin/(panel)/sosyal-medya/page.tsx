import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor, can } from "@/lib/auth";
import { dateTime, inputDate } from "@/lib/format";
import { monthBounds, platforms, socialStates } from "@/lib/social";
import { visible } from "@/lib/content";
import { matchVisible } from "@/lib/football";
import { SocialForm } from "./form";

export default async function Social({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [user, query] = await Promise.all([requireActor(), searchParams]);
  if (!can(user, "sosyal-medya", "view")) notFound();
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const state =
    query.state && Object.hasOwn(socialStates, query.state)
      ? query.state
      : undefined;
  const platform =
    query.platform && Object.hasOwn(platforms, query.platform)
      ? query.platform
      : undefined;
  const month =
    typeof query.month === "string" &&
    /^20\d\d-(0[1-9]|1[0-2])$/.test(query.month)
      ? query.month
      : inputDate(new Date()).slice(0, 7);
  const { start, end, days, offset } = monthBounds(month);
  const filters = { ...(q ? { title: { contains: q } } : {}), state, platform };
  const [posts, planned, post, assets, news, matches, templates] =
    await Promise.all([
      db.socialPost.findMany({
        where: filters,
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      db.socialPost.findMany({
        where: {
          ...filters,
          isTemplate: false,
          scheduledAt: { gte: start, lt: end },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      typeof query.id === "string"
        ? db.socialPost.findUnique({
            where: { id: query.id },
            include: { backSocialAssetPostId: { include: { media: true } } },
          })
        : null,
      db.media.findMany({
        where: can(user, "medya", "view")
          ? {}
          : { OR: [{ isPublic: true }, { uploaderId: user.id }] },
        select: { id: true, alt: true, key: true, width: true, height: true },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      db.news.findMany({
        where: can(user, "haberler", "view") ? { deletedAt: null } : visible(),
        select: { id: true, title: true },
        take: 100,
      }),
      db.match.findMany({
        where: can(user, "maclar", "view")
          ? { deletedAt: null }
          : matchVisible(),
        select: { id: true, title: true },
        take: 100,
      }),
      db.socialPost.findMany({
        where: { isTemplate: true },
        select: { id: true, title: true, caption: true, hashtags: true },
        take: 80,
      }),
    ]);
  if (query.id && !post) notFound();
  const allAssets = [
    ...new Map(
      [
        ...assets,
        ...(post?.backSocialAssetPostId.map((x) => x.media) ?? []),
      ].map((a) => [a.id, a]),
    ).values(),
  ];
  const selected = post
    ? post.backSocialAssetPostId.map((x) => x.mediaId)
    : assets.some((a) => a.id === query.asset)
      ? [query.asset!]
      : [];
  const create = can(user, "sosyal-medya", "create");
  const update = can(user, "sosyal-medya", "update");
  return (
    <div className="stack">
      <div className="admin-title">
        <h1>Sosyal Medya Merkezi</h1>
        {create && (
          <Link className="button" href="?new=1">
            Yeni taslak
          </Link>
        )}
      </div>
      <p className="notice">
        Manuel yayın akışı etkin. Paylaşım platformdaki kulüp hesabından
        yapılır.
      </p>
      {((query.new && create) || post) && (
        <SocialForm
          key={post?.id || "new"}
          post={
            post
              ? {
                  id: post.id,
                  version: post.version,
                  title: post.title,
                  caption: post.caption,
                  hashtags: post.hashtags,
                  platform: post.platform,
                  state: post.state,
                  scheduledAt: post.scheduledAt
                    ? inputDate(post.scheduledAt)
                    : "",
                  matchId: post.matchId,
                  newsId: post.newsId,
                  isTemplate: post.isTemplate,
                }
              : null
          }
          assets={allAssets}
          selectedIds={selected}
          news={news}
          matches={matches}
          templates={templates}
          edit={
            post
              ? update &&
                (post.ownerId === user.id ||
                  can(user, "sosyal-medya", "approve"))
              : create
          }
          approve={can(user, "sosyal-medya", "approve")}
          publish={can(user, "sosyal-medya", "publish")}
          upload={can(user, "medya", "create")}
        />
      )}
      <form className="filters">
        <label>
          Taslak ara
          <input type="search" name="q" defaultValue={q} />
        </label>
        <label>
          Durum
          <select name="state" defaultValue={state || ""}>
            <option value="">Tümü</option>
            {Object.entries(socialStates).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Platform
          <select name="platform" defaultValue={platform || ""}>
            <option value="">Tümü</option>
            {Object.entries(platforms).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Takvim ayı
          <input name="month" type="month" defaultValue={month} />
        </label>
        <button className="button">Filtrele</button>
      </form>
      <section className="panel stack">
        <h2>İçerik takvimi</h2>
        <div className="table-wrap">
          <div className="calendar-grid">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((x) => (
              <strong key={x}>{x}</strong>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <div key={"offset" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => (
              <div className="calendar-day" key={i}>
                <span>{i + 1}</span>
                {planned
                  .filter(
                    (p) =>
                      Number(inputDate(p.scheduledAt!).slice(8, 10)) === i + 1,
                  )
                  .map((p) => (
                    <Link key={p.id} href={"?id=" + p.id + "&month=" + month}>
                      {p.title}
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="panel stack">
        <h2>Paylaşımlar ve şablonlar</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Platform</th>
                <th>Durum</th>
                <th>Planlanan saat</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={"?id=" + p.id + "&month=" + month}>
                      {p.title}
                      {p.isTemplate ? " · Şablon" : ""}
                    </Link>
                  </td>
                  <td>
                    {platforms[p.platform as keyof typeof platforms]?.label}
                  </td>
                  <td>{socialStates[p.state as keyof typeof socialStates]}</td>
                  <td>{p.scheduledAt ? dateTime(p.scheduledAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!posts.length && <p>İçerik bulunamadı.</p>}
      </section>
    </div>
  );
}
