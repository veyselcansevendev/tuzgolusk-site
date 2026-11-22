export const clubName = "Eskil Tuzgölü Belediye Spor";
export const dateTime = (date: string | Date) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(date));
export function inputDate(value: Date) {
  return value
    ? new Date(new Date(value).valueOf() + 10_800_000)
        .toISOString()
        .slice(0, 16)
    : "";
}
export function slugify(value: string) {
  const normalized = value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export const webpUrl = (key: string) => "/medya/" + key;
