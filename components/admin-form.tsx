"use client";
import { youtubeId } from "@/lib/video";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  publishStates,
  statusNames,
  type Field,
  type Module,
} from "@/lib/catalog";
import { inputDate } from "@/lib/format";
import type { Row } from "@/lib/cms";
import { deleteRecord, editRecord } from "@/app/admin/(panel)/[module]/actions";

type Option = { id: string; label: string; key?: string };
export function FormStatus({
  message,
  busy,
  label = "Kaydet",
}: {
  message: string;
  busy: boolean;
  label?: string;
}) {
  return (
    <>
      {message && (
        <p className="form-message" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "İşleniyor…" : label}
      </button>
    </>
  );
}
export function Upload({
  onUpload,
  multiple = false,
}: {
  onUpload?: (asset: Option) => void;
  multiple?: boolean;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const alt = useRef<HTMLInputElement>(null);
  const credit = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  async function upload(files: File[]) {
    if (!files.length || busy) return;
    if (!alt.current?.value.trim()) {
      setNotice("Önce alternatif metni girin.");
      alt.current?.focus();
      return;
    }
    setBusy(true);
    const results: string[] = [];
    for (const file of files) {
      try {
        if (!/\.webp$/i.test(file.name) || file.type !== "image/webp")
          throw new Error(
            "Yalnızca .webp formatındaki görseller yüklenebilir.",
          );
        const data = new FormData();
        data.set("file", file);
        data.set("alt", alt.current?.value.trim() || "");
        data.set("credit", credit.current?.value.trim() || "");
        const response = await fetch("/api/medya", {
          method: "POST",
          body: data,
        });
        const item = await response.json();
        if (!response.ok)
          throw new Error(item.error || "Yükleme tamamlanamadı.");
        onUpload?.({ id: item.id, label: item.alt, key: item.key });
        results.push(file.name + " ✓");
      } catch (error) {
        results.push(
          file.name +
            " · " +
            (error instanceof Error ? error.message : "Yükleme başarısız."),
        );
      }
    }
    setNotice(results.join("\n"));
    setBusy(false);
    if (picker.current) picker.current.value = "";
  }
  return (
    <details
      className="upload"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void upload(
          Array.from(e.dataTransfer.files).slice(0, multiple ? 20 : 1),
        );
      }}
    >
      <summary>WebP yükle</summary>
      <div className="stack">
        <label>
          Alternatif metin
          <input ref={alt} maxLength={250} />
        </label>
        <label>
          Telif / kaynak
          <input ref={credit} maxLength={250} />
        </label>
        <input
          ref={picker}
          type="file"
          aria-label="WebP dosyası"
          accept="image/webp,.webp"
          multiple={multiple}
          disabled={busy}
          onChange={(e) =>
            void upload(Array.from(e.target.files || []).slice(0, 20))
          }
        />
        {notice && (
          <p className="whitespace-pre-line" role="status">
            {notice}
          </p>
        )}
      </div>
    </details>
  );
}

function RichInput({
  name,
  value,
  images,
  required,
  canUpload,
}: {
  name: string;
  value: string;
  images: Option[];
  required?: boolean;
  canUpload: boolean;
}) {
  const [contents, setContents] = useState(value);
  const [library, setLibrary] = useState(images);
  const [video, setVideo] = useState("");
  const [editorNotice, setEditorNotice] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
  }, [value]);
  function command(c: string, v?: string) {
    ref.current?.focus();
    document.execCommand(c, false, v);
    setContents(ref.current?.innerHTML || "");
  }
  return (
    <div className="rich">
      <div className="toolbar">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("bold")}
          aria-label="Kalın"
        >
          Kalın
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("italic")}
        >
          İtalik
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("formatBlock", "h2")}
        >
          Başlık
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("insertUnorderedList")}
        >
          Liste
        </button>
        <select ref={selected} aria-label="İçerik görseli">
          <option value="">Görsel seçin</option>
          {library.map((i) => (
            <option key={i.id} value={i.key}>
              {i.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const key = selected.current?.value;
            const image = library.find((item) => item.key === key);
            if (!image) return;
            const el = document.createElement("img");
            el.src = "/medya/" + key;
            el.alt = image.label;
            command("insertHTML", el.outerHTML);
          }}
        >
          Görsel ekle
        </button>
      </div>
      {canUpload && (
        <Upload
          onUpload={(asset) => setLibrary((items) => [asset, ...items])}
        />
      )}
      <details className="upload">
        <summary>İçeriğe video ekle</summary>
        <div className="toolbar">
          <label>
            YouTube video adresi
            <input
              type="url"
              value={video}
              onChange={(event) => setVideo(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const id = youtubeId(video);
              if (!id) {
                setEditorNotice("Geçerli bir YouTube video adresi girin.");
                return;
              }
              const frame = document.createElement("iframe");
              frame.src = "https://www.youtube-nocookie.com/embed/" + id;
              frame.title = "YouTube videosu";
              frame.loading = "lazy";
              frame.allowFullscreen = true;
              command("insertHTML", frame.outerHTML);
              setVideo("");
              setEditorNotice("");
            }}
          >
            Videoyu ekle
          </button>
          {editorNotice && <p role="status">{editorNotice}</p>}
        </div>
      </details>
      <div
        ref={ref}
        contentEditable
        aria-required={required}
        role="textbox"
        aria-label="Zengin metin içeriği"
        aria-multiline
        onPaste={(event) => {
          event.preventDefault();
          command("insertText", event.clipboardData.getData("text/plain"));
        }}
        suppressContentEditableWarning
        onInput={(e) => setContents(e.currentTarget.innerHTML)}
      />
      <input type="hidden" name={name} value={contents} />
    </div>
  );
}
function FieldInput({
  field,
  value,
  options,
  canUpload,
}: {
  field: Field;
  value: unknown;
  options: Option[];
  canUpload: boolean;
}) {
  const initial = value ?? (value === null ? "" : (field.default ?? ""));
  const [items, setItems] = useState(options);
  const [media, setMedia] = useState(String(initial));
  const name = field.name;
  const label = field.label;
  if (field.kind === "bool")
    return (
      <label className="check">
        <input name={name} type="checkbox" defaultChecked={initial === true} />
        {label}
      </label>
    );
  if (field.kind === "rich")
    return (
      <div>
        <span>{label}</span>
        <RichInput
          name={name}
          value={String(initial)}
          images={options}
          required={field.required}
          canUpload={canUpload}
        />
      </div>
    );
  if (field.kind === "media")
    return (
      <div className="stack">
        <label>
          {label}
          <select
            aria-label={label}
            name={name}
            value={media}
            required={field.required || name === "mediaId"}
            onChange={(e) => setMedia(e.target.value)}
          >
            <option value="">Görsel seçin</option>
            {items.map((x) => (
              <option value={x.id} key={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        {canUpload && (
          <Upload
            onUpload={(item) => {
              setItems((old) => [item, ...old]);
              setMedia(item.id);
            }}
          />
        )}
      </div>
    );
  if (field.kind === "ref" || field.kind === "select")
    return (
      <label>
        {label}
        <select
          aria-label={label}
          name={name}
          defaultValue={String(initial)}
          required={field.required}
        >
          {field.kind === "ref" && <option value="">Seçin</option>}
          {field.kind === "ref"
            ? options.map((x) => (
                <option value={x.id} key={x.id}>
                  {x.label}
                </option>
              ))
            : field.options?.map((x) => (
                <option key={x} value={x}>
                  {statusNames[x] || x}
                </option>
              ))}
        </select>
      </label>
    );
  if (field.kind === "long")
    return (
      <label>
        {label}
        <textarea
          name={name}
          defaultValue={String(initial)}
          required={field.required}
          maxLength={5000}
          rows={3}
        />
      </label>
    );
  return (
    <label>
      {label}
      <input
        name={name}
        type={
          field.kind === "int"
            ? "number"
            : field.kind === "date"
              ? "datetime-local"
              : "text"
        }
        defaultValue={
          field.kind === "date" && initial
            ? inputDate(new Date(String(initial)))
            : String(initial)
        }
        min={field.kind === "int" ? 0 : undefined}
        max={field.max}
        maxLength={250}
        required={field.required}
      />
    </label>
  );
}
export function RecordForm({
  moduleKey,
  module,
  row,
  options,
  canUpload,
  canPublish,
}: {
  moduleKey: string;
  module: Module;
  row?: Row;
  options: Record<string, Option[]>;
  canUpload: boolean;
  canPublish: boolean;
}) {
  const [message, action, busy] = useActionState(
    editRecord.bind(null, moduleKey, row?.id || null),
    "",
  );
  const dirty = useRef(false);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  const status = String(row?.status || "DRAFT");
  return (
    <form
      action={action}
      className="stack"
      onChange={() => {
        dirty.current = true;
      }}
      onSubmit={() => {
        dirty.current = false;
      }}
    >
      <input type="hidden" name="version" value={Number(row?.version || 0)} />
      {module.content && (
        <>
          <label>
            Başlık
            <input
              name="title"
              required
              maxLength={150}
              defaultValue={String(row?.title || "")}
            />
          </label>
          <label>
            URL adı
            <input
              name="slug"
              maxLength={140}
              placeholder="Başlıktan otomatik oluşur"
              defaultValue={String(row?.slug || "")}
            />
          </label>
        </>
      )}
      {module.fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={row?.[field.name]}
          options={
            options[field.ref || (field.kind === "rich" ? "media" : "")] || []
          }
          canUpload={canUpload}
        />
      ))}
      {module.content && (
        <fieldset className="stack">
          <legend>Yayın ayarları</legend>
          <label>
            Durum
            <select aria-label="Durum" name="status" defaultValue={status}>
              {publishStates
                .filter(
                  (x) =>
                    canPublish ||
                    x === status ||
                    ["DRAFT", "REVIEW"].includes(x),
                )
                .map((x) => (
                  <option key={x} value={x}>
                    {statusNames[x]}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-grid">
            <FieldInput
              field={{
                name: "publishAt",
                label: "Yayın başlangıcı (İstanbul)",
                kind: "date",
              }}
              value={row?.publishAt}
              options={[]}
              canUpload={false}
            />
            <FieldInput
              field={{
                name: "endAt",
                label: "Yayın bitişi (İstanbul)",
                kind: "date",
              }}
              value={row?.endAt}
              options={[]}
              canUpload={false}
            />
          </div>
          <FieldInput
            field={{
              name: "position",
              label: "Gösterim sırası",
              kind: "int",
              default: 0,
              max: 10000,
            }}
            value={row?.position}
            options={[]}
            canUpload={false}
          />
        </fieldset>
      )}
      <FormStatus message={message} busy={busy} />
    </form>
  );
}
export function DeleteForm({
  moduleKey,
  id,
  version,
}: {
  moduleKey: string;
  id: string;
  version: number;
}) {
  const [message, action, busy] = useActionState(
    deleteRecord.bind(null, moduleKey, id, version),
    "",
  );
  return (
    <details className="danger">
      <summary>Kaydı sil</summary>
      <form action={action} className="stack">
        <label className="check">
          <input name="confirm" type="checkbox" required /> Bu kaydın
          silinmesini onaylıyorum.
        </label>
        <FormStatus message={message} busy={busy} label="Silmeyi onayla" />
      </form>
    </details>
  );
}
