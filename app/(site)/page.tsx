import { homeSettings } from "@/lib/site-settings";
import { Blocks } from "@/components/home-blocks";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const { published } = await homeSettings();
  return <Blocks blocks={published} />;
}
