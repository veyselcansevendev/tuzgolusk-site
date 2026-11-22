# Eskil Tuzgölü Belediye Spor

Kulübün ziyaretçi sitesi, yönetim paneli, afiş editörü ve sosyal içerik takvimi. Next.js App Router, TypeScript, Tailwind CSS, Prisma ve kalıcı SQLite kullanır.

## Yerel kurulum

Node.js 24 LTS ve npm gerekir. Komutları proje kökünde çalıştırın.

```sh
npm ci
cp .env.example .env
```

Yerelde `.env` içindeki `SITE_URL` ve `NEXT_PUBLIC_SITE_URL` değerlerini `http://localhost:3000` yapın.

```sh
npm run db:deploy
npm run db:seed
npm run admin:create
npm run dev
```

`admin:create` e-postayı ve parolayı sorar. Parola aralığı yerel kurulumda 12–256, üretimde 14–256 karakterdir. Parola yazılırken ekranda görünmez. Ziyaretçi sitesi `http://localhost:3000`, yönetim girişi `http://localhost:3000/admin`. Seed yalnızca başlangıç rolleri, tema, navigasyon ve sayfa düzeni kurar. Resmî içerik kulüp tarafından girilir.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright, üretim derlemesini kullanır. Önce `npm run build` çalıştırın. Varsayılan olarak kurulu Chromium'u kullanır. `npx playwright install chromium` ile indirilebilir. Alternatif Chrome uygulama yolu `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ile verilebilir. Testler ayrı geçici veritabanı ve medya dizini oluşturur.

## İşletim

- [Mimari](docs/architecture.md)
- [Dağıtım ve DNS](docs/deployment.md)
- [Yönetici kullanımı](docs/admin-guide.md)
- [Yedekleme, geri yükleme ve güvenlik](docs/backups.md)
- [Kabul ve doğrulama raporu](docs/verification.md)
