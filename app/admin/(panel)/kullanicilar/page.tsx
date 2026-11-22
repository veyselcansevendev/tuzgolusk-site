import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { createInvite, changeUser } from "./actions";

export default async function Users() {
  const user = await requireActor();
  if (user.role.key !== "super") notFound();
  const [users, roles] = await Promise.all([
    db.user.findMany({
      select: { id: true, email: true, name: true, roleId: true, active: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    db.role.findMany({ orderBy: { name: "asc" } }),
  ]);
  const opts = roles.map((role) => (
    <option key={role.id} value={role.id}>
      {role.name}
    </option>
  ));
  return (
    <div className="stack">
      <h1>Kullanıcılar ve davetler</h1>
      <section className="panel stack">
        <h2>Güvenli davet</h2>
        <ActionForm action={createInvite} label="Davet bağlantısı oluştur">
          <label>
            E-posta
            <input name="email" type="email" required />
          </label>
          <label>
            Rol
            <select name="role" required defaultValue="">
              <option value="">Rol seçin</option>
              {opts}
            </select>
          </label>
        </ActionForm>
      </section>
      <section className="panel stack">
        <h2>Kullanıcılar</h2>
        {users.map((item) => (
          <details key={item.id}>
            <summary>
              {item.name} · {item.active ? "Etkin" : "Pasif"}
            </summary>
            <p>{item.email}</p>
            {item.id !== user.id && (
              <ActionForm
                action={changeUser.bind(null, item.id)}
                label="Kullanıcıyı güncelle"
              >
                <label>
                  Rol
                  <select name="role" defaultValue={item.roleId}>
                    {opts}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={item.active}
                  />
                  Etkin hesap
                </label>
              </ActionForm>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}
