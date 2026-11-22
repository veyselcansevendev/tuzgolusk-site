"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useActionState,
} from "react";
import { useRouter } from "next/navigation";
import {
  canvasSchema,
  designTypes,
  initialLayer,
  sizes,
  type Canvas,
  type Layer,
} from "@/lib/design-model";
import { containsPoint, renderCanvas, resizeCanvas } from "@/lib/design-render";
import { Upload } from "@/components/admin-form";
import { saveDesign } from "./actions";

type Media = { id: string; key: string; alt: string };
type Match = {
  id: string;
  title: string;
  team: string;
  opponent: string;
  logoId: string;
  opponentLogoId: string;
  kickoff: string;
  stadium: string;
  competition: string;
  venue: string;
  score: string;
  lineup: string[];
};
type Props = {
  initial: Canvas;
  design: {
    id: string;
    title: string;
    category: string;
    state: string;
    version: number;
    matchId: string;
  } | null;
  media: Media[];
  matches: Match[];
  theme: {
    name: string;
    primary: string;
    accent: string;
    primaryText: string;
    logoId: string;
  };
  edit: boolean;
  canCreate: boolean;
  canPublish: boolean;
  canUpload: boolean;
  exportAllowed: boolean;
};
const id = () => crypto.randomUUID();
const makeBlob = (element: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((resolve, reject) =>
    element.toBlob(
      (blob) =>
        blob && blob.type === type
          ? resolve(blob)
          : reject(new Error("Tarayıcı bu çıktı biçimini üretemedi.")),
      type,
      0.94,
    ),
  );

export function Studio({
  initial,
  design,
  media,
  matches,
  theme,
  edit,
  canCreate,
  canPublish,
  canUpload,
  exportAllowed,
}: Props) {
  const [model, setModel] = useState(initial);
  const [previous, setPrevious] = useState<Canvas[]>([]);
  const [next, setNext] = useState<Canvas[]>([]);
  const [assets, setAssets] = useState(media);
  const [active, select] = useState("");
  const [title, setTitle] = useState(design?.title || "");
  const [category, setCategory] = useState(design?.category || "Maç günü");
  const [state, setState] = useState(design?.state || "DRAFT");
  const [matchId, setMatch] = useState(design?.matchId || "");
  const [w, setWidth] = useState(initial.width),
    [h, setHeight] = useState(initial.height);
  const [zoom, setZoom] = useState(100),
    [guides, setGuides] = useState(true),
    [preview, setPreview] = useState(false);
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState("");
  const [exporting, setExporting] = useState(false);
  const [message, action, busy] = useActionState(
    saveDesign.bind(null, design?.id || null),
    "",
  );
  const surface = useRef<HTMLCanvasElement>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    model: Canvas;
  } | null>(null);
  const router = useRouter();
  const layer = model.layers.find((l) => l.id === active);
  const locked = layer?.locked || !edit;
  const paint = useCallback(() => {
    const context = surface.current?.getContext("2d");
    if (context)
      renderCanvas(
        context,
        model,
        images.current,
        preview ? undefined : active,
        guides && !preview,
      );
  }, [model, preview, active, guides]);
  useEffect(() => {
    paint();
  }, [paint]);

  const refs = model.layers
    .filter((l) => l.kind === "image")
    .map((l) => l.mediaId)
    .sort()
    .join(",");
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  }, [paint]);
  useEffect(() => {
    let finished = false;
    for (const ref of new Set(refs.split(",").filter(Boolean))) {
      const asset = assets.find((a) => a.id === ref);
      if (!asset || images.current.has(ref)) continue;
      const image = new Image();
      image.onload = () => {
        if (!finished) {
          images.current.set(ref, image);
          paintRef.current();
        }
      };
      image.src = "/medya/" + asset.key;
    }
    return () => {
      finished = true;
    };
  }, [refs, assets]);

  function store(nextModel: Canvas) {
    setPrevious((s) => [...s.slice(-29), model]);
    setNext([]);
    setModel(nextModel);
  }
  function undo() {
    if (!edit || !previous.length) return;
    const target = previous[previous.length - 1];
    setPrevious(previous.slice(0, -1));
    setNext((x) => [model, ...x]);
    setModel(target);
    setWidth(target.width);
    setHeight(target.height);
  }
  function redo() {
    if (!edit || !next.length) return;
    const target = next[0];
    setPrevious((x) => [...x, model]);
    setNext(next.slice(1));
    setModel(target);
    setWidth(target.width);
    setHeight(target.height);
  }
  function update(patch: Partial<Layer>) {
    if (!layer || !edit) return;
    store({
      ...model,
      layers: model.layers.map((l) =>
        l.id === layer.id ? { ...l, ...patch } : l,
      ),
    });
  }
  function add(kind: Layer["kind"], mediaId = "") {
    if (model.layers.length >= 48 || !edit) return;
    const item = {
      ...initialLayer(kind, id()),
      mediaId,
      color: kind === "shape" ? theme.accent : theme.primaryText,
    };
    store({ ...model, layers: [...model.layers, item] });
    select(item.id);
  }
  function remove() {
    if (!layer || locked) return;
    store({ ...model, layers: model.layers.filter((l) => l.id !== active) });
    select("");
  }
  function reorder(offset: number) {
    const index = model.layers.findIndex((l) => l.id === active),
      pos = index + offset;
    if (locked || index < 0 || pos < 0 || pos >= model.layers.length) return;
    const layers = [...model.layers];
    [layers[index], layers[pos]] = [layers[pos], layers[index]];
    store({ ...model, layers });
  }
  function size(width: number, height: number) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 128 ||
      height < 128 ||
      width > 4096 ||
      height > 4096
    ) {
      setNote("Ölçüler 128–4096 piksel aralığında olmalı.");
      return;
    }
    store(resizeCanvas(model, width, height));
    setWidth(width);
    setHeight(height);
  }
  function template(match?: Match) {
    const main = match ? match.team + "\n" + match.opponent : category;
    const layers: Layer[] = [
      {
        ...initialLayer("shape", id()),
        name: "Vurgu şeridi",
        x: 65,
        y: 75,
        width: 210,
        height: 15,
        color: theme.accent,
      },
      {
        ...initialLayer("text", id()),
        name: "Şablon başlığı",
        text: category.toLocaleUpperCase("tr-TR"),
        x: 65,
        y: 115,
        width: 950,
        height: 90,
        fontSize: 53,
        color: theme.accent,
      },
      {
        ...initialLayer("text", id()),
        name: "Ana metin",
        text: main,
        x: 65,
        y: 390,
        width: 950,
        height: 350,
        fontSize: 99,
        fontWeight: "900",
        color: theme.primaryText,
      },
      {
        ...initialLayer("text", id()),
        name: "Kulüp ve maç bilgisi",
        text: match
          ? [match.kickoff, match.stadium, match.competition, match.venue]
              .filter(Boolean)
              .join("\n")
          : theme.name,
        x: 65,
        y: 985,
        width: 950,
        height: 320,
        fontSize: 46,
        color: theme.primaryText,
      },
    ];
    if (match && category === "Maç sonucu" && match.score)
      layers.push({
        ...initialLayer("text", id()),
        name: "Skor",
        text: match.score,
        x: 65,
        y: 720,
        width: 850,
        height: 170,
        fontSize: 115,
        color: theme.accent,
      });
    if (match && category === "İlk 11") {
      layers[2] = { ...layers[2], y: 360, height: 190, fontSize: 58 };
      layers.push({
        ...initialLayer("text", id()),
        name: "İlk 11",
        text: match.lineup.length
          ? match.lineup.map((p, i) => i + 1 + ". " + p).join("\n")
          : "İlk 11 henüz belirlenmedi.",
        x: 65,
        y: 565,
        width: 900,
        height: 416,
        fontSize: 33,
        color: theme.primaryText,
      });
    }
    for (const [mediaId, x] of [
      [match?.logoId || theme.logoId, 65],
      [match?.opponentLogoId, 340],
    ] as const) {
      if (mediaId && assets.some((a) => a.id === mediaId))
        layers.push({
          ...initialLayer("image", id()),
          name: x === 65 ? "Kulüp logosu" : "Rakip logosu",
          x,
          y: 200,
          width: 180,
          height: 145,
          mediaId,
          locked: true,
        });
    }
    store(
      resizeCanvas(
        { width: 1080, height: 1350, background: theme.primary, layers },
        model.width,
        model.height,
      ),
    );
    if (!title) setTitle(match ? match.title + " · " + category : category);
    if (match) setMatch(match.id);
    if (match && category === "Maç sonucu" && !match.score)
      setNote("Bu maç için yayımlanabilecek tamamlanmış skor bulunamadı.");
    select("");
  }
  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - bounds.left) * model.width) / bounds.width,
      y: ((e.clientY - bounds.top) * model.height) / bounds.height,
    };
  }
  async function exportImage(
    format: "webp" | "png" | "jpeg" | "pdf",
    archive = false,
  ) {
    setNote("");
    setExporting(true);
    try {
      if (!canvasSchema.safeParse(model).success)
        throw new Error("Katmanları ve kanvas ölçülerini kontrol edin.");
      if (
        archive &&
        (!design || JSON.stringify(model) !== JSON.stringify(initial))
      )
        throw new Error("Arşiv oluşturmak için önce tasarımı kaydedin.");
      const output = document.createElement("canvas");
      output.width = model.width;
      output.height = model.height;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("Kanvas hazırlanamadı.");
      const needed = model.layers.filter(
        (l) => l.kind === "image" && l.visible,
      );
      if (needed.some((l) => !images.current.has(l.mediaId)))
        throw new Error("Görsel katmanlarının yüklenmesini bekleyin.");
      renderCanvas(ctx, model, images.current);
      let blob: Blob;
      if (format === "pdf") {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.create();
        const image = await doc.embedPng(
          await (await makeBlob(output, "image/png")).arrayBuffer(),
        );
        doc.addPage([model.width, model.height]).drawImage(image, {
          x: 0,
          y: 0,
          width: model.width,
          height: model.height,
        });
        blob = new Blob([new Uint8Array(await doc.save())], {
          type: "application/pdf",
        });
      } else blob = await makeBlob(output, "image/" + format);
      if (archive && design) {
        const form = new FormData();
        form.set("file", blob, "afis.webp");
        form.set("version", String(design.version));
        const response = await fetch("/api/tasarim/" + design.id + "/arsiv", {
          method: "POST",
          body: form,
        });
        if (!response.ok)
          throw new Error(
            (await response.json()).error || "Arşiv kaydedilemedi.",
          );
        setNote("WebP çıktısı medya kütüphanesine ve arşive kaydedildi.");
        router.refresh();
      } else {
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download =
          (title.trim() || "tuzgolu-afis").replace(/[^\p{L}\p{N}_ -]+/gu, "-") +
          "." +
          (format === "jpeg" ? "jpg" : format);
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Dışa aktarma tamamlanamadı.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div
      className="stack"
      onKeyDown={(event) => {
        if (
          !edit ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            (event.target as HTMLElement).tagName,
          )
        )
          return;
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "z"
        ) {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
        }
        if (event.key === "Delete") {
          event.preventDefault();
          remove();
        }
        const delta: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        if (layer && !locked && delta[event.key]) {
          event.preventDefault();
          const [x, y] = delta[event.key];
          const offset = event.shiftKey ? 10 : 1;
          update({ x: layer.x + x * offset, y: layer.y + y * offset });
        }
      }}
    >
      <form action={action} className="panel stack">
        <input type="hidden" name="canvas" value={JSON.stringify(model)} />
        <input type="hidden" name="version" value={design?.version || 0} />
        <input type="hidden" name="matchId" value={matchId} />
        <div className="form-grid">
          <label>
            Tasarım adı
            <input
              required
              name="title"
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!edit}
            />
          </label>
          <label>
            Şablon türü
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {designTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Durum
            <select
              aria-label="Durum"
              name="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="DRAFT">Taslak</option>
              {(canPublish || state === "PUBLISHED") && (
                <option value="PUBLISHED">Yayımlandı</option>
              )}
              <option value="ARCHIVED">Arşivlendi</option>
            </select>
          </label>
        </div>
        {message && (
          <p role="alert" className="form-message">
            {message}
          </p>
        )}
        <div className="actions">
          {edit && (
            <button className="button" name="mode" value="save" disabled={busy}>
              Tasarımı kaydet
            </button>
          )}
          {canCreate && (
            <button
              className="small-button"
              name="mode"
              value="copy"
              disabled={busy}
            >
              Kopya kaydet
            </button>
          )}
          {canCreate && (
            <button
              className="small-button"
              name="mode"
              value="template"
              disabled={busy}
            >
              Şablon olarak kaydet
            </button>
          )}
        </div>
      </form>
      <div className="studio-grid">
        <div className="stack">
          <section className="panel stack">
            <h2>Tuval</h2>
            <div className="toolbar">
              <button onClick={undo} disabled={!edit || !previous.length}>
                Geri al
              </button>
              <button onClick={redo} disabled={!edit || !next.length}>
                Yinele
              </button>
              <button
                onClick={() => setPreview((value) => !value)}
                aria-pressed={preview}
              >
                Önizleme
              </button>
              <button
                onClick={() => setGuides((x) => !x)}
                aria-pressed={guides}
              >
                Güvenli alan
              </button>
            </div>
            <div className="studio-scroll">
              <canvas
                ref={surface}
                aria-label="Afiş düzenleme tuvali"
                tabIndex={0}
                width={model.width}
                height={model.height}
                style={{ width: zoom + "%" }}
                onPointerDown={(e) => {
                  if (preview || !edit) return;
                  const point = coords(e);
                  const hit = [...model.layers]
                    .reverse()
                    .find(
                      (l) => l.visible && containsPoint(l, point.x, point.y),
                    );
                  select(hit?.id || "");
                  if (!hit || hit.locked) return;
                  surface.current?.focus();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = { id: hit.id, ...point, model };
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const before = drag.current;
                  const point = coords(e);
                  setModel({
                    ...before.model,
                    layers: before.model.layers.map((l) =>
                      l.id === before.id
                        ? {
                            ...l,
                            x: Math.round(l.x + point.x - before.x),
                            y: Math.round(l.y + point.y - before.y),
                          }
                        : l,
                    ),
                  });
                }}
                onPointerUp={() => {
                  if (drag.current) {
                    const before = drag.current.model;
                    drag.current = null;
                    setPrevious((x) => [...x.slice(-29), before]);
                    setNext([]);
                  }
                }}
                onPointerCancel={() => {
                  if (drag.current) setModel(drag.current.model);
                  drag.current = null;
                }}
              />
            </div>
            <label>
              Yakınlaştırma ({zoom}%)
              <input
                type="range"
                min={30}
                max={180}
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              />
            </label>
            {edit && (
              <>
                <div className="form-grid">
                  <label>
                    Genişlik
                    <input
                      type="number"
                      min={128}
                      max={4096}
                      value={w}
                      onChange={(e) => setWidth(+e.target.value)}
                    />
                  </label>
                  <label>
                    Yükseklik
                    <input
                      type="number"
                      min={128}
                      max={4096}
                      value={h}
                      onChange={(e) => setHeight(+e.target.value)}
                    />
                  </label>
                  <button className="small-button" onClick={() => size(w, h)}>
                    Ölçüyü uygula
                  </button>
                </div>
                <div className="toolbar">
                  {sizes.map(([label, width, height]) => (
                    <button key={label} onClick={() => size(width, height)}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
          {exportAllowed && (
            <section className="panel stack">
              <h2>Dışa aktar</h2>
              <div className="toolbar">
                <button
                  className="button"
                  disabled={exporting}
                  onClick={() => void exportImage("webp")}
                >
                  WebP indir
                </button>
                {design && (
                  <button
                    disabled={exporting}
                    onClick={() => void exportImage("webp", true)}
                  >
                    WebP arşivine kaydet
                  </button>
                )}
                {(["png", "jpeg", "pdf"] as const).map((f) => (
                  <button
                    key={f}
                    disabled={exporting}
                    onClick={() => void exportImage(f)}
                  >
                    {f === "jpeg" ? "JPG" : f.toUpperCase()} indir
                  </button>
                ))}
              </div>
            </section>
          )}
          {note && (
            <p className="notice" role="status">
              {note}
            </p>
          )}
        </div>
        <div className="stack">
          {edit && (
            <section className="panel stack">
              <h2>Şablon ve maç</h2>
              <label>
                Fikstür maçı
                <select
                  aria-label="Fikstür maçı"
                  value={matchId}
                  onChange={(e) => setMatch(e.target.value)}
                >
                  <option value="">Maç seçin</option>
                  {matches.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.kickoff} · {m.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="toolbar">
                <button onClick={() => template()}>Boş şablonu uygula</button>
                <button
                  disabled={!matchId}
                  onClick={() =>
                    template(matches.find((x) => x.id === matchId))
                  }
                >
                  Maç bilgilerini yerleştir
                </button>
              </div>
              <label>
                Arka plan
                <input
                  type="color"
                  value={model.background}
                  onChange={(e) =>
                    store({ ...model, background: e.target.value })
                  }
                />
              </label>
            </section>
          )}
          <section className="panel stack">
            <h2>Katmanlar</h2>
            {edit && (
              <>
                <div className="toolbar">
                  <button onClick={() => add("text")}>Metin ekle</button>
                  <button onClick={() => add("shape")}>Şekil ekle</button>
                </div>
                <label>
                  WebP katmanı
                  <select
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                  >
                    <option value="">Görsel seçin</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.alt}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="small-button"
                  disabled={!picked}
                  onClick={() => add("image", picked)}
                >
                  Görsel ekle
                </button>
                {canUpload && (
                  <Upload
                    onUpload={(a) => {
                      setAssets((s) => [
                        { id: a.id, key: a.key || "", alt: a.label },
                        ...s,
                      ]);
                      add("image", a.id);
                    }}
                  />
                )}
              </>
            )}
            <ul className="layer-list">
              {[...model.layers].reverse().map((l) => (
                <li key={l.id}>
                  <button
                    className="small-button"
                    aria-pressed={active === l.id}
                    onClick={() => select(l.id)}
                  >
                    {l.name}
                    {l.locked ? " · Kilitli" : ""}
                    {!l.visible ? " · Gizli" : ""}
                  </button>
                </li>
              ))}
            </ul>
            {layer && edit && (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={layer.locked}
                    onChange={(e) => update({ locked: e.target.checked })}
                  />
                  Katmanı kilitle
                </label>
                <fieldset disabled={locked} className="stack">
                  <legend>Katman özellikleri</legend>
                  <label>
                    Katman adı
                    <input
                      value={layer.name}
                      maxLength={80}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={(e) => update({ visible: e.target.checked })}
                    />
                    Görünür
                  </label>
                  <div className="toolbar">
                    <button onClick={() => reorder(1)}>Öne getir</button>
                    <button onClick={() => reorder(-1)}>Arkaya al</button>
                    <button onClick={remove}>Kaldır</button>
                  </div>
                  <div className="form-grid">
                    {(
                      [
                        ["x", "X", -4096, 8192],
                        ["y", "Y", -4096, 8192],
                        ["width", "Genişlik", 1, 4096],
                        ["height", "Yükseklik", 1, 4096],
                        ["angle", "Döndürme", -360, 360],
                      ] as const
                    ).map(([k, label, min, max]) => (
                      <label key={k}>
                        {label}
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={layer[k]}
                          onChange={(e) =>
                            update({
                              [k]: Math.min(
                                max,
                                Math.max(min, +e.target.value),
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="toolbar">
                    <button
                      onClick={() =>
                        update({ x: (model.width - layer.width) / 2 })
                      }
                    >
                      Yatay ortala
                    </button>
                    <button
                      onClick={() =>
                        update({ y: (model.height - layer.height) / 2 })
                      }
                    >
                      Dikey ortala
                    </button>
                  </div>
                  {layer.kind !== "image" && (
                    <label>
                      Renk
                      <input
                        type="color"
                        value={layer.color}
                        onChange={(e) => update({ color: e.target.value })}
                      />
                    </label>
                  )}
                  {layer.kind === "shape" && (
                    <label>
                      Şekil
                      <select
                        value={layer.shape}
                        onChange={(e) =>
                          update({ shape: e.target.value as Layer["shape"] })
                        }
                      >
                        <option value="rect">Dikdörtgen</option>
                        <option value="circle">Elips</option>
                      </select>
                    </label>
                  )}
                  {layer.kind === "image" && (
                    <>
                      <label>
                        Sığdırma
                        <select
                          value={layer.fit}
                          onChange={(e) =>
                            update({ fit: e.target.value as Layer["fit"] })
                          }
                        >
                          <option value="contain">Oranlı sığdır</option>
                          <option value="cover">Kırp</option>
                        </select>
                      </label>
                      {layer.fit === "cover" && (
                        <div className="form-grid">
                          {(["cropX", "cropY"] as const).map((k) => (
                            <label key={k}>
                              {k === "cropX" ? "Yatay kırpma" : "Dikey kırpma"}
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={layer[k]}
                                onChange={(e) =>
                                  update({ [k]: +e.target.value })
                                }
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {layer.kind === "text" && (
                    <>
                      <label>
                        Metin
                        <textarea
                          value={layer.text}
                          maxLength={1500}
                          rows={4}
                          onChange={(e) => update({ text: e.target.value })}
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          Yazı tipi
                          <select
                            value={layer.font}
                            onChange={(e) =>
                              update({ font: e.target.value as Layer["font"] })
                            }
                          >
                            <option value="system">Sistem</option>
                            <option value="serif">Serif</option>
                            <option value="mono">Mono</option>
                          </select>
                        </label>
                        <label>
                          Boyut
                          <input
                            type="number"
                            min={8}
                            max={400}
                            value={layer.fontSize}
                            onChange={(e) =>
                              update({
                                fontSize: Math.min(
                                  400,
                                  Math.max(8, +e.target.value),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Kalınlık
                          <select
                            value={layer.fontWeight}
                            onChange={(e) =>
                              update({
                                fontWeight: e.target
                                  .value as Layer["fontWeight"],
                              })
                            }
                          >
                            {["400", "700", "900"].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Hizalama
                          <select
                            value={layer.align}
                            onChange={(e) =>
                              update({
                                align: e.target.value as Layer["align"],
                              })
                            }
                          >
                            <option value="left">Sol</option>
                            <option value="center">Orta</option>
                            <option value="right">Sağ</option>
                          </select>
                        </label>
                        <label>
                          Satır aralığı
                          <input
                            type="number"
                            min={0.8}
                            max={3}
                            step={0.05}
                            value={layer.lineHeight}
                            onChange={(e) =>
                              update({
                                lineHeight: Math.min(
                                  3,
                                  Math.max(0.8, +e.target.value),
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                    </>
                  )}
                </fieldset>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
