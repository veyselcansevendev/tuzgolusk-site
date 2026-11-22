import { readMatch, scoreOf } from "@/lib/match-feed";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") || "";
  if (!/^[a-z0-9-]{1,140}$/.test(slug))
    return new Response(null, { status: 404 });
  const row = await readMatch(slug);
  if (!row) return new Response(null, { status: 404 });
  return Response.json(scoreOf(row), {
    headers: { "Cache-Control": "no-store" },
  });
}
