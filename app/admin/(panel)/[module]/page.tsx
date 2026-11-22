import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { catalog, publishStates, statusNames } from "@/lib/catalog";
import { delegate, optionsFor, idSchema } from "@/lib/cms";
import { dateTime } from "@/lib/format";
import { DeleteForm, RecordForm } from "@/components/admin-form";
import { RevisionValues } from "@/components/revision-values";
import { GalleryUpload } from "./gallery-upload";
import { BulkForm } from "./bulk-form";
import { RestoreRevision } from "./revision-form";

export default async function Records({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ module: key }, query, user] = await Promise.all([
    params,
    searchParams,
    requireActor(),
  ]);
  if (!Object.hasOwn(catalog, key)) notFound();
  const schemaModule = catalog[key];
  if (!can(user, key, "view")) notFound();
  const repo = delegate(db, schemaModule.model);
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Math.min(1000, parseInt(String(query.p), 10) || 1));
  const bulk =
    schemaModule.content &&
    can(user, key, "publish") &&
    can(user, key, "update");
  const sorts: Record<string, object> = {
    title: { title: "asc" },
    old: { updatedAt: "asc" },
    new: { updatedAt: "desc" },
  };
  const order =
    typeof query.sort === "string" && Object.hasOwn(sorts, query.sort)
      ? query.sort
      : "new";
  const status =
    typeof query.status === "string" &&
    publishStates.some((value) => value === query.status)
      ? query.status
      : "";
  const where = schemaModule.content
    ? {
        deletedAt: null,
        ...(q ? { title: { contains: q } } : {}),
        ...(status ? { status } : {}),
      }
    : {};
  const id = idSchema.safeParse(query.id);
  const record = id.success
    ? repo.findUnique({ where: { id: id.data } })
    : Promise.resolve(null);
  const [rows, count, row, options] = await Promise.all([
    repo.findMany({
      where,
      skip: (page - 1) * 20,
      take: 20,
      orderBy: schemaModule.content ? sorts[order] : { id: "desc" },
    }),
    repo.count({ where }),
    record,
    record.then((row) => optionsFor(schemaModule, user, row)),
  ]);
  if (id.success && (!row || row.deletedAt)) notFound();
  const canEdit = row ? can(user, key, "update") : can(user, key, "create");
  const revisions =
    row && (schemaModule.content || schemaModule.versioned)
      ? await db.revision.findMany({
          where: { module: key, recordId: row.id },
          orderBy: { number: "desc" },
          take: 15,
        })
      : [];
  const rowLabel = (data: (typeof rows)[number]) => {
    if (data.title) return String(data.title);
    return (
      schemaModule.fields
        .slice(0, 2)
        .map((field) => {
          const val = data[field.name];
          return (
            options[field.ref || ""]?.find((x) => x.id === val)?.label ||
            String(val ?? "")
          );
        })
        .join(" / ")
        .trim() || data.id
    );
  };
  return (
    <div className="stack">
      <div className="admin-title">
        <div>
          <h1>{schemaModule.label}</h1>
          <p>{count} kayıt</p>
        </div>
        <div className="actions">
          {can(user, key, "export") && (
            <a className="small-button" href={"/api/admin/csv/" + key}>
              CSV indir
            </a>
          )}
          {can(user, key, "create") && (
            <Link className="button" href={"/admin/" + key + "?new=1"}>
              Yeni kayıt
            </Link>
          )}
        </div>
      </div>
      {query.saved && (
        <p className="notice" role="status">
          İşlem tamamlandı.
        </p>
      )}
      {((query.new && canEdit) || row) && (
        <section className="panel stack" key={row?.id || "new"}>
          <h2>{row ? rowLabel(row) : "Yeni kayıt"}</h2>
          {row && schemaModule.detail && (
            <div className="actions">
              <Link href={"/admin/onizleme/" + key + "/" + row.id}>
                Önizleme
              </Link>
              {row.status === "PUBLISHED" && (
                <Link href={schemaModule.detail + row.slug}>Yayın sayfası</Link>
              )}
            </div>
          )}
          {canEdit && (
            <RecordForm
              moduleKey={key}
              module={schemaModule}
              row={row || undefined}
              options={options}
              canUpload={can(user, "medya", "create")}
              canPublish={can(user, key, "publish")}
            />
          )}
          {key === "albumler" &&
            row &&
            can(user, "album-fotograflari", "create") &&
            can(user, "medya", "create") && <GalleryUpload id={row.id} />}
          {!canEdit && row && (
            <dl>
              {schemaModule.fields.map((f) => (
                <div key={f.name}>
                  <dt>{f.label}</dt>
                  <dd>{String(row[f.name] ?? "—")}</dd>
                </div>
              ))}
            </dl>
          )}
          {revisions.length > 0 && (
            <details>
              <summary>Sürüm geçmişi</summary>
              <div className="stack">
                {revisions.map((x) => (
                  <details key={x.id}>
                    <summary>
                      Sürüm {x.number} · {dateTime(x.createdAt)}
                    </summary>
                    {row && (
                      <RevisionValues
                        current={row}
                        snapshot={x.snapshot}
                        fields={[
                          ...(schemaModule.content
                            ? [
                                { name: "title", label: "Başlık" },
                                { name: "slug", label: "URL adı" },
                                { name: "status", label: "Durum" },
                                {
                                  name: "publishAt",
                                  label: "Yayın başlangıcı",
                                  kind: "date" as const,
                                },
                                {
                                  name: "endAt",
                                  label: "Yayın bitişi",
                                  kind: "date" as const,
                                },
                                { name: "position", label: "Sıra" },
                              ]
                            : []),
                          ...schemaModule.fields,
                        ]}
                      />
                    )}
                    {row &&
                      canEdit &&
                      can(user, key, "publish") &&
                      x.number !== row.version && (
                        <RestoreRevision
                          moduleKey={key}
                          recordId={row.id}
                          revisionId={x.id}
                          version={Number(row.version)}
                        />
                      )}
                  </details>
                ))}
              </div>
            </details>
          )}
          {row && can(user, key, "delete") && (
            <DeleteForm
              moduleKey={key}
              id={row.id}
              version={Number(row.version || 0)}
            />
          )}
        </section>
      )}
      <section className="panel stack">
        {schemaModule.content && (
          <form method="get" className="form-grid">
            <label>
              Kayıt ara
              <input name="q" defaultValue={q} />
            </label>
            <label>
              Durum
              <select aria-label="Durum" name="status" defaultValue={status}>
                <option value="">Tümü</option>
                {["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"].map(
                  (x) => (
                    <option key={x} value={x}>
                      {statusNames[x]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Sıralama
              <select name="sort" defaultValue={order}>
                <option value="new">Son güncellenen</option>
                <option value="old">İlk güncellenen</option>
                <option value="title">Başlık</option>
              </select>
            </label>
            <button className="button">Filtrele</button>
          </form>
        )}
        <BulkForm moduleKey={key} enabled={bulk && rows.length > 0}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {bulk && <th>Seç</th>}
                  <th>Kayıt</th>
                  <th>Durum</th>
                  <th>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {bulk && (
                      <td>
                        <input
                          type="checkbox"
                          name="records"
                          value={r.id + ":" + r.version}
                          aria-label={rowLabel(r) + " kaydını seç"}
                        />
                      </td>
                    )}
                    <td>
                      <Link href={"/admin/" + key + "?id=" + r.id}>
                        {rowLabel(r)}
                      </Link>
                    </td>
                    <td>{statusNames[String(r.status || "")] || "—"}</td>
                    <td>{r.updatedAt ? dateTime(String(r.updatedAt)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="muted">Kayıt bulunamadı.</p>}
          </div>
        </BulkForm>
        <div className="actions">
          {page > 1 && (
            <Link
              href={
                "?" +
                new URLSearchParams({
                  p: String(page - 1),
                  q,
                  status,
                  sort: order,
                })
              }
            >
              Önceki
            </Link>
          )}
          {page * 20 < count && (
            <Link
              href={
                "?" +
                new URLSearchParams({
                  p: String(page + 1),
                  q,
                  status,
                  sort: order,
                })
              }
            >
              Sonraki
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
