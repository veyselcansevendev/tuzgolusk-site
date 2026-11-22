import { fontFamilies, type Canvas, type Layer } from "./design-model";

function lines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  return text.split("\n").flatMap((paragraph) => {
    const result: string[] = [];
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = current ? current + " " + word : word;
      if (current && ctx.measureText(next).width > width) {
        result.push(current);
        current = word;
      } else current = next;
    }
    return [...result, current];
  });
}
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: Canvas,
  images: Map<string, HTMLImageElement>,
  selected?: string,
  guides = false,
) {
  ctx.fillStyle = canvas.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const l of canvas.layers.filter((l) => l.visible)) {
    ctx.save();
    ctx.translate(l.x + l.width / 2, l.y + l.height / 2);
    ctx.rotate((l.angle * Math.PI) / 180);
    ctx.translate(-l.width / 2, -l.height / 2);
    ctx.fillStyle = l.color;
    if (l.kind === "shape") {
      if (l.shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          l.width / 2,
          l.height / 2,
          l.width / 2,
          l.height / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else ctx.fillRect(0, 0, l.width, l.height);
    }
    if (l.kind === "text") {
      ctx.font = l.fontWeight + " " + l.fontSize + "px " + fontFamilies[l.font];
      ctx.textBaseline = "top";
      ctx.textAlign = l.align;
      const x = { left: 0, center: l.width / 2, right: l.width }[l.align];
      ctx.beginPath();
      ctx.rect(0, 0, l.width, l.height);
      ctx.clip();
      for (const [i, s] of lines(ctx, l.text, l.width).entries())
        ctx.fillText(s, x, i * l.fontSize * l.lineHeight, l.width);
    }
    if (l.kind === "image") {
      const image = images.get(l.mediaId);
      if (image?.naturalWidth) {
        const ratio =
          l.fit === "contain"
            ? Math.min(
                l.width / image.naturalWidth,
                l.height / image.naturalHeight,
              )
            : Math.max(
                l.width / image.naturalWidth,
                l.height / image.naturalHeight,
              );
        const w = image.naturalWidth * ratio,
          h = image.naturalHeight * ratio;
        ctx.beginPath();
        ctx.rect(0, 0, l.width, l.height);
        ctx.clip();
        ctx.drawImage(
          image,
          (l.width - w) * (l.fit === "cover" ? l.cropX : 0.5),
          (l.height - h) * (l.fit === "cover" ? l.cropY : 0.5),
          w,
          h,
        );
      }
    }
    ctx.restore();
    if (l.id === selected) {
      ctx.save();
      ctx.translate(l.x + l.width / 2, l.y + l.height / 2);
      ctx.rotate((l.angle * Math.PI) / 180);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#52d9ed";
      ctx.strokeRect(-l.width / 2, -l.height / 2, l.width, l.height);
      ctx.restore();
    }
  }
  if (guides) {
    const gap = Math.min(canvas.width, canvas.height) * 0.06;
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffffa0";
    ctx.strokeRect(gap, gap, canvas.width - gap * 2, canvas.height - gap * 2);
    ctx.restore();
  }
}
export function containsPoint(l: Layer, x: number, y: number) {
  const dx = x - (l.x + l.width / 2),
    dy = y - (l.y + l.height / 2),
    angle = (l.angle * Math.PI) / 180;
  return (
    Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle)) <= l.width / 2 &&
    Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle)) <= l.height / 2
  );
}
export function resizeCanvas(
  model: Canvas,
  width: number,
  height: number,
): Canvas {
  const factor = Math.min(width / model.width, height / model.height);
  const offsetX = (width - model.width * factor) / 2,
    offsetY = (height - model.height * factor) / 2;
  const n = (value: number) => Math.round(value * 10) / 10;
  return {
    width,
    height,
    background: model.background,
    layers: model.layers.map((l) => ({
      ...l,
      x: n(l.x * factor + offsetX),
      y: n(l.y * factor + offsetY),
      width: Math.max(1, n(l.width * factor)),
      height: Math.max(1, n(l.height * factor)),
      fontSize: Math.min(400, Math.max(8, n(l.fontSize * factor))),
    })),
  };
}
