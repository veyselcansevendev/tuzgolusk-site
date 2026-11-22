import { db } from "./db";
import { matchVisible } from "./football";
import { matchInclude } from "./cms";
import { isVisible, visible } from "./content";

export async function readMatch(slug: string) {
  return db.match.findFirst({
    where: { ...matchVisible(), slug },
    include: {
      ...matchInclude,
      backMatchEventMatchId: {
        include: { player: true },
        orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
      },
      backLineupMatchId: {
        where: { player: visible() },
        include: { player: true },
        orderBy: { position: "asc" },
      },
    },
  });
}
export function scoreOf(
  match: NonNullable<Awaited<ReturnType<typeof readMatch>>>,
) {
  const now = new Date();
  return {
    state: match.matchState,
    home: match.home ? match.clubScore : match.opponentScore,
    away: match.home ? match.opponentScore : match.clubScore,
    events: match.backMatchEventMatchId.map((e) => ({
      id: e.id,
      minute: e.minute,
      type: e.type,
      detail: e.detail,
      player: e.player && isVisible(e.player, now) ? e.player.title : undefined,
    })),
  };
}
