import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireActor } from "@/lib/auth";

export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ device?: string }>;
}) {
  const user = await requireActor();
  if (!can(user, "ana-sayfa", "view")) notFound();
  const query = await searchParams;
  const widths: Record<string, number> = {
    mobile: 390,
    tablet: 768,
    desktop: 1440,
  };
  const width = widths[String(query.device)] || 1440;
  return (
    <div className="stack">
      <h1>Ana sayfa taslağı</h1>
      <div className="actions">
        <Link href="?device=desktop">Masaüstü</Link>
        <Link href="?device=tablet">Tablet</Link>
        <Link href="?device=mobile">Telefon</Link>
      </div>
      <div className="table-wrap">
        <iframe
          title="Ana sayfanın taslak önizlemesi"
          src="/admin/duzen-onizleme"
          style={{
            width,
            height: "75vh",
            border: "1px solid #b3c4c4",
            display: "block",
            margin: "auto",
          }}
        />
      </div>
    </div>
  );
}
