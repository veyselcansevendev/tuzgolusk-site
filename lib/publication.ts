export const visible = (now = new Date()) => ({
  deletedAt: null,
  OR: [
    {
      status: "PUBLISHED",
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    },
    { status: "SCHEDULED", publishAt: { lte: now } },
  ],
  AND: [{ OR: [{ endAt: null }, { endAt: { gt: now } }] }],
});
export type Publication = {
  status: string;
  deletedAt: Date | null;
  publishAt: Date | null;
  endAt: Date | null;
};
export function isVisible(record: Publication, now = new Date()) {
  return (
    !record.deletedAt &&
    (!record.endAt || record.endAt > now) &&
    ((record.status === "PUBLISHED" &&
      (!record.publishAt || record.publishAt <= now)) ||
      (record.status === "SCHEDULED" &&
        record.publishAt !== null &&
        record.publishAt <= now))
  );
}
