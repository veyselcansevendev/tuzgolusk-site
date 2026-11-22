export type Field = {
  name: string;
  label: string;
  kind?:
    | "text"
    | "long"
    | "rich"
    | "int"
    | "date"
    | "bool"
    | "select"
    | "ref"
    | "media"
    | "url"
    | "video";
  required?: boolean;
  default?: string | number | boolean;
  options?: string[];
  ref?: string;
  max?: number;
};
const field = (
  name: string,
  label: string,
  kind: Field["kind"] = "text",
  required = false,
): Field => ({ name, label, kind, required });
const text = field;
const select = (
  name: string,
  label: string,
  options: string[],
  initial = options[0],
): Field => ({
  name,
  label,
  kind: "select",
  options,
  default: initial,
  required: true,
});
const ref = (
  name: string,
  label: string,
  model: string,
  required = false,
): Field => ({ name, label, kind: "ref", ref: model, required });
const img = (name: string, label: string): Field => ({
  name,
  label,
  kind: "media",
  ref: "media",
});
const check = (name: string, label: string, value = false): Field => ({
  name,
  label,
  kind: "bool",
  default: value,
});
const int = (
  name: string,
  label: string,
  required = false,
  initial?: number,
  max = 10000,
): Field => ({ name, label, kind: "int", required, default: initial, max });
const date = (name: string, label: string, required = false) =>
  field(name, label, "date", required);
const summary = text("summary", "Özet", "long", true);
const body = text("body", "İçerik", "rich", true);
const seo = [
  text("seoTitle", "SEO başlığı"),
  text("seoDescription", "SEO açıklaması", "long"),
];
const content = (
  model: string,
  label: string,
  fields: Field[],
  detail?: string,
) => ({ model, label, fields, detail, content: true });
const linked = (
  model: string,
  label: string,
  fields: Field[],
  versioned = false,
) => ({ model, label, fields, versioned, content: false });
export type Module = {
  model: string;
  label: string;
  fields: Field[];
  detail?: string;
  content: boolean;
  versioned?: boolean;
};
export const catalog: Record<string, Module> = {
  haberler: content(
    "news",
    "Haberler",
    [
      summary,
      body,
      ref("categoryId", "Kategori", "category"),
      img("coverId", "Kapak"),
      ref("matchId", "İlgili maç", "match"),
      ref("playerId", "İlgili oyuncu", "player"),
      check("featured", "Manşette göster"),
      ...seo,
    ],
    "/haberler/",
  ),
  kategoriler: content("category", "Kategoriler", [
    select("kind", "Tür", ["NEWS", "ALBUM", "VIDEO", "SPONSOR"]),
  ]),
  etiketler: content("tag", "Haber etiketleri", []),
  "haber-etiketleri": linked("newsTag", "Haber etiket bağlantıları", [
    ref("newsId", "Haber", "news", true),
    ref("tagId", "Etiket", "tag", true),
  ]),
  "haber-fotograflari": linked("newsImage", "Haber fotoğrafları", [
    ref("newsId", "Haber", "news", true),
    img("mediaId", "Fotoğraf"),
    int("position", "Sıra", true, 0),
  ]),
  duyurular: content(
    "announcement",
    "Duyurular",
    [
      summary,
      text("url", "Bağlantı", "url"),
      check("banner", "Duyuru bandında göster"),
    ],
    "/duyurular/",
  ),
  slaytlar: content("slide", "Manşet slaytları", [
    summary,
    img("coverId", "Masaüstü görseli"),
    img("mobileId", "Mobil görsel"),
    text("url", "Bağlantı", "url"),
    text("cta", "Buton metni"),
    text("video", "YouTube bağlantısı", "video"),
  ]),
  sayfalar: content(
    "page",
    "Kurumsal sayfalar",
    [summary, body, img("coverId", "Kapak"), ...seo],
    "/kurumsal/",
  ),
  menuler: content("navigation", "Menü ve footer", [
    text("url", "Bağlantı", "url", true),
    select("area", "Alan", ["HEADER", "FOOTER"]),
    ref("parentId", "Üst menü", "navigation"),
    check("newWindow", "Yeni sekmede aç"),
  ]),
  takimlar: content("team", "Takımlar ve altyapı", [
    summary,
    select("kind", "Tür", ["SENIOR", "YOUTH"]),
    img("logoId", "Logo"),
  ]),
  sezonlar: content("season", "Sezonlar", [
    date("startsAt", "Başlangıç", true),
    date("endsAt", "Bitiş", true),
    check("current", "Aktif sezon"),
  ]),
  "takim-sezonlari": linked("teamSeason", "Takım sezonları", [
    ref("teamId", "Takım", "team", true),
    ref("seasonId", "Sezon", "season", true),
  ]),
  turnuvalar: content("competition", "Ligler ve turnuvalar", [
    img("logoId", "Logo"),
    int("win", "Galibiyet puanı", true, 3),
    int("draw", "Beraberlik puanı", true, 1),
    int("loss", "Mağlubiyet puanı", true, 0),
  ]),
  "turnuva-sezonlari": linked("competitionSeason", "Turnuva sezonları", [
    ref("competitionId", "Turnuva", "competition", true),
    ref("seasonId", "Sezon", "season", true),
    select("mode", "Puan tablosu modu", ["AUTO", "MANUAL"]),
    text("source", "Kaynak açıklaması"),
  ]),
  rakipler: content("opponent", "Rakipler", [img("logoId", "Logo")]),
  stadyumlar: content("stadium", "Stadyumlar", [
    text("address", "Adres"),
    img("coverId", "Fotoğraf"),
  ]),
  oyuncular: content(
    "player",
    "Oyuncular",
    [
      text("positionName", "Mevki", "text", true),
      img("photoId", "Fotoğraf"),
      body,
      text("nationality", "Uyruk"),
      int("height", "Boy (cm)", false, undefined, 260),
      text("foot", "Tercih edilen ayak"),
    ],
    "/futbolcular/",
  ),
  "oyuncu-sezonlari": linked(
    "playerSeason",
    "Oyuncu sezonları ve istatistikler",
    [
      ref("playerId", "Oyuncu", "player", true),
      ref("teamSeasonId", "Takım sezonu", "teamSeason", true),
      int("shirt", "Forma numarası", true, undefined, 99),
      ...[
        "appearances:Maç",
        "goals:Gol",
        "assists:Asist",
        "minutes:Dakika",
        "yellow:Sarı kart",
        "red:Kırmızı kart",
      ].map((pair) => {
        const [k, l] = pair.split(":");
        return int(k, l, true, 0, 100000);
      }),
      check("visible", "Kadroda göster", true),
    ],
    true,
  ),
  "teknik-ekip": content("staff", "Teknik ekip", [
    text("roleName", "Görev", "text", true),
    body,
    img("photoId", "Fotoğraf"),
    ref("teamSeasonId", "Takım sezonu", "teamSeason"),
  ]),
  maclar: content(
    "match",
    "Maçlar",
    [
      ref("teamSeasonId", "Takım sezonu", "teamSeason", true),
      ref("opponentId", "Rakip", "opponent", true),
      ref("competitionSeasonId", "Turnuva sezonu", "competitionSeason"),
      ref("stadiumId", "Stadyum", "stadium"),
      date("kickoff", "Başlama tarihi ve saati", true),
      check("home", "Ev sahibi", true),
      text("round", "Hafta / tur"),
      text("referee", "Hakem"),
      text("broadcast", "Yayın bilgisi"),
      select("matchState", "Maç durumu", [
        "PLANNED",
        "POSTPONED",
        "CANCELLED",
        "LIVE",
        "HALF_TIME",
        "FINISHED",
        "AWARDED",
      ]),
      int("clubScore", "Kulüp skoru", false, undefined, 99),
      int("opponentScore", "Rakip skoru", false, undefined, 99),
      text("notes", "Maç notları", "long"),
      ref("albumId", "Maç albümü", "album"),
    ],
    "/maclar/",
  ),
  "mac-olaylari": linked("matchEvent", "Maç olayları", [
    ref("matchId", "Maç", "match", true),
    int("minute", "Dakika", true, undefined, 160),
    select("type", "Olay", ["GOAL", "YELLOW", "RED", "SUBSTITUTION", "NOTE"]),
    select("side", "Taraf", ["CLUB", "OPPONENT"]),
    ref("playerId", "Oyuncu", "player"),
    text("detail", "Açıklama", "text", true),
  ]),
  "mac-kadrolari": linked("lineup", "Maç kadroları", [
    ref("matchId", "Maç", "match", true),
    ref("playerId", "Oyuncu", "player", true),
    check("starter", "İlk 11", true),
    int("position", "Sıra", true, 0, 99),
  ]),
  "lig-sonuclari": linked("leagueResult", "Diğer lig maçları", [
    ref("competitionSeasonId", "Turnuva sezonu", "competitionSeason", true),
    ref("homeId", "Ev sahibi", "opponent", true),
    ref("awayId", "Deplasman", "opponent", true),
    int("homeScore", "Ev sahibi skoru", true, undefined, 99),
    int("awayScore", "Deplasman skoru", true, undefined, 99),
    text("round", "Hafta / tur", "text", true),
  ]),
  "puan-tablosu": linked("standing", "Manuel puan tablosu", [
    ref("competitionSeasonId", "Turnuva sezonu", "competitionSeason", true),
    text("teamName", "Takım", "text", true),
    ...[
      "rank:Sıra",
      "won:Galibiyet",
      "drawn:Beraberlik",
      "lost:Mağlubiyet",
      "scored:Atılan gol",
      "conceded:Yenilen gol",
      "points:Puan",
    ].map((pair) => {
      const [k, l] = pair.split(":");
      return int(k, l, true);
    }),
  ]),
  albumler: content(
    "album",
    "Fotoğraf albümleri",
    [
      summary,
      img("coverId", "Kapak"),
      ref("categoryId", "Kategori", "category"),
    ],
    "/galeri/",
  ),
  "album-fotograflari": linked("albumImage", "Albüm fotoğrafları", [
    ref("albumId", "Albüm", "album", true),
    img("mediaId", "Fotoğraf"),
    int("position", "Sıra", true, 0),
  ]),
  videolar: content("video", "Videolar", [
    summary,
    text("url", "YouTube bağlantısı", "video", true),
    img("posterId", "Kapak"),
    ref("categoryId", "Kategori", "category"),
  ]),
  sponsorlar: content("sponsor", "Sponsorlar", [
    img("logoId", "Logo"),
    text("url", "Sponsor sitesi", "url"),
    ref("categoryId", "Kategori", "category"),
    select("placement", "Gösterim", ["BOTH", "HOME", "PAGE"]),
  ]),
  "sosyal-hesaplar": content("socialAccount", "Sosyal hesaplar", [
    text("platform", "Platform", "text", true),
    text("url", "Profil bağlantısı", "url", true),
  ]),
};
export const statusNames: Record<string, string> = {
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  SCHEDULED: "Zamanlandı",
  PUBLISHED: "Yayında",
  ARCHIVED: "Arşivde",
  PLANNED: "Planlandı",
  POSTPONED: "Ertelendi",
  CANCELLED: "İptal",
  LIVE: "Oynanıyor",
  HALF_TIME: "Devre arası",
  FINISHED: "Tamamlandı",
  AWARDED: "Hükmen",
  GOAL: "Gol",
  YELLOW: "Sarı kart",
  RED: "Kırmızı kart",
  SUBSTITUTION: "Değişiklik",
  NOTE: "Not",
  CLUB: "Kulüp",
  OPPONENT: "Rakip",
  SENIOR: "A takım",
  YOUTH: "Altyapı",
  HEADER: "Üst menü",
  FOOTER: "Alt menü",
  AUTO: "Hesaplanan",
  MANUAL: "Manuel",
  NEWS: "Haber",
  ALBUM: "Albüm",
  VIDEO: "Video",
  SPONSOR: "Sponsor",
  BOTH: "Ana sayfa ve liste",
  HOME: "Ana sayfa",
  PAGE: "Liste",
};
export const publishStates = [
  "DRAFT",
  "REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];
