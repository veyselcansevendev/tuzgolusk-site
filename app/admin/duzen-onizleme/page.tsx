import { notFound } from "next/navigation";
import { can, requireActor } from "@/lib/auth";
import { homeSettings, themeSettings, themeStyle } from "@/lib/site-settings";
import { Blocks } from "@/components/home-blocks";

export const metadata = {
  title: "Ana sayfa taslak önizlemesi",
  robots: { index: false, follow: false },
};
export default async function DraftFrame() {
  const user = await requireActor();
  if (!can(user, "ana-sayfa", "view")) notFound();
  const [{ draft }, { theme }] = await Promise.all([
    homeSettings(),
    themeSettings(),
  ]);
  return (
    <main
      className={"public-site font-" + theme.font}
      style={themeStyle(theme)}
    >
      <Blocks blocks={draft} />
    </main>
  );
}
