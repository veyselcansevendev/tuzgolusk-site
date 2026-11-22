import Link from "next/link";
import { CalendarDays, MapPin, Search, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { dateTime, webpUrl } from "@/lib/format";
import { statusNames } from "@/lib/catalog";
import { isVisible, type Publication } from "@/lib/publication";

type Asset = {
  key: string;
  alt: string;
  width?: number;
  height?: number;
  small?: boolean;
};
export function Photo({
  asset,
  className = "",
  hero = false,
}: {
  asset?: Asset | null;
  className?: string;
  hero?: boolean;
}) {
  if (!asset) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- The storage service supplies responsive WebP variants.
    <img
      className={className}
      src={webpUrl(asset.key)}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      loading={hero ? "eager" : "lazy"}
      fetchPriority={hero ? "high" : "auto"}
      decoding="async"
      srcSet={
        asset.small
          ? webpUrl(asset.key) +
            "?small 840w, " +
            webpUrl(asset.key) +
            " " +
            asset.width +
            "w"
          : undefined
      }
      sizes="(max-width: 700px) 100vw, 50vw"
    />
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </header>
  );
}
export const Empty = ({
  children = "Henüz yayımlanmış kayıt bulunmuyor.",
}: {
  children?: ReactNode;
}) => <p className="empty-state">{children}</p>;

type Side = { title: string; logo?: Asset | null };
export type DisplayMatch = {
  slug: string;
  home: boolean;
  teamSeason: { team: Side; season: { title: string } };
  opponent: Side;
  clubScore: number | null;
  opponentScore: number | null;
  kickoff: Date;
  matchState: string;
  stadium?: (Publication & { title: string }) | null;
  competitionSeason?: { competition: Publication & { title: string } } | null;
};
export function MatchCard({
  match,
  logo,
  caption,
  showScore = true,
}: {
  match: DisplayMatch;
  logo?: Asset;
  caption?: string;
  showScore?: boolean;
}) {
  const club = {
    ...match.teamSeason.team,
    logo: match.teamSeason.team.logo || logo,
  };
  const home = match.home ? club : match.opponent;
  const away = match.home ? match.opponent : club;
  const first = match.home ? match.clubScore : match.opponentScore;
  const second = match.home ? match.opponentScore : match.clubScore;
  const competition = match.competitionSeason?.competition;
  return (
    <article className="match-card">
      <div className="match-meta">
        {showScore && <span>{caption || statusNames[match.matchState]}</span>}
        {competition && isVisible(competition) && (
          <span>
            <Trophy size={15} />
            {competition.title}
          </span>
        )}
      </div>
      <div className={showScore ? "scoreboard" : "scoreboard scoreboard-teams"}>
        <div>
          <Photo asset={home.logo} />
          <strong>{home.title}</strong>
        </div>
        {showScore && (
          <b>
            {first === null || second === null ? "–" : first + " : " + second}
          </b>
        )}
        <div>
          <Photo asset={away.logo} />
          <strong>{away.title}</strong>
        </div>
      </div>
      <div className="match-meta">
        <span>
          <CalendarDays size={15} />
          {dateTime(match.kickoff)}
        </span>
        {match.stadium && isVisible(match.stadium) && (
          <span>
            <MapPin size={15} />
            {match.stadium.title}
          </span>
        )}
      </div>
      {showScore && (
        <Link className="text-link" href={"/maclar/" + match.slug}>
          Maç detayı
        </Link>
      )}
    </article>
  );
}

export function ArticleCard({
  title,
  summary,
  asset,
  href,
  label,
}: {
  title: string;
  summary?: string;
  asset?: Asset | null;
  href: string;
  label?: string;
}) {
  return (
    <article className="article-card">
      <Link href={href}>
        {asset && <Photo asset={asset} />}
        <div>
          {label && <p className="eyebrow">{label}</p>}
          <h3>{title}</h3>
          {summary && <p>{summary}</p>}
        </div>
      </Link>
    </article>
  );
}
export function SearchField({
  value = "",
  action = "/ara",
  label = "Sitede ara",
}: {
  value?: string;
  action?: string;
  label?: string;
}) {
  return (
    <form action={action} className="search-box">
      <label>
        <span className="sr-only">{label}</span>
        <input
          placeholder={label}
          name="q"
          type="search"
          maxLength={100}
          defaultValue={value}
        />
      </label>
      <button className="button" aria-label="Ara">
        <Search size={18} />
        <span>Ara</span>
      </button>
    </form>
  );
}

export function Standings({
  rows,
  label,
}: {
  rows: {
    teamName: string;
    rank: number;
    won: number;
    drawn: number;
    lost: number;
    scored: number;
    conceded: number;
    points: number;
  }[];
  label: string;
}) {
  if (!rows.length) return <Empty>Henüz puan durumu verisi yok.</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            {["Sıra", "Takım", "O", "G", "B", "M", "AG", "YG", "AV", "P"].map(
              (x) => (
                <th scope="col" key={x}>
                  {x}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.rank}>
              <td>{x.rank}</td>
              <th scope="row">{x.teamName}</th>
              <td>{x.won + x.drawn + x.lost}</td>
              <td>{x.won}</td>
              <td>{x.drawn}</td>
              <td>{x.lost}</td>
              <td>{x.scored}</td>
              <td>{x.conceded}</td>
              <td>{x.scored - x.conceded}</td>
              <td>
                <strong>{x.points}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
