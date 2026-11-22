"use client";
import { useActionState, useRef, useState } from "react";
import type { HomeBlock } from "@/lib/site-settings";
import { saveHome } from "./actions";

type Kind = HomeBlock["kind"];
export function Builder({
  items,
  labels,
  sources,
  version,
  edit,
  publish,
  revisions,
}: {
  items: HomeBlock[];
  labels: Record<Kind, string>;
  sources: Partial<Record<Kind, { value: string; label: string }[]>>;
  version: number;
  edit: boolean;
  publish: boolean;
  revisions: { id: string; label: string }[];
}) {
  const [blocks, setBlocks] = useState(items);
  const [kind, setKind] = useState<Kind>("text");
  const [notice, action, busy] = useActionState(saveHome, "");
  const dragId = useRef("");
  function move(id: string, to: number) {
    setBlocks((list) => {
      const index = list.findIndex((a) => a.id === id);
      if (index < 0 || to < 0 || to >= list.length || index === to) return list;
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }
  function patch(id: string, data: Partial<HomeBlock>) {
    setBlocks((old) => old.map((b) => (b.id === id ? { ...b, ...data } : b)));
  }
  return (
    <form action={action} className="stack">
      <input type="hidden" name="layout" value={JSON.stringify(blocks)} />
      <input type="hidden" name="version" value={version} />
      {blocks.map((b, i) => (
        <fieldset
          key={b.id}
          className="panel stack"
          disabled={!edit && !publish}
          draggable={edit}
          onDragStart={() => {
            dragId.current = b.id;
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            move(dragId.current, i);
            dragId.current = "";
          }}
        >
          <div className="admin-title">
            <h2>{labels[b.kind]}</h2>
            <div className="actions">
              <button
                type="button"
                className="small-button"
                disabled={i === 0 || !edit}
                onClick={() => move(b.id, i - 1)}
              >
                Yukarı
              </button>
              <button
                type="button"
                className="small-button"
                disabled={i === blocks.length - 1 || !edit}
                onClick={() => move(b.id, i + 1)}
              >
                Aşağı
              </button>
              <button
                type="button"
                className="small-button"
                disabled={!edit}
                onClick={() =>
                  setBlocks((list) => list.filter((x) => x.id !== b.id))
                }
              >
                Kaldır
              </button>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Başlık
              <input
                value={b.title}
                onChange={(e) => patch(b.id, { title: e.target.value })}
                maxLength={120}
              />
            </label>
            <label>
              Görünüm
              <select
                value={b.style}
                onChange={(e) =>
                  patch(b.id, { style: e.target.value as HomeBlock["style"] })
                }
              >
                <option value="plain">Açık</option>
                <option value="dark">Koyu</option>
                <option value="grid">Izgara</option>
              </select>
            </label>
            <label>
              Öğe sınırı
              <input
                type="number"
                min={1}
                max={24}
                value={b.count}
                onChange={(e) => patch(b.id, { count: +e.target.value })}
              />
            </label>
            {sources[b.kind] && (
              <label>
                İçerik kaynağı
                <select
                  aria-label="İçerik kaynağı"
                  value={b.source}
                  onChange={(e) => patch(b.id, { source: e.target.value })}
                >
                  <option value="">Varsayılan içerik</option>
                  {b.source &&
                    !sources[b.kind]?.some((x) => x.value === b.source) && (
                      <option value={b.source}>Önceki seçim</option>
                    )}
                  {sources[b.kind]?.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["text", "cta", "contact"].includes(b.kind) && (
              <label>
                Metin
                <textarea
                  value={b.text}
                  onChange={(e) => patch(b.id, { text: e.target.value })}
                  maxLength={1200}
                />
              </label>
            )}
            {["cta", "contact"].includes(b.kind) && (
              <label>
                Bağlantı
                <input
                  value={b.url}
                  onChange={(e) => patch(b.id, { url: e.target.value })}
                />
              </label>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={b.visible}
                onChange={(e) => patch(b.id, { visible: e.target.checked })}
              />
              Göster
            </label>
          </div>
        </fieldset>
      ))}
      {edit && (
        <div className="panel actions">
          <label>
            Blok türü
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              {Object.entries(labels).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button
            className="small-button"
            type="button"
            disabled={blocks.length >= 30}
            onClick={() =>
              setBlocks((x) => [
                ...x,
                {
                  kind,
                  id: crypto.randomUUID(),
                  title: labels[kind],
                  text: "",
                  url: "",
                  count: 3,
                  style: "plain",
                  visible: true,
                  source: "",
                },
              ])
            }
          >
            Blok ekle
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="actions">
        {edit && (
          <button className="button" name="mode" value="draft" disabled={busy}>
            Taslağı kaydet
          </button>
        )}
        {publish && (
          <button
            className="button"
            name="mode"
            value="publish"
            disabled={busy}
          >
            Yayımla
          </button>
        )}
      </div>
      {publish && revisions.length > 0 && (
        <details className="panel">
          <summary>Sürüm geçmişi</summary>
          <label>
            Geri alınacak sürüm
            <select name="revision">
              {revisions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button"
            name="mode"
            value="restore"
            disabled={busy}
          >
            Sürümü yayımla
          </button>
        </details>
      )}
    </form>
  );
}
