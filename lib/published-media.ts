import { visible } from "./content";
import { db } from "./db";
import { themeSettings } from "./site-settings";

export async function hasPublishedReference(id: string, key: string) {
  const publicRecord = visible();
  const { media } = await themeSettings();
  if (media.some((item) => item.id === id)) return true;
  const imageSource = 'src="/medya/' + key + '"';
  const asset = await db.media.findFirst({
    where: {
      id,
      OR: [
        { backNewsCoverId: { some: publicRecord } },
        { backPageCoverId: { some: publicRecord } },
        { backSlideCoverId: { some: publicRecord } },
        { backSlideMobileId: { some: publicRecord } },
        { backNewsImageMediaId: { some: { news: publicRecord } } },
        { backAlbumImageMediaId: { some: { album: publicRecord } } },
        { backAlbumCoverId: { some: publicRecord } },
        { backVideoPosterId: { some: publicRecord } },
        { backSponsorLogoId: { some: publicRecord } },
        { backPlayerPhotoId: { some: publicRecord } },
        { backStaffPhotoId: { some: publicRecord } },
        { backTeamLogoId: { some: publicRecord } },
        { backOpponentLogoId: { some: publicRecord } },
        { backStadiumCoverId: { some: publicRecord } },
        { backCompetitionLogoId: { some: publicRecord } },
      ],
    },
    select: { id: true },
  });
  if (asset) return true;
  const body = { ...publicRecord, body: { contains: imageSource } };
  const counts = await Promise.all([
    db.news.count({ where: body }),
    db.page.count({ where: body }),
    db.player.count({ where: body }),
    db.staff.count({ where: body }),
  ]);
  return counts.some(Boolean);
}
