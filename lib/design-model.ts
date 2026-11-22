import { z } from "zod";

export const designTypes = [
  "Maç günü",
  "Maç sonucu",
  "İlk 11",
  "Gol duyurusu",
  "Transfer",
  "Doğum günü",
  "Antrenman",
  "Taraftar ve deplasman",
  "Sponsor",
  "Kulüp etkinliği",
  "Özel gün ve anma",
  "Taziye",
  "Maç erteleme",
  "Sezon açılışı",
  "Serbest tasarım",
];
export const sizes = [
  ["Instagram gönderi", 1080, 1350],
  ["Instagram kare", 1080, 1080],
  ["Hikâye / Reels", 1080, 1920],
  ["Web banner", 1920, 600],
  ["16:9", 1920, 1080],
] as const;
const color = z.string().regex(/^#[A-Fa-f0-9]{6}$/);
const number = (min: number, max: number) => z.number().min(min).max(max);
export const layerSchema = z
  .object({
    id: z.string().min(1).max(60),
    kind: z.enum(["text", "image", "shape"]),
    name: z.string().max(80),
    text: z.string().max(1500),
    x: number(-4096, 8192),
    y: number(-4096, 8192),
    width: number(1, 4096),
    height: number(1, 4096),
    angle: number(-360, 360),
    color,
    font: z.enum(["system", "serif", "mono"]),
    fontSize: number(8, 400),
    fontWeight: z.enum(["400", "700", "900"]),
    lineHeight: number(0.8, 3),
    align: z.enum(["left", "center", "right"]),
    visible: z.boolean(),
    locked: z.boolean(),
    mediaId: z
      .string()
      .regex(/^[a-z0-9]{20,40}$/)
      .or(z.literal("")),
    fit: z.enum(["contain", "cover"]),
    shape: z.enum(["rect", "circle"]),
    cropX: number(0, 1),
    cropY: number(0, 1),
  })
  .refine(
    (l) => l.kind !== "image" || l.mediaId,
    "Görsel katmanında bir WebP seçin.",
  );
export const canvasSchema = z.object({
  width: number(128, 4096).int(),
  height: number(128, 4096).int(),
  background: color,
  layers: z
    .array(layerSchema)
    .max(48)
    .refine((rows) => new Set(rows.map((x) => x.id)).size === rows.length),
});
export type Layer = z.infer<typeof layerSchema>;
export type Canvas = z.infer<typeof canvasSchema>;
export const fontFamilies = {
  system: "system-ui, sans-serif",
  serif: "Georgia, serif",
  mono: "monospace",
};
export const initialLayer = (kind: Layer["kind"], id: string): Layer => ({
  id,
  kind,
  name: { text: "Metin", image: "Görsel", shape: "Şekil" }[kind],
  text: "Yeni metin",
  x: 80,
  y: 100,
  width: 550,
  height: 180,
  angle: 0,
  color: "#ffffff",
  font: "system",
  fontSize: 70,
  fontWeight: "700",
  lineHeight: 1.12,
  align: "left",
  visible: true,
  locked: false,
  mediaId: "",
  fit: "contain",
  shape: "rect",
  cropX: 0.5,
  cropY: 0.5,
});
