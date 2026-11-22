import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { visible } from "@/lib/content";
import { defaultNav, themeSettings, themeStyle } from "@/lib/site-settings";
import { Photo } from "@/components/site";
import { siteUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { theme, media } = await themeSettings();
  const og = media.find((a) => a.id === theme.ogId);
  const icon = media.find((a) => a.id === theme.faviconId);
  return {
    title: { default: theme.name, template: "%s | " + theme.shortName },
    description: theme.description,
    icons: icon ? "/medya/" + icon.key : undefined,
    openGraph: {
      siteName: theme.name,
      locale: "tr_TR",
      images: og ? ["/medya/" + og.key] : [],
    },
  };
}
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ theme, media }, nav, social, banner, initialized] =
    await Promise.all([
      themeSettings(),
      db.navigation.findMany({
        where: visible(),
        orderBy: { position: "asc" },
        take: 100,
      }),
      db.socialAccount.findMany({
        where: visible(),
        orderBy: { position: "asc" },
        take: 12,
      }),
      db.announcement.findFirst({
        where: { ...visible(), banner: true },
        orderBy: { position: "asc" },
      }),
      db.siteSetting.findUnique({ where: { key: "navigation-initialized" } }),
    ]);
  const style = themeStyle(theme);
  if (theme.maintenance)
    return (
      <main className="signin" style={style}>
        <div className="panel">
          <p>{theme.name}</p>
          <h1>Bakım çalışması</h1>
          <p>{theme.maintenanceText}</p>
        </div>
      </main>
    );
  type NavLink = {
    title: string;
    url: string;
    newWindow?: boolean;
    items?: NavLink[];
  };
  function childrenOf(parentId: string | null, depth = 0): NavLink[] {
    return nav
      .filter((i) => i.area === "HEADER" && i.parentId === parentId)
      .map((i) => ({
        ...i,
        items: depth < 5 ? childrenOf(i.id, depth + 1) : [],
      }));
  }
  const headerLinks = initialized ? childrenOf(null) : defaultNav;
  const footerLinks = nav.filter((i) => i.area === "FOOTER");
  const mainLogo = media.find((a) => a.id === theme.logoId);
  const darkLogo = media.find((a) => a.id === theme.alternateId) || mainLogo;
  function renderLink(x: NavLink) {
    return (
      <Link
        href={x.url}
        target={x.newWindow ? "_blank" : undefined}
        rel={x.newWindow ? "noopener noreferrer" : undefined}
      >
        {x.title}
      </Link>
    );
  }
  function renderItems(items: NavLink[]): ReactNode {
    return items.map((x) => (
      <li key={x.title + x.url}>
        {x.items?.length ? (
          <details className="nav-child">
            <summary>{x.title}</summary>
            <ul>
              <li>{renderLink(x)}</li>
              {renderItems(x.items)}
            </ul>
          </details>
        ) : (
          renderLink(x)
        )}
      </li>
    ));
  }
  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: theme.name,
    sport: "Football",
    url: siteUrl().origin,
    location: theme.address,
    logo: mainLogo
      ? new URL("/medya/" + mainLogo.key, siteUrl()).href
      : undefined,
  };
  return (
    <div className={"public-site font-" + theme.font} style={style}>
      <a className="skip-link" href="#main">
        Ana içeriğe geç
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <div className="utility">
        <div className="wrap">
          <span>
            <MapPin size={14} />
            {theme.address}
          </span>
          <div>
            {social.map((x) => (
              <Link key={x.id} href={x.url} rel="noopener noreferrer">
                {x.title}
              </Link>
            ))}
            <Link href="/iletisim">İletişim</Link>
          </div>
        </div>
      </div>
      {banner && (
        <div className="banner">
          {banner.url ? (
            <Link href={banner.url}>{banner.title}</Link>
          ) : (
            banner.title
          )}
        </div>
      )}
      <header
        className={"site-header " + (theme.header === "dark" ? "dark" : "")}
      >
        <div className="wrap masthead">
          <Link href="/" className="wordmark">
            <Photo asset={theme.header === "dark" ? darkLogo : mainLogo} />
            <span>{theme.name}</span>
          </Link>
          <nav className="main-nav" aria-label="Ana menü">
            <ul>{renderItems(headerLinks)}</ul>
          </nav>
          <Link href="/ara" className="icon-link" aria-label="Sitede ara">
            <Search size={21} />
          </Link>
          <details className="mobile-nav">
            <summary>Menü</summary>
            <nav aria-label="Mobil menü">
              <ul>{renderItems(headerLinks)}</ul>
            </nav>
          </details>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer
        className={"site-footer " + (theme.footer === "dark" ? "dark" : "")}
      >
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <Link href="/" className="wordmark">
                <Photo asset={theme.footer === "dark" ? darkLogo : mainLogo} />
                <span>{theme.name}</span>
              </Link>
              <p>{theme.address}</p>
            </div>
            <nav aria-label="Alt menü">
              <ul>
                {footerLinks.map((i) => (
                  <li key={i.id}>{renderLink(i)}</li>
                ))}
              </ul>
            </nav>
            <div className="stack">
              {theme.email && (
                <a href={"mailto:" + theme.email}>{theme.email}</a>
              )}
              {theme.phone && <a href={"tel:" + theme.phone}>{theme.phone}</a>}
              {social.map((x) => (
                <Link key={x.id} href={x.url} rel="noopener noreferrer">
                  {x.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            {theme.footerText ||
              "© " +
                new Intl.DateTimeFormat("tr", {
                  year: "numeric",
                  timeZone: "Europe/Istanbul",
                }).format(new Date()) +
                " " +
                theme.name}
          </div>
        </div>
      </footer>
    </div>
  );
}
