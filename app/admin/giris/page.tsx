import Link from "next/link";
import { redirect } from "next/navigation";
import { actor } from "@/lib/auth";
import { clubName } from "@/lib/format";
import LoginForm from "./form";

export const metadata = {
  title: "Yönetici girişi",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await actor()) redirect("/admin");
  return (
    <main className="signin">
      <div className="panel stack">
        <Link href="/">{clubName}</Link>
        <h1>Yönetici girişi</h1>
        <LoginForm />
      </div>
    </main>
  );
}
