# Yedek ve bakım

`npm run backup` veya `docker compose exec -T app npm run backup` açık SQLite için SQLite backup API'sinden tutarlı anlık görüntü alır. Anlık görüntüdeki medya anahtarlarıyla WebP orijinalleri ve varyantlar aynı pakete kopyalanır. Yedek ve manifest ayrı dizine atomik olarak taşınır. Varsayılan saklama 30 gündür.

Sunucu zamanlayıcısına her gün çalıştırılacak bir görev ekleyin. Örneğin cron girdisini gerçek proje konumuna göre düzenleyin.

```cron
15 3 * * * cd /srv/tuzgolusk && docker compose exec -T app npm run backup
```

Ayrı fiziksel depolamaya şifreli ve erişim kısıtlı kopya alın. Yedekler oturum ve kişisel içerik barındırabilir; geri yükleme oturum, davet ve istek sınırlama kayıtlarını sıfırlar. SQLite ve medyayı canlı klasöre birleştirmek yerine yeni veri dizininde prova yapın.

```sh
npm run restore -- backups/YEDEK_ADI /güvenli/yeni-veri-dizini
sqlite3 /güvenli/yeni-veri-dizini/club.db 'PRAGMA integrity_check; PRAGMA foreign_key_check;'
```

Kurtarma sırasında uygulamayı durdurun. Eski volume'u saklayıp yeni SQLite ve medya konumlarını birlikte yapılandırın. Sağlık kontrolünü, giriş ve medya okumalarını doğrulayıp trafiği açın. Migration öncesi tam yedek oluşturun. Kişisel iletişim kayıtlarının saklama süresini kulüp politikasıyla belirleyin ve mesaj ekranından anonimleştirin. Yedek saklama süresini aynı politikaya göre ayarlayın. Bağımlılık denetimi ve geri yükleme provası düzenli yapılmalıdır.
