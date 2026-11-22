import { db } from "@/lib/db";
import { hashPassword } from "@/lib/credentials";

if (
  !process.env.ESKIL_E2E_DIR ||
  !process.env.DATABASE_URL?.startsWith(
    "file:" + process.env.ESKIL_E2E_DIR + "/",
  )
)
  throw new Error("Test fikstürü için ayrı veri dizini gerekli.");
export const fixturePassword = "Yalnızca-Yerel-Test-2026!";
export const superEmail = "admin@example.test";
export const editorEmail = "editor@example.test";
export const footballEmail = "football@example.test";
const published = { status: "PUBLISHED" };
const passwordHash = await hashPassword(fixturePassword);
try {
  await db.$transaction(async (tx) => {
    for (const [email, key, name] of [
      [superEmail, "super", "Test Yönetici"],
      [editorEmail, "editor", "Test Editör"],
      [footballEmail, "football", "Test Futbol"],
      ["limit@example.test", "editor", "Test Limit"],
    ]) {
      const role = await tx.role.findUniqueOrThrow({ where: { key } });
      await tx.user.upsert({
        where: { email },
        create: { email, name, passwordHash, roleId: role.id },
        update: {},
      });
    }
    const season = await tx.season.create({
      data: {
        ...published,
        slug: "test-sezon",
        title: "Test sezonu",
        startsAt: new Date("2026-08-01"),
        endsAt: new Date("2027-06-30"),
        current: true,
      },
    });
    const team = await tx.team.create({
      data: {
        ...published,
        slug: "test-takim",
        title: "Test A Takım",
        summary: "Yalnızca test kaydı.",
      },
    });
    const opponent = await tx.opponent.create({
      data: { ...published, slug: "test-rakip", title: "Test FK" },
    });
    const teamSeason = await tx.teamSeason.create({
      data: { teamId: team.id, seasonId: season.id },
    });
    const competition = await tx.competition.create({
      data: { ...published, slug: "test-lig", title: "Test Ligi" },
    });
    const competitionSeason = await tx.competitionSeason.create({
      data: { competitionId: competition.id, seasonId: season.id },
    });
    await tx.match.create({
      data: {
        ...published,
        slug: "test-mac",
        title: "Test fikstür maçı",
        teamSeasonId: teamSeason.id,
        opponentId: opponent.id,
        competitionSeasonId: competitionSeason.id,
        kickoff: new Date("2026-12-01T15:00:00Z"),
      },
    });
    const publishedNews = await tx.news.create({
      data: {
        ...published,
        title: "Yetki testi yayımdaki haber",
        slug: "yetki-testi-yayindaki-haber",
        summary: "Yayın yetkisi testi.",
        body: "<p>Yayın yetkisi testi.</p>",
      },
    });
    await tx.news.create({
      data: {
        title: "Yetki testi taslak haber",
        slug: "yetki-testi-taslak-haber",
        summary: "Taslak testi.",
        body: "<p>Taslak testi.</p>",
      },
    });
    const tag = await tx.tag.create({
      data: { ...published, title: "Yayın etiketi", slug: "yayin-etiketi" },
    });
    await tx.newsTag.create({
      data: { newsId: publishedNews.id, tagId: tag.id },
    });
  });
} finally {
  await db.$disconnect();
}
