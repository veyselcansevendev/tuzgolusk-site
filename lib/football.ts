import { visible } from "./content";
export const finished = ["FINISHED", "AWARDED"];
export const matchVisible = () => ({
  ...visible(),
  teamSeason: { team: visible(), season: visible() },
  opponent: visible(),
});
export type Result = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
};
export function calculateStandings(
  matches: Result[],
  points = { win: 3, draw: 1, loss: 0 },
) {
  const tally = new Map<
    string,
    {
      teamName: string;
      won: number;
      drawn: number;
      lost: number;
      scored: number;
      conceded: number;
      points: number;
    }
  >();
  for (const { home, away, homeScore, awayScore } of matches) {
    for (const [team, goals, against] of [
      [home, homeScore, awayScore],
      [away, awayScore, homeScore],
    ] as const) {
      const row = tally.get(team) || {
        teamName: team,
        won: 0,
        drawn: 0,
        lost: 0,
        scored: 0,
        conceded: 0,
        points: 0,
      };
      row.scored += goals;
      row.conceded += against;
      if (goals > against) {
        row.won++;
        row.points += points.win;
      } else if (goals === against) {
        row.drawn++;
        row.points += points.draw;
      } else {
        row.lost++;
        row.points += points.loss;
      }
      tally.set(team, row);
    }
  }
  return [...tally.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.scored - b.conceded - (a.scored - a.conceded) ||
        b.scored - a.scored ||
        a.teamName.localeCompare(b.teamName, "tr"),
    )
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
