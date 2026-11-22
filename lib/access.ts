const full = (...modules: string[]) => modules.map((module) => module + ":*");
const cms = [
  "haberler",
  "kategoriler",
  "etiketler",
  "duyurular",
  "slaytlar",
  "sayfalar",
  "albumler",
  "album-fotograflari",
  "videolar",
  "sponsorlar",
  "sosyal-hesaplar",
  "haber-fotograflari",
  "haber-etiketleri",
];
const football = [
  "takimlar",
  "sezonlar",
  "takim-sezonlari",
  "turnuvalar",
  "turnuva-sezonlari",
  "rakipler",
  "stadyumlar",
  "oyuncular",
  "oyuncu-sezonlari",
  "teknik-ekip",
  "maclar",
  "mac-olaylari",
  "mac-kadrolari",
  "lig-sonuclari",
  "puan-tablosu",
];
export const roles = [
  { key: "super", name: "Super Admin", permissions: [] },
  {
    key: "admin",
    name: "Genel Yönetici",
    permissions: full(
      ...cms,
      ...football,
      "medya",
      "tema",
      "ana-sayfa",
      "menuler",
      "mesajlar",
      "tasarim-studyosu",
      "sosyal-medya",
    ),
  },
  {
    key: "press",
    name: "Basın ve Medya Sorumlusu",
    permissions: full(...cms, "medya", "sosyal-medya"),
  },
  {
    key: "football",
    name: "Futbol Sorumlusu",
    permissions: [...full(...football), "medya:view"],
  },
  {
    key: "designer",
    name: "Tasarım Sorumlusu",
    permissions: [...full("tasarim-studyosu", "medya"), "sosyal-medya:view"],
  },
  {
    key: "editor",
    name: "İçerik Editörü",
    permissions: cms
      .flatMap((m) => ["view", "create", "update"].map((a) => m + ":" + a))
      .concat("medya:view"),
  },
  {
    key: "viewer",
    name: "Görüntüleyici",
    permissions: [...cms, ...football].map((m) => m + ":view"),
  },
];
