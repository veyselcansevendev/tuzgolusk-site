import { actor, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { catalog } from "@/lib/catalog";
import { delegate } from "@/lib/cms";
import { csvCell } from "@/lib/csv";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module: key } = await params;
  const user = await actor();
  if (
    !Object.hasOwn(catalog, key) ||
    !can(user, key, "view") ||
    !can(user, key, "export")
  )
    return new Response(null, { status: 403 });
  const schemaModule = catalog[key];
  const fields = [
    "id",
    ...(schemaModule.content ? ["title", "slug", "status", "position"] : []),
    ...schemaModule.fields
      .filter(
        (f) => !["long", "rich", "media", "ref"].includes(f.kind || "text"),
      )
      .map((f) => f.name),
  ];
  const rows = await delegate(db, schemaModule.model).findMany({
    where: schemaModule.content ? { deletedAt: null } : {},
    orderBy: { id: "asc" },
    take: 5000,
  });
  const csv =
    "\uFEFF" +
    [
      fields.map(csvCell).join(","),
      ...rows.map((row) =>
        fields.map((field) => csvCell(row[field])).join(","),
      ),
    ].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + key + '.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
