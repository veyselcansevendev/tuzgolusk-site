import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireActor } from "@/lib/auth";
import { themeSettings } from "@/lib/site-settings";
import { ThemeForm } from "./form";

export default async function Theme({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const query = await searchParams;
  const user = await requireActor();
  if (!can(user, "tema", "view")) notFound();
  const [{ theme, version }, assets] = await Promise.all([
    themeSettings(),
    db.media.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      select: { id: true, key: true, alt: true },
    }),
  ]);
  return (
    <div className="stack">
      <h1>Kimlik ve tema</h1>
      {query.saved && (
        <p className="notice" role="status">
          Tema ve kulüp bilgileri kaydedildi.
        </p>
      )}
      <div className="panel">
        <ThemeForm
          key={version}
          theme={theme}
          version={version}
          assets={assets}
          edit={can(user, "tema", "update")}
          upload={can(user, "medya", "create")}
          superAdmin={user.role.key === "super"}
        />
      </div>
    </div>
  );
}
