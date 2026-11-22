import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { calculateStandings } from "@/lib/football";
import { cleanRichText, safeUrl, visible, youtubeId } from "@/lib/content";
import { normalizeWebp, webpError } from "@/lib/media";
import { canvasSchema, initialLayer } from "@/lib/design-model";
import { resizeCanvas, containsPoint } from "@/lib/design-render";
import { hashPassword, verifyPassword } from "@/lib/credentials";
import { csvCell } from "@/lib/csv";
import { monthBounds } from "@/lib/social";

describe("İçerik ve güvenlik", () => {
  it("zengin metni güvenli bağlantılar ve WebP ile sınırlar", () => {
    const media = "/medya/" + "a".repeat(48) + ".webp";
    const source =
      '<p>Türkçe</p><a href="https://tuzgolusk.com">Site</a><img src="' +
      media +
      '" alt="Logo"><img src="https://elsewhere.test/a.webp"><iframe src="https://elsewhere.test"></iframe>';
    const output = cleanRichText(source);
    expect(output).toContain(media);
    expect(output).toContain("Türkçe");
    expect(output).not.toContain("elsewhere.test");
    expect(safeUrl.safeParse("//external.test").success).toBe(false);
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      youtubeId("https://www.youtube.com.example.test/watch?v=dQw4w9WgXcQ"),
    ).toBeNull();
  });
  it("yayın penceresini ve CSV hücresini hazırlar", () => {
    const now = new Date("2026-11-22T12:00:00Z");
    expect(visible(now).OR[1]).toEqual({
      status: "SCHEDULED",
      publishAt: { lte: now },
    });
    expect(csvCell('  =1+"2"')).toBe('"\'  =1+""2"""');
  });
  it("parolayı doğru doğrular", async () => {
    const hash = await hashPassword("örnek-Parola-uzun-12");
    expect(await verifyPassword("örnek-Parola-uzun-12", hash)).toBe(true);
    expect(await verifyPassword("başka", hash)).toBe(false);
  });
});
describe("WebP", () => {
  const image = () =>
    sharp({
      create: {
        width: 900,
        height: 500,
        channels: 4,
        background: { r: 70, g: 80, b: 90, alpha: 0.55 },
      },
    });
  it("orijinal ve varyantı WebP olarak, şeffaflıkla üretir", async () => {
    const blob = await image().webp().toBuffer();
    const result = await normalizeWebp(
      new File([new Uint8Array(blob)], "logo.webp", { type: "image/webp" }),
    );
    expect(result.width).toBe(900);
    expect((await sharp(result.original).metadata()).hasAlpha).toBe(true);
    expect(await sharp(result.small!).metadata()).toMatchObject({
      format: "webp",
      width: 840,
    });
  });
  it("uzantı, MIME ve sahte veya bozuk dosyayı reddeder", async () => {
    const png = new Uint8Array(await image().png().toBuffer());
    const webp = new Uint8Array(await image().webp().toBuffer());
    for (const [name, type] of [
      ["test.png", "image/png"],
      ["test.jpeg", "image/jpeg"],
      ["test.gif", "image/gif"],
      ["test.svg", "image/svg+xml"],
      ["test.avif", "image/avif"],
      ["test.heic", "image/heic"],
      ["test.webp", "image/png"],
    ]) {
      await expect(
        normalizeWebp(new File([webp], name, { type })),
      ).rejects.toThrow(webpError);
    }
    await expect(
      normalizeWebp(new File([png], "test.webp", { type: "image/webp" })),
    ).rejects.toThrow(webpError);
    await expect(
      normalizeWebp(
        new File([webp.slice(0, 26)], "test.webp", { type: "image/webp" }),
      ),
    ).rejects.toThrow();
  });
});
describe("Futbol, afiş ve takvim", () => {
  it("puan, averaj ve oynanan maçları kaynak kayıtlardan hesaplar", () => {
    const result = calculateStandings(
      [
        { home: "A", away: "B", homeScore: 3, awayScore: 1 },
        { home: "B", away: "C", homeScore: 0, awayScore: 0 },
      ],
      { win: 2, draw: 1, loss: 0 },
    );
    expect(result[0]).toMatchObject({
      teamName: "A",
      points: 2,
      scored: 3,
      conceded: 1,
      won: 1,
    });
    expect(result[1].teamName).toBe("C");
  });
  it("öğeyi orantılı biçimde yeniden boyutlandırır", () => {
    const layer = initialLayer("text", "1");
    const model = {
      width: 1080,
      height: 1350,
      background: "#183020",
      layers: [layer],
    };
    const adapted = resizeCanvas(model, 1080, 1920);
    expect(adapted.layers[0].y - layer.y).toBe(285);
    expect(containsPoint(layer, 90, 110)).toBe(true);
    expect(canvasSchema.safeParse(adapted).success).toBe(true);
  });
  it("ay sınırını İstanbul saatiyle hesaplar", () => {
    const november = monthBounds("2026-11");
    expect(november.start.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(november.days).toBe(30);
  });
});
