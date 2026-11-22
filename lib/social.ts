export const platforms = {
  IG_POST: {
    label: "Instagram gönderisi",
    limit: 2200,
    width: 1080,
    height: 1350,
  },
  IG_STORY: {
    label: "Instagram hikâyesi",
    limit: 2200,
    width: 1080,
    height: 1920,
  },
  FACEBOOK: { label: "Facebook", limit: 63206, width: 1200, height: 630 },
  X: { label: "X", limit: 280, width: 1600, height: 900 },
  YOUTUBE: {
    label: "YouTube topluluk",
    limit: 1500,
    width: 1080,
    height: 1080,
  },
};
export const socialStates = {
  DRAFT: "Hazırlandı",
  REVIEW: "Onay bekliyor",
  APPROVED: "Onaylandı",
  POSTED: "Manuel paylaşıldı",
  ARCHIVED: "Arşivlendi",
};
export function monthBounds(month: string) {
  const [year, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1) - 10_800_000),
    end: new Date(Date.UTC(year, m, 1) - 10_800_000),
    days: new Date(Date.UTC(year, m, 0)).getUTCDate(),
    offset: (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7,
  };
}
export function socialPayload(caption: string, hashtags: string) {
  return [caption.trim(), hashtags.trim()].filter(Boolean).join("\n\n");
}
