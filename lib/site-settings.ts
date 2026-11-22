import type { CSSProperties } from "react";
import { cache } from "react";
import { z } from "zod";
import { db } from "./db";
import { clubName } from "./format";
import { safeUrl } from "./content";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const asset = z
  .string()
  .regex(/^[a-z0-9]{20,40}$/)
  .or(z.literal(""));
export const themeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  shortName: z.string().trim().min(2).max(65),
  slogan: z.string().trim().max(150),
  primary: color,
  accent: color,
  surface: color,
  text: color,
  primaryText: color,
  font: z.enum(["system", "serif", "condensed"]),
  radius: z.enum(["none", "soft", "rounded"]),
  logoId: asset,
  alternateId: asset,
  ogId: asset,
  heroId: asset,
  faviconId: asset,
  header: z.enum(["light", "dark"]),
  footer: z.enum(["light", "dark"]),
  address: z.string().max(500),
  phone: z
    .string()
    .max(40)
    .regex(/^[+0-9 ()-]*$/),
  email: z.email().or(z.literal("")),
  map: safeUrl.or(z.literal("")),
  description: z.string().max(250),
  footerText: z.string().max(200),
  maintenance: z.boolean(),
  maintenanceText: z.string().max(350),
});
export const defaultTheme: z.infer<typeof themeSchema> = {
  name: clubName,
  shortName: "Eskil Tuzgölü Spor",
  slogan: "",
  primary: "#162128",
  accent: "#cbd6d5",
  surface: "#f3f5f4",
  text: "#18262d",
  primaryText: "#f8faf9",
  font: "system",
  radius: "soft",
  logoId: "",
  alternateId: "",
  ogId: "",
  heroId: "",
  faviconId: "",
  header: "light",
  footer: "dark",
  address: "Eskil, Aksaray",
  phone: "",
  email: "",
  map: "",
  description:
    "Eskil Tuzgölü Belediye Spor resmî web sitesi. Kulüp haberleri, fikstür ve kadro.",
  footerText: "",
  maintenance: false,
  maintenanceText:
    "Web sitemiz için bakım çalışması yürütüyoruz. Lütfen daha sonra tekrar ziyaret edin.",
};
export const blockNames = {
  hero: "Manşet",
  matches: "Maç merkezi",
  news: "Kulüpten haberler",
  announcements: "Duyurular",
  squad: "Takım vitrini",
  standings: "Puan durumu",
  gallery: "Galeri",
  video: "Videolar",
  sponsors: "Sponsorlarımız",
  page: "Kulüp",
  text: "Metin",
  cta: "Bağlantı",
  contact: "İletişim",
};
export const blockSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,60}$/),
  kind: z.enum(
    Object.keys(blockNames) as [
      keyof typeof blockNames,
      ...(keyof typeof blockNames)[],
    ],
  ),
  title: z.string().trim().max(120),
  text: z.string().trim().max(1200),
  url: safeUrl.or(z.literal("")),
  count: z.number().int().min(1).max(24),
  style: z.enum(["plain", "dark", "grid"]),
  visible: z.boolean(),
  source: z.string().max(100),
});
export const layoutSchema = z
  .array(blockSchema)
  .max(30)
  .refine((items) => new Set(items.map((i) => i.id)).size === items.length);
export type HomeBlock = z.infer<typeof blockSchema>;
export const defaultLayout: HomeBlock[] = Object.entries(blockNames)
  .slice(0, 10)
  .map(([kind, title]) => ({
    id: kind,
    kind: kind as HomeBlock["kind"],
    title,
    text: "",
    url: "",
    count: 3,
    style: "plain",
    visible: true,
    source: "",
  }));
export const defaultNav = [
  {
    title: "Haberler",
    url: "/haberler",
    items: [{ title: "Duyurular", url: "/duyurular" }],
  },
  {
    title: "Futbol",
    url: "/a-takim",
    items: [
      { title: "A Takım", url: "/a-takim" },
      { title: "Teknik Ekip", url: "/teknik-ekip" },
      { title: "Altyapı", url: "/altyapi" },
    ],
  },
  {
    title: "Maç Merkezi",
    url: "/mac-merkezi",
    items: [
      { title: "Fikstür", url: "/fikstur" },
      { title: "Sonuçlar", url: "/mac-sonuclari" },
      { title: "Puan Durumu", url: "/puan-durumu" },
    ],
  },
  {
    title: "Kulüp",
    url: "/kulup",
    items: [
      { title: "Sponsorlar", url: "/sponsorlar" },
      { title: "İletişim", url: "/iletisim" },
    ],
  },
  {
    title: "Medya",
    url: "/galeri",
    items: [
      { title: "Galeri", url: "/galeri" },
      { title: "Videolar", url: "/videolar" },
    ],
  },
];
export const themeSettings = cache(async () => {
  const stored = await db.siteSetting.findUnique({ where: { key: "theme" } });
  const data = themeSchema.safeParse(stored?.data);
  const theme = data.success ? data.data : defaultTheme;
  const media = await db.media.findMany({
    where: {
      id: {
        in: [
          theme.logoId,
          theme.alternateId,
          theme.ogId,
          theme.heroId,
          theme.faviconId,
        ],
      },
      isPublic: true,
    },
  });
  return { theme, version: stored?.version || 0, media };
});
export async function homeSettings() {
  const row = await db.homeLayout.findUnique({ where: { key: "home" } });
  return {
    draft: layoutSchema.parse(row?.draft ?? defaultLayout),
    published: layoutSchema.parse(row?.published ?? defaultLayout),
    version: row?.version || 0,
  };
}

export function contrast(first: string, second: string) {
  function luminance(hex: string) {
    return [0.2126, 0.7152, 0.0722].reduce((sum, weight, i) => {
      const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
      return (
        sum + weight * (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      );
    }, 0);
  }
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function themeStyle(theme: typeof defaultTheme): CSSProperties {
  return {
    "--site-primary": theme.primary,
    "--site-primary-text": theme.primaryText,
    "--site-accent": theme.accent,
    "--site-surface": theme.surface,
    "--site-text": theme.text,
    "--site-radius": { none: "0", soft: "8px", rounded: "18px" }[theme.radius],
  } as CSSProperties;
}
