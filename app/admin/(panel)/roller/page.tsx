import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { catalog } from "@/lib/catalog";
import { ActionForm } from "@/components/action-form";
import { saveRole } from "./actions";

const actions = {
  view: "Gör",
  create: "Oluştur",
  update: "Düzenle",
  delete: "Sil",
  publish: "Yayımla",
  approve: "Onayla",
  export: "Dışa aktar",
};
const special = {
  medya: "Medya",
  mesajlar: "Mesajlar",
  "tasarim-studyosu": "Tasarım Stüdyosu",
  "sosyal-medya": "Sosyal Medya Merkezi",
  tema: "Tema",
  "ana-sayfa": "Ana sayfa",
};
export default async function Roles({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const [user, query] = await Promise.all([requireActor(), searchParams]);
  if (user.role.key !== "super") notFound();
  const roles = await db.role.findMany({ orderBy: { name: "asc" } });
  const current = roles.find((x) => x.id === query.id);
  const selected = Array.isArray(current?.permissions)
    ? current.permissions
    : [];
  return (
    <div className="stack">
      <div className="admin-title">
        <h1>Roller ve izinler</h1>
        <Link className="button" href="?new=1">
          Yeni rol
        </Link>
      </div>
      <ul className="panel link-list">
        {roles.map((role) => (
          <li key={role.id}>
            {role.key === "super" ? (
              role.name
            ) : (
              <Link href={"?id=" + role.id}>{role.name}</Link>
            )}
          </li>
        ))}
      </ul>
      {(query.new || current) && current?.key !== "super" && (
        <div className="panel" key={current?.id || "new"}>
          <ActionForm
            label="Rolü kaydet"
            action={saveRole.bind(null, current?.id || null)}
          >
            <label>
              Rol adı
              <input
                name="name"
                defaultValue={current?.name || ""}
                required
                maxLength={100}
              />
            </label>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Modül</th>
                    {Object.values(actions).map((a) => (
                      <th key={a}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...Object.entries(catalog).map(([key, m]) => [
                      key,
                      m.label,
                    ]),
                    ...Object.entries(special),
                  ].map(([key, name]) => (
                    <tr key={key}>
                      <th scope="row">{name}</th>
                      {Object.keys(actions).map((action) => (
                        <td key={action}>
                          <input
                            aria-label={
                              name +
                              " " +
                              actions[action as keyof typeof actions]
                            }
                            type="checkbox"
                            name="permission"
                            value={key + ":" + action}
                            defaultChecked={
                              selected.includes(key + ":" + action) ||
                              selected.includes(key + ":*")
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
