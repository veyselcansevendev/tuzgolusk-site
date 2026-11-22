import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { updateMessage } from "./actions";

const states = {
  NEW: "Yeni",
  READ: "Okundu",
  REPLIED: "Yanıtlandı",
  ARCHIVED: "Arşiv",
  DELETE: "Sil",
};
export default async function Messages({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const [user, query] = await Promise.all([requireActor(), searchParams]);
  if (!can(user, "mesajlar", "view")) notFound();
  const state = ["NEW", "READ", "REPLIED", "ARCHIVED"].includes(
    query.state || "",
  )
    ? query.state
    : undefined;
  const rows = await db.message.findMany({
    where: { deletedAt: null, state },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const edit = can(user, "mesajlar", "update");
  const remove = can(user, "mesajlar", "delete");
  return (
    <div className="stack">
      <h1>Gelen mesajlar</h1>
      <form className="filters">
        <label>
          Durum
          <select name="state" defaultValue={state || ""}>
            <option value="">Tümü</option>
            {Object.entries(states)
              .slice(0, 4)
              .map(([k, l]) => (
                <option value={k} key={k}>
                  {l}
                </option>
              ))}
          </select>
        </label>
        <button className="button">Filtrele</button>
      </form>
      {rows.map((x) => (
        <details className="panel" key={x.id}>
          <summary>
            {x.subject} · {states[x.state as keyof typeof states]} ·{" "}
            {dateTime(x.createdAt)}
          </summary>
          <div className="stack">
            <p>
              {x.name} ·{" "}
              <a className="text-link" href={"mailto:" + x.email}>
                {x.email}
              </a>
            </p>
            <p className="whitespace-pre-wrap">{x.body}</p>
            {(edit || remove) && (
              <ActionForm
                action={updateMessage.bind(null, x.id)}
                label="Durumu güncelle"
              >
                <label>
                  Durum
                  <select name="state" defaultValue={edit ? x.state : "DELETE"}>
                    {Object.entries(states)
                      .filter(([k]) => (k === "DELETE" ? remove : edit))
                      .map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                  </select>
                </label>
                {remove && (
                  <label className="check">
                    <input name="confirm" type="checkbox" />
                    Silme seçilirse kişisel içeriği kaldırmayı onaylıyorum.
                  </label>
                )}
              </ActionForm>
            )}
          </div>
        </details>
      ))}
      {!rows.length && <p>Mesaj yok.</p>}
    </div>
  );
}
