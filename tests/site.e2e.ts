import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

const password = "Yalnızca-Yerel-Test-2026!";
const base = "http://127.0.0.1:3417";
async function login(page: Page, email = "admin@example.test") {
  await page.goto("/admin");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(
    page.getByRole("heading", { name: "Yönetim paneli" }),
  ).toBeVisible();
}
async function image(format: "webp" | "png" = "webp") {
  return sharp({
    create: { width: 960, height: 520, channels: 4, background: "#879b9caa" },
  })
    .toFormat(format)
    .toBuffer();
}

test("yönetim koruması, editör rolü ve erişilebilir mobil menü", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/giris$/);
  const forbidden = await page.request.post("/api/medya", {
    headers: { origin: base },
    multipart: {
      alt: "Yetkisiz",
      file: {
        name: "test.webp",
        mimeType: "image/webp",
        buffer: await image(),
      },
    },
  });
  expect(forbidden.status()).toBe(403);
  await login(page, "editor@example.test");
  expect((await page.goto("/admin/roller"))?.status()).toBe(404);
  await page.goto("/admin/haberler?new=1");
  await expect(
    page.getByLabel("Durum").first().getByRole("option", { name: "Yayında" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByText("Menü", { exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobil menü" }),
  ).toBeVisible();
  expect(
    await page.locator("body").evaluate((body) => body.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Eskil Tuzgölü",
  );
});

test("WebP API, taslak, yayın, bağlantı değişimi ve sürüm geri alma", async ({
  page,
  request,
}) => {
  await login(page);
  const webp = await page.request.post("/api/medya", {
    headers: { origin: base },
    multipart: {
      alt: "Kabul testi kapak",
      file: {
        name: "kapak.webp",
        mimeType: "image/webp",
        buffer: await image(),
      },
    },
  });
  expect(webp.status()).toBe(201);
  const asset = await webp.json();
  const imagePath = "/medya/" + asset.key + "?small";
  expect((await request.get(imagePath)).status()).toBe(404);
  const fake = await page.request.post("/api/medya", {
    headers: { origin: base },
    multipart: {
      alt: "Reddedilmesi gereken",
      file: {
        name: "sahte.webp",
        mimeType: "image/webp",
        buffer: await image("png"),
      },
    },
  });
  expect(fake.status()).toBe(422);
  expect((await fake.json()).error).toMatch(/Yalnızca .webp/);
  const cross = await page.request.post("/api/medya", {
    headers: { origin: "https://other.example" },
    multipart: {
      alt: "Reddedilen",
      file: {
        name: "test.webp",
        mimeType: "image/webp",
        buffer: await image(),
      },
    },
  });
  expect(cross.status()).toBe(403);
  await page.goto("/admin/haberler?new=1");
  await page.getByLabel("Başlık", { exact: true }).fill("Kabul testi haberi");
  await page.getByLabel("Özet").fill("SQLite kaydından gelen haber özeti.");
  await page
    .getByRole("textbox", { name: "Zengin metin içeriği" })
    .fill("Kabul testi için zengin içerik.");
  await page.getByLabel("Kapak", { exact: true }).selectOption(asset.id);
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page).toHaveURL(/id=.*saved=1/);
  const edit = page.url();
  expect(
    (await page.request.get("/haberler/kabul-testi-haberi")).status(),
  ).toBe(404);
  await page.getByRole("link", { name: "Önizleme", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kabul testi haberi" }),
  ).toBeVisible();
  await page.goto(edit);
  await page
    .getByLabel("Durum", { exact: true })
    .first()
    .selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("İşlem tamamlandı.")).toBeVisible();
  await page.goto("/haberler/kabul-testi-haberi");
  await expect(
    page.getByRole("heading", { name: "Kabul testi haberi" }),
  ).toBeVisible();
  const media = await request.get(imagePath);
  expect(media.status()).toBe(200);
  expect(media.headers()["cache-control"]).toContain("no-cache");
  expect(media.headers()["content-type"]).toBe("image/webp");
  expect((await sharp(await media.body()).metadata()).width).toBe(840);
  await page.goto(edit);
  await page.getByLabel("URL adı").fill("haber-yeni-yol");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Yayın sayfası" }),
  ).toHaveAttribute("href", "/haberler/haber-yeni-yol");
  const old = await page.request.get("/haberler/kabul-testi-haberi", {
    maxRedirects: 0,
  });
  expect(old.status()).toBe(308);
  await page.getByText("Sürüm geçmişi", { exact: true }).click();
  await page.getByText(/Sürüm 2 · /).click();
  await page
    .getByRole("button", { name: "Bu sürümü geri yükle" })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Yayın sayfası" }),
  ).toHaveAttribute("href", "/haberler/kabul-testi-haberi");
  await page
    .getByLabel("Durum", { exact: true })
    .first()
    .selectOption("ARCHIVED");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("link", { name: "Yayın sayfası" })).toHaveCount(
    0,
  );
  expect((await request.get(imagePath)).status()).toBe(404);
  expect((await page.request.get(imagePath)).status()).toBe(200);
});

test("Futbol sorumlusu skoru işler, veri maç ve puan ekranında görünür", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/api/mac?slug=test-mac", (route) =>
    route.fulfill({
      json: {
        state: "LIVE",
        home: 1,
        away: 0,
        events: [],
      },
    }),
  );
  await page.goto("/maclar/test-mac");
  await expect(page.getByText("Skor bekleniyor")).toBeVisible();
  await page.clock.runFor(15_000);
  await expect(page.getByText("1 : 0", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Skor bekleniyor")).toHaveCount(0);
  await page.unrouteAll();
  await login(page, "football@example.test");
  await page.goto("/admin/maclar");
  await page.getByRole("link", { name: "Test fikstür maçı" }).click();
  await page.getByLabel("Maç durumu").selectOption("FINISHED");
  await page.getByLabel("Kulüp skoru").fill("2");
  await page.getByLabel("Rakip skoru").fill("1");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("İşlem tamamlandı.")).toBeVisible();
  await page.goto("/maclar/test-mac");
  await expect(page.getByText("2 : 1", { exact: true }).first()).toBeVisible();
  expect(
    await (await page.request.get("/api/mac?slug=test-mac")).json(),
  ).toMatchObject({ home: 2, away: 1, state: "FINISHED" });
  await page.goto("/puan-durumu");
  await expect(page.getByText("Sitede kayıtlı maçlara göre")).toBeVisible();
  await expect(page.getByRole("row", { name: /Test A Takım/ })).toBeVisible();
});

test("editör yayındaki haber etiketini taslağa taşıyamaz", async ({
  page,
  request,
}) => {
  await login(page, "editor@example.test");
  await page.goto("/admin/haber-etiketleri");
  await page.getByRole("link", { name: /Yetki testi yayımdaki haber/ }).click();
  await page
    .getByRole("combobox", { name: "Haber", exact: true })
    .selectOption({ label: "Yetki testi taslak haber" });
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    page.getByText(
      "Yayınlanan içeriğin bağlantılarını değiştirme yetkiniz yok.",
    ),
  ).toBeVisible();
  const published = await request.get("/haberler/yetki-testi-yayindaki-haber");
  expect(await published.text()).toContain("Yayın etiketi");
});

test("fikstürden tuval, kalıcı WebP, PDF ve sosyal paylaşım taslağı", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/tasarim-studyosu");
  await page.getByLabel("Fikstür maçı").selectOption({
    label: (await page
      .getByLabel("Fikstür maçı")
      .locator("option")
      .last()
      .textContent())!,
  });
  await page.getByRole("button", { name: "Maç bilgilerini yerleştir" }).click();
  await expect(page.getByLabel("Tasarım adı")).toHaveValue(/Test fikstür maçı/);
  await page
    .getByRole("button", { name: "Hikâye / Reels", exact: true })
    .click();
  await page.getByRole("button", { name: "Tasarımı kaydet" }).click();
  await expect(page).toHaveURL(/id=.*saved=1/);
  const saved = page.url();
  await expect(page.getByLabel("Afiş düzenleme tuvali")).toHaveAttribute(
    "height",
    "1920",
  );
  await expect(
    page.getByRole("button", { name: "Ana metin", exact: true }),
  ).toBeVisible();
  const downloadWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF indir" }).click();
  const pdf = await downloadWait;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const loaded = await PDFDocument.load(await readFile((await pdf.path())!));
  expect(loaded.getPage(0).getSize()).toEqual({ width: 1080, height: 1920 });
  await page.getByRole("button", { name: "WebP arşivine kaydet" }).click();
  await expect(
    page.getByRole("link", { name: "Paylaşım taslağına aktar" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Paylaşım taslağına aktar" }).click();
  await expect(page.getByRole("link", { name: "WebP indir" })).toBeVisible();
  await page.getByLabel("Başlık", { exact: true }).fill("Test paylaşımı");
  await page
    .getByLabel("Açıklama", { exact: true })
    .fill("Maç duyurusu için test açıklaması");
  await page.getByLabel("Hashtag", { exact: true }).fill("#test");
  await page.getByRole("button", { name: "Taslağı kaydet" }).click();
  await expect(page).toHaveURL(/sosyal-medya\?id=/);
  await expect(
    page.getByRole("button", { name: "Metni kopyala" }),
  ).toBeVisible();
  await page.goto(saved);
  await expect(
    page.getByRole("heading", { name: "WebP arşivi" }),
  ).toBeVisible();
});

test("ana sayfa blok sırası ve kanonik yönlendirme", async ({ page }) => {
  await login(page);
  await page.goto("/admin/ana-sayfa/onizleme?device=mobile");
  await expect(
    page
      .frameLocator('iframe[title="Ana sayfanın taslak önizlemesi"]')
      .getByRole("heading", { level: 1 }),
  ).toContainText("Eskil Tuzgölü");
  await page.goto("/admin/ana-sayfa");
  const match = page.locator("fieldset").filter({
    has: page.getByRole("heading", { name: "Maç merkezi", exact: true }),
  });
  await match.getByRole("button", { name: "Aşağı" }).click();
  await page.getByRole("button", { name: "Yayımla", exact: true }).click();
  await expect(page.getByText("Ana sayfa yayımlandı.")).toBeVisible();
  await page.goto("/");
  const headings = await page
    .getByRole("heading", { level: 2 })
    .allTextContents();
  expect(headings.indexOf("Kulüpten haberler")).toBeLessThan(
    headings.indexOf("Maç merkezi"),
  );
  const redirect = await page.request.get("/fikstur?sezon=koru", {
    headers: { host: "www.tuzgolusk.com" },
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe(
    "https://tuzgolusk.com/fikstur?sezon=koru",
  );
  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/maclar/test-mac");
});

test("yanlış parola sınırlaması ve tek kullanımlık davet", async ({
  page,
  browser,
}) => {
  await page.goto("/admin/giris");
  for (let i = 0; i < 8; i++) {
    await page.getByLabel("E-posta").fill("limit@example.test");
    await page.getByLabel("Parola").fill("yanlış parola");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText(/Giriş bilgileri doğrulanamadı/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Giriş yap" })).toBeEnabled();
  }
  await page.getByLabel("E-posta").fill("limit@example.test");
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByRole("button", { name: "Giriş yap" })).toBeEnabled();
  await expect(page).toHaveURL(/\/admin\/giris$/);
  await login(page);
  await page.goto("/admin/kullanicilar");
  await page
    .getByLabel("E-posta", { exact: true })
    .fill("yeni-editor@example.test");
  await page
    .locator('select[name="role"]')
    .first()
    .selectOption({ label: "İçerik Editörü" });
  await page.getByRole("button", { name: "Davet bağlantısı oluştur" }).click();
  const result = page
    .getByRole("alert")
    .filter({ hasText: "Davet bağlantısı" });
  await expect(result).toBeVisible();
  const invite = (await result.textContent())!.match(
    /http:\/\/127\.0\.0\.1:3417\/davet#[a-zA-Z0-9_-]+/,
  )?.[0];
  expect(invite).toBeDefined();
  const visitor = await browser.newPage();
  await visitor.goto(invite!);
  await visitor.getByLabel("Ad soyad").fill("Davetli Editör");
  await visitor.getByLabel("Parola").fill(password);
  await visitor.getByRole("button", { name: "Davetle hesap aç" }).click();
  await expect(
    visitor.getByRole("heading", { name: "Yönetim paneli" }),
  ).toBeVisible();
  await visitor.goto(invite!);
  await visitor.getByLabel("Ad soyad").fill("Tekrar deneme");
  await visitor.getByLabel("Parola").fill(password);
  await visitor.getByRole("button", { name: "Davetle hesap aç" }).click();
  await expect(
    visitor.getByText("Davet geçersiz veya süresi doldu."),
  ).toBeVisible();
  await visitor.close();
});
