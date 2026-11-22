# Kabul ve doğrulama

## 22 Kasım 2026 son kontrolü

- Üretim derlemesi ve TypeScript, ESLint, Prettier, 8 birim testi ve 8 Chrome uçtan uca testi geçti. npm denetimi bilinen paket açığı bildirmedi.
- SQLite migration güncel, bütünlük sonucu `ok`, foreign key ihlali yok ve WAL etkin. Test veritabanı Docker başlangıcıyla aynı migration komutuyla sıfırdan kuruldu. Yedek senaryosu kayıt ve WebP varyantlarını yeni dizine geri yükledi.
- Yayından kaldırılan haber görselinin anonim istekte 404 verdiği, yetkili oturumda erişilebildiği ve editörün yayımdaki haber etiketini taslağa taşıyamadığı doğrulandı. Açık maç ekranındaki skor yenilemesi tek güncel skor gösteriyor.
- Canlı DNS hâlâ Squarespace'e işaret ediyor. Apex adresi geçerli TLS ile “Yakında” sayfasını sunuyor. `www` apex'e yönlenmiyor ve canlı `/api/health` JSON yerine Squarespace HTML'i dönüyor. Next.js yayını, Docker Compose/Caddy çalıştırması ve yeniden başlatma sonrası volume kalıcılığı VPS üzerinde doğrulanmalı.

## Yerelde doğrulanan akışlar

| Alan              | Kanıt                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SQLite            | Boş veri dizininde Prisma migration ve seed. Şema farkı yok, `integrity_check` sonucu `ok`, foreign key ihlali yok ve WAL etkin.                                               |
| Giriş ve roller   | İlk Super Admin CLI kurulumu, korumalı yönetim, yetkisiz API erişiminin reddi, futbol rolü, yanlış parola sınırı ve tek kullanımlık davet.                                     |
| İçerik ve WebP    | Gerçek WebP yükleme, MIME ve uzantısı taklit edilen PNG reddi, taslak önizleme, ziyaretçiye 404, yayından sonra görsel varyantı, slug değişiminde HTTP 308 ve sürüm geri alma. |
| Maç               | Yetkili kullanıcının skoru işlemesi, maç sayfası ile skor servisi ve kayıtlı maçlara dayalı puan tablosu.                                                                      |
| Ana sayfa ve SEO  | Telefon menüsü, iframe içinde mobil taslak, blok sırası yayını, uygulama seviyesinde www yönlendirmesinde sorgunun korunması, sitemap ve robots.                               |
| Tasarım ve sosyal | Gerçek fikstür kaydından poster, hikâye ölçüsü, düzenlenebilir katmanların tekrar açılması, PDF ve kalıcı WebP, sosyal taslağa aktarım.                                        |
| Yedek             | Çalışan veritabanından alınan yedek, farklı dizine geri yükleme, SQLite bütünlüğü, oturum sıfırlama ve WebP orijinal/varyant doğrulaması.                                      |

Birim ve Chrome senaryoları `tests/` dizininde. Test kullanıcıları ve test spor kayıtları ayrı geçici SQLite veritabanında. Üretim seed'i rol ve site ayarlarını oluşturur.

Yerel Chrome görsel kontrolünde 1440 px masaüstü ve 390 px telefon genişliklerinde yatay taşma gözlenmedi. Başlangıç içeriğiyle tek ölçümde LCP sırasıyla 156 ms ve 44 ms, CLS her iki görünümde 0 çıktı. Canlı trafiğin performansı ayrıca ölçülmeli.

## Açık kabul maddeleri

| Alan                          | Kalan çalışma                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canlı sunucu                  | Alan adı Squarespace’e bağlı. VPS dağıtımı, uygulamanın TLS sertifikası, otomatik yedek görevi ve yeniden başlatma sonrası kalıcılık [dağıtım rehberine](deployment.md) göre doğrulanmalı.           |
| Kulüp onayı                   | Resmî WebP logo, marka renkleri, sponsor ve spor kayıtları, kurumsal içerikler, yayın izinleri ve onaylı KVKK metni gerekli.                                                                         |
| Gelişmiş CMS ve medya         | Tüm içerik türlerinde otomatik kabul senaryoları, kullanılmayan medya için panelden temizleme ve kırpılmış mobil/masaüstü biçimlerinin örneklerle kontrolü.                                          |
| Futbol ve tasarım             | Maç olaylarında eşzamanlılık ve ağ kopması kabul senaryoları, ileri şablon marka kuralları ve birden fazla ölçü/format için görsel karşılaştırma. PDF çıkışı kanvası tam ölçüde raster olarak gömer. |
| Performans ve erişilebilirlik | Core Web Vitals, kapsamlı klavye denetimi ve Safari/Firefox tarayıcı matrisi.                                                                                                                        |
| Sosyal platformlar            | Manuel paylaşım akışı etkin. Otomatik paylaşım için kulüp hesapları, resmî API erişimi ve platform onayı gerekli.                                                                                    |
