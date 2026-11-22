import { db } from "./db";
import { visible } from "./content";
import { matchVisible, finished, calculateStandings } from "./football";

export const seasonOptions = () =>
  db.season.findMany({
    where: visible(),
    orderBy: [{ current: "desc" }, { startsAt: "desc" }],
    take: 50,
  });
export const competitionOptions = (seasonId?: string) =>
  db.competitionSeason.findMany({
    where: {
      season: visible(),
      competition: visible(),
      ...(seasonId ? { seasonId } : {}),
    },
    include: { competition: true, season: true },
    orderBy: { season: { startsAt: "desc" } },
    take: 80,
  });
export async function tableData(id?: string) {
  const selection = (await competitionOptions()).find(
    (entry) => !id || entry.id === id,
  );
  if (!selection) return { rows: [], label: "" };
  if (selection.mode === "MANUAL")
    return {
      rows: await db.standing.findMany({
        where: { competitionSeasonId: selection.id },
        orderBy: { rank: "asc" },
      }),
      label: selection.source || "Kulüp tarafından girilen tablo",
    };
  const [internal, external] = await Promise.all([
    db.match.findMany({
      where: {
        ...matchVisible(),
        competitionSeasonId: selection.id,
        matchState: { in: finished },
        clubScore: { not: null },
        opponentScore: { not: null },
      },
      include: { teamSeason: { include: { team: true } }, opponent: true },
    }),
    db.leagueResult.findMany({
      where: {
        competitionSeasonId: selection.id,
        home: visible(),
        away: visible(),
      },
      include: { home: true, away: true },
    }),
  ]);
  const results = internal
    .map((m) => ({
      home: m.home ? m.teamSeason.team.title : m.opponent.title,
      away: m.home ? m.opponent.title : m.teamSeason.team.title,
      homeScore: (m.home ? m.clubScore : m.opponentScore)!,
      awayScore: (m.home ? m.opponentScore : m.clubScore)!,
    }))
    .concat(
      external.map((m) => ({
        home: m.home.title,
        away: m.away.title,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
    );
  return {
    rows: calculateStandings(results, selection.competition),
    label: "Sitede kayıtlı maçlara göre",
  };
}
