import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { Photo } from "@/components/site";
import { MediaUpload } from "./upload";
import { dateTime } from "@/lib/format";

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; p?: string }>;
}) {
  const [user, query] = await Promise.all([requireActor(), searchParams]);
  if (!can(user, "medya", "view")) notFound();
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Math.max(1, Math.min(1000, parseInt(String(query.p), 10) || 1));
  const where = q
    ? { OR: [{ alt: { contains: q } }, { credit: { contains: q } }] }
    : {};
  const [assets, count] = await Promise.all([
    db.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 24,
      take: 24,
      include: { _count: true },
    }),
    db.media.count({ where }),
  ]);
  return (
    <div className="stack">
      <h1>Medya kütüphanesi</h1>
      {can(user, "medya", "create") && (
        <div className="panel">
          <MediaUpload />
        </div>
      )}
      <form className="filters">
        <label>
          Alternatif metin veya kaynak
          <input name="q" defaultValue={q} type="search" />
        </label>
        <button className="button">Ara</button>
      </form>
      <div className="card-grid">
        {assets.map((asset) => (
          <article className="panel stack" key={asset.id}>
            <Photo asset={asset} />
            <strong>{asset.alt}</strong>
            <p>
              {asset.width} × {asset.height} · WebP ·{" "}
              {Math.ceil(asset.bytes / 1024)} KB
            </p>
            <p>
              {asset.credit || "Kaynak belirtilmedi"} ·{" "}
              {dateTime(asset.createdAt)}
            </p>
            <p className="muted">
              {Object.values(asset._count).reduce((a, b) => a + b, 0)} doğrudan
              içerik bağlantısı
            </p>
            <Link className="text-link" href={"/medya/" + asset.key}>
              Görseli aç
            </Link>
          </article>
        ))}
      </div>
      {!assets.length && <p>Medya dosyası bulunamadı.</p>}
      <div className="actions">
        {page > 1 && (
          <Link href={"?" + new URLSearchParams({ q, p: String(page - 1) })}>
            Önceki
          </Link>
        )}
        {page * 24 < count && (
          <Link href={"?" + new URLSearchParams({ q, p: String(page + 1) })}>
            Sonraki
          </Link>
        )}
      </div>
    </div>
  );
}
