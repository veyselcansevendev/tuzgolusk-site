import { InviteForm } from "./form";
export const metadata = {
  title: "Yönetici daveti",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Invite() {
  return (
    <main className="signin">
      <div className="panel stack">
        <h1>Yönetici daveti</h1>
        <InviteForm />
      </div>
    </main>
  );
}
