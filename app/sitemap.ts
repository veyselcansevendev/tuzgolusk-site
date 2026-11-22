import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { visible } from "@/lib/content";
import { siteUrl } from "@/lib/auth";
import { matchVisible } from "@/lib/football";
import { themeSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (
    process.env.INDEX_PUBLIC_SITE !== "true" ||
    process.env.NODE_ENV !== "production"
  )
    return [];
  if ((await themeSettings()).theme.maintenance) return [];
  const where = visible();
  const [news, players, matches, pages, albums, announcements] =
    await Promise.all([
      db.news.findMany({ where }),
      db.player.findMany({ where }),
      db.match.findMany({ where: matchVisible() }),
      db.page.findMany({ where }),
      db.album.findMany({ where }),
      db.announcement.findMany({ where }),
    ]);
  const entries = (rows: { slug: string; updatedAt: Date }[], prefix: string) =>
    rows.map((x) => ({
      url: new URL(prefix + x.slug, siteUrl()).href,
      lastModified: x.updatedAt,
    }));
  return [
    ...[
      "/",
      "/haberler",
      "/a-takim",
      "/teknik-ekip",
      "/fikstur",
      "/mac-sonuclari",
      "/mac-merkezi",
      "/puan-durumu",
      "/kulup",
      "/altyapi",
      "/galeri",
      "/videolar",
      "/sponsorlar",
      "/duyurular",
      "/iletisim",
    ].map((path) => ({ url: new URL(path, siteUrl()).href })),
    ...entries(news, "/haberler/"),
    ...entries(players, "/futbolcular/"),
    ...entries(matches, "/maclar/"),
    ...entries(
      pages.filter((x) => !["gizlilik", "kvkk"].includes(x.slug)),
      "/kurumsal/",
    ),
    ...entries(
      pages.filter((x) => ["gizlilik", "kvkk"].includes(x.slug)),
      "/",
    ),
    ...entries(albums, "/galeri/"),
    ...entries(announcements, "/duyurular/"),
  ];
}
