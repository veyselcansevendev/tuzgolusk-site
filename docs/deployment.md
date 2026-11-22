# tuzgolusk.com dağıtımı

Linux VPS üzerinde Docker Compose, tek Next.js instance ve Caddy kullanılır. SQLite `club_data:/data` içinde `/data/club.db`, WebP dosyaları aynı kalıcı volume üzerindeki `/data/media` dizinindedir. Yedekler ayrı `club_backups` volume'unda tutulur. Sunucusuz geçici disk bu kurulum için uygun değildir.

1. Sunucuda 80/TCP ve 443/TCP portlarını açın. HTTP/3 istenirse 443/UDP portunu da açın.
2. Domain panelinde apex `@` A kaydını VPS IPv4 adresine bağlayın. IPv6 doğru yönlendirilmişse AAAA da ekleyin. `www` CNAME kaydını `tuzgolusk.com` adresine bağlayın.
3. `docker compose up -d --build` komutunu çalıştırın. Caddy geçerli DNS üzerinden TLS sertifikalarını alır ve yeniler.
4. İlk kullanıcıyı `docker compose exec app npm run admin:create` komutuyla oluşturun. Parola yazılırken terminal girdisi gizlenir.
5. Panelden resmî WebP logo, renkler, yetkili iletişim bilgisi, gerçek sezon/lig/kadro, sponsor izinleri ve onaylı KVKK/gizlilik metinlerini girin.
6. TLS ve kontroller tamamlandığında `INDEX_PUBLIC_SITE=true` ile Compose servisini yeniden oluşturun. HSTS'yi doğrulamadan sonra Caddy'nin apex site bloğunda ekleyin. Önce kısa bir max-age ile uygulayın.
7. Aşağıdaki komutlarla 200/308 sonuçlarını, yol ve sorgu korunmasını, sertifika adlarını ve noindex başlıklarını kontrol edin.

```sh
dig +short tuzgolusk.com A
dig +short www.tuzgolusk.com CNAME
curl -fsSI https://tuzgolusk.com/
curl -sSI 'http://tuzgolusk.com/fikstur?sezon=kontrol'
curl -sSI 'https://www.tuzgolusk.com/fikstur?sezon=kontrol'
curl -sSI https://tuzgolusk.com/admin
curl -fsS https://tuzgolusk.com/sitemap.xml
curl -fsS https://tuzgolusk.com/robots.txt
node -e "fetch('https://tuzgolusk.com/api/health').then(async r=>{if(!r.ok||!(r.headers.get('content-type')||'').startsWith('application/json')||(await r.json()).status!=='ok')throw Error('Sağlık kontrolü başarısız');console.log('ok')}).catch(e=>{console.error(e.message);process.exitCode=1})"
openssl s_client -connect tuzgolusk.com:443 -servername tuzgolusk.com </dev/null
```

Bir gerçek WebP yükleyip bir kayıt yayımladıktan sonra `docker compose restart app` çalıştırın ve aynı URL ile kaydın ve görselin sürdüğünü doğrulayın. Volume silen `down -v` komutunu kullanmayın. Caddy arkasında uygulama portu yalnızca iç ağa açıktır. Kendi ters proxy kurulumunuzda `X-Real-IP` başlığını dış istemciden kabul etmeyin.

Yerel SQLite varsayılandır. PostgreSQL'e ileride geçilecekse ayrı şema ve migration geçmişi oluşturun, SQLite verisini tablo bağımlılık sırasına göre doğrulayıp aktarın, kayıt ve medya referanslarını mutabakatla kontrol edin.
