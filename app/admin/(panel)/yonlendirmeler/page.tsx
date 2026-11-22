import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { editRedirect } from "./actions";

export default async function Redirects() {
  const user = await requireActor();
  if (!can(user, "yonlendirmeler", "view")) notFound();
  const sources = await db.redirect.findMany({
    orderBy: { fromPath: "asc" },
    take: 200,
  });
  return (
    <div className="stack">
      <h1>SEO yönlendirmeleri</h1>
      <div className="panel">
        <ActionForm action={editRedirect} label="Yönlendirmeyi uygula">
          <label>
            Eski yol
            <input name="from" placeholder="/haberler/eski" required />
          </label>
          <label>
            Hedef yol
            <input name="to" placeholder="/haberler/yeni" />
          </label>
          <label>
            İşlem
            <select name="mode">
              <option value="upsert">Ekle / güncelle</option>
              <option value="delete">Sil</option>
            </select>
          </label>
        </ActionForm>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kaynak</th>
              <th>Hedef</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((x) => (
              <tr key={x.id}>
                <td>{x.fromPath}</td>
                <td>{x.toPath}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
