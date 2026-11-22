import Link from "next/link";
import { LayoutDashboard, ExternalLink, Bell, Search } from "lucide-react";
import { can, requireActor } from "@/lib/auth";
import { catalog } from "@/lib/catalog";
import { clubName } from "@/lib/format";
import { signOut } from "../giris/actions";

export const metadata = {
  title: { template: "%s | Kulüp Yönetimi", default: "Kulüp Yönetimi" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
const groups = [
  [
    "İçerik",
    "haberler",
    "kategoriler",
    "etiketler",
    "haber-etiketleri",
    "haber-fotograflari",
    "duyurular",
    "sayfalar",
    "slaytlar",
  ],
  [
    "Futbol",
    "maclar",
    "mac-olaylari",
    "mac-kadrolari",
    "takimlar",
    "oyuncular",
    "oyuncu-sezonlari",
    "teknik-ekip",
    "sezonlar",
    "takim-sezonlari",
    "rakipler",
    "stadyumlar",
    "turnuvalar",
    "turnuva-sezonlari",
    "lig-sonuclari",
    "puan-tablosu",
  ],
  [
    "Medya ve iletişim",
    "medya",
    "albumler",
    "album-fotograflari",
    "videolar",
    "sponsorlar",
    "tasarim-studyosu",
    "sosyal-medya",
    "sosyal-hesaplar",
    "mesajlar",
  ],
  [
    "Site ve sistem",
    "ana-sayfa",
    "tema",
    "menuler",
    "yonlendirmeler",
    "kullanicilar",
    "roller",
    "islem-kayitlari",
    "sistem",
  ],
];
const labels: Record<string, string> = {
  medya: "Medya kütüphanesi",
  "tasarim-studyosu": "Tasarım Stüdyosu",
  "sosyal-medya": "Sosyal Medya Merkezi",
  mesajlar: "Gelen mesajlar",
  "ana-sayfa": "Ana sayfa düzenleyici",
  tema: "Kimlik ve tema",
  yonlendirmeler: "SEO yönlendirmeleri",
  kullanicilar: "Kullanıcılar ve davetler",
  roller: "Roller ve izinler",
  "islem-kayitlari": "İşlem kayıtları",
  sistem: "Sistem ve yedekleme",
};
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActor();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="wordmark">
          {clubName}
        </Link>
        <nav aria-label="Yönetim menüsü">
          <Link href="/admin">
            <LayoutDashboard size={18} />
            Panel
          </Link>
          {groups.map(([name, ...keys]) => {
            const links = keys.filter((k) => can(user, k, "view"));
            return (
              links.length > 0 && (
                <details key={name} open={name === "İçerik"}>
                  <summary>{name}</summary>
                  {links.map((k) => (
                    <Link href={"/admin/" + k} key={k}>
                      {catalog[k]?.label || labels[k]}
                    </Link>
                  ))}
                </details>
              )
            );
          })}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <form className="admin-search" action="/admin/ara">
            <label>
              <span className="sr-only">Panelde ara</span>
              <input
                type="search"
                name="q"
                placeholder="Panelde ara"
                maxLength={100}
              />
            </label>
            <button className="small-button" aria-label="Panel kayıtlarını ara">
              <Search size={18} />
            </button>
          </form>
          <div className="actions">
            <Link href="/">
              <ExternalLink size={16} /> Siteyi aç
            </Link>
            {can(user, "mesajlar", "view") && (
              <Link href="/admin/mesajlar" aria-label="Gelen mesajlar">
                <Bell size={18} />
              </Link>
            )}
          </div>
          <div className="actions">
            <span>
              {user.name} · {user.role.name}
            </span>
            <form action={signOut}>
              <button className="small-button">Çıkış yap</button>
            </form>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
