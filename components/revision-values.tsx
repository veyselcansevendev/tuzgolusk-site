import type { Field } from "@/lib/catalog";
import { statusNames } from "@/lib/catalog";
import type { Row } from "@/lib/cms";
import { dateTime } from "@/lib/format";

export function RevisionValues({
  fields,
  current,
  snapshot,
}: {
  fields: Field[];
  current: Row;
  snapshot: unknown;
}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const prior = snapshot as Record<string, unknown>;
  function display(value: unknown, field: Field) {
    if (value === null || value === undefined || value === "") return "—";
    if (field.kind === "date") return dateTime(String(value));
    if (field.kind === "bool") return value ? "Evet" : "Hayır";
    return statusNames[String(value)] || String(value);
  }
  const rows = fields
    .map((field) => ({
      field,
      before: display(prior[field.name], field),
      after: display(current[field.name], field),
    }))
    .filter((r) => r.before !== r.after);
  if (!rows.length)
    return <p className="muted">Görüntülenen alanlar güncel sürümle aynı.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Alan</th>
            <th>Bu sürüm</th>
            <th>Güncel sürüm</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ field, before, after }) => (
            <tr key={field.name}>
              <th scope="row">{field.label}</th>
              <td>
                <pre className="revision">{before}</pre>
              </td>
              <td>
                <pre className="revision">{after}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
