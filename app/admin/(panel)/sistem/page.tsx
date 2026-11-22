import { notFound } from "next/navigation";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { dateTime } from "@/lib/format";

const mb = (bytes: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(
    bytes / (1024 * 1024),
  ) + " MB";
export default async function System() {
  const user = await requireActor();
  if (user.role.key !== "super") notFound();
  const location = resolve(
    (process.env.DATABASE_URL || "file:./data/club.db").slice(5),
  );
  const [database, wal, list, media] = await Promise.all([
    stat(location).catch(() => null),
    stat(location + "-wal").catch(() => null),
    db.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.media.aggregate({ _sum: { bytes: true }, _count: true }),
  ]);
  const quota = Number(process.env.MEDIA_QUOTA_MB || 0);
  const mediaBytes = media._sum.bytes || 0;
  return (
    <div className="stack">
      <h1>Sistem ve yedekleme</h1>
      <div className="kpi-grid">
        <div className="panel">
          <strong>{mb((database?.size || 0) + (wal?.size || 0))}</strong>SQLite
          ve WAL
        </div>
        <div className="panel">
          <strong>{mb(mediaBytes)}</strong>
          {media._count} WebP orijinali
        </div>
      </div>
      {quota > 0 && mediaBytes / (quota * 1024 * 1024) >= 0.8 && (
        <p className="notice">
          Orijinal WebP dosyalarının boyutu yapılandırılan kotanın %80’ine
          ulaştı.
        </p>
      )}
      <section className="panel stack">
        <h2>Yedek kayıtları</h2>
        <p>
          Yedekler veritabanı anlık görüntüsünü ve ilişkili WebP dosyalarını
          kapsar. Saklama süresi {process.env.BACKUP_RETENTION_DAYS || "30"}{" "}
          gün.
        </p>
        {list.length ? (
          <ul className="link-list">
            {list.map((x) => (
              <li key={x.id}>
                {dateTime(x.createdAt)} · {mb(x.bytes)} · {x.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>Yedek kaydı yok.</p>
        )}
      </section>
    </div>
  );
}
