# Mimari

Next.js App Router, TypeScript ve Tailwind ile sunucuda hazırlanan ziyaretçi sayfaları ve Türkçe yönetim paneli. Haber, fikstür, maç merkezi, kadro ve galeri bilgi mimarisi Beşiktaş sitesindeki işlevsel gruplamadan esinlenir. Nötr gri ve kırık beyaz geçici tasarım token'larıdır. Marka varlıkları panelden yüklenir.

SQLite tek uygulama instance'ında Prisma üzerinden erişilir. İlişkisel temel tablolar futbol kimliği, sezon kayıtları, maç ve medya ilişkilerini korur. İçerik servisinin işlem, yetki, denetim kaydı ve sürüm kontrolü ortak çalışır. Ziyaretçi okumaları dinamik olduğundan yayın tarihleri ve değişiklikler yeni dağıtım gerektirmez. Zamanlar UTC, gösterim Europe/Istanbul.

Rotalar ana sayfa, haberler, A takım, altyapı, teknik ekip, fikstür, maç merkezi/sonuçlar, puan durumu, kulüp, kurumsal sayfalar, galeri, videolar, sponsorlar, duyurular, iletişim ve aramayı kapsar. Yönetim /admin, stüdyo /admin/tasarim-studyosu, sosyal merkez /admin/sosyal-medya.

Uygulama sırası veri/migration ve güvenli oturum, içerik ve WebP, futbol, tema ve sayfa düzeni, stüdyo ve sosyal iş akışı, dağıtım ve kabul doğrulaması.
