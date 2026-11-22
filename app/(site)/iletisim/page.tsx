import Link from "next/link";
import { db } from "@/lib/db";
import { visible } from "@/lib/content";
import { themeSettings } from "@/lib/site-settings";
import { ContactForm } from "./form";

export const metadata = {
  title: "İletişim",
  alternates: { canonical: "/iletisim" },
};
export default async function Contact() {
  const [{ theme }, social, privacy] = await Promise.all([
    themeSettings(),
    db.socialAccount.findMany({
      where: visible(),
      orderBy: { position: "asc" },
    }),
    db.page.findFirst({
      where: { ...visible(), slug: "kvkk" },
      select: { id: true },
    }),
  ]);
  return (
    <>
      <div className="page-intro">
        <div className="wrap">
          <Link href="/">Ana sayfa</Link>
          <h1>İletişim</h1>
        </div>
      </div>
      <div className="wrap page-content grid-match">
        <section className="panel stack">
          <h2>{theme.name}</h2>
          <p>{theme.address}</p>
          {theme.email && <a href={"mailto:" + theme.email}>{theme.email}</a>}
          {theme.phone && <a href={"tel:" + theme.phone}>{theme.phone}</a>}
          {theme.map && (
            <Link href={theme.map} className="text-link">
              Haritada aç
            </Link>
          )}
          {social.map((x) => (
            <Link key={x.id} href={x.url}>
              {x.title}
            </Link>
          ))}
        </section>
        {privacy ? (
          <ContactForm />
        ) : (
          <p className="empty-state">
            İletişim formu, KVKK bilgilendirmesi yayımlandığında açılacaktır.
          </p>
        )}
      </div>
    </>
  );
}
