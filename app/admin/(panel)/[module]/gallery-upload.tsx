"use client";
import { useState } from "react";
import { addAlbumPhotos } from "./gallery-actions";
import { Upload } from "@/components/admin-form";

export function GalleryUpload({ id }: { id: string }) {
  const [images, setImages] = useState<{ id: string; label: string }[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="stack">
      <h3>Albüme toplu fotoğraf ekle</h3>
      <Upload
        multiple
        onUpload={(asset) => setImages((old) => [...old, asset])}
      />
      {images.length > 0 && (
        <>
          <ul className="link-list">
            {images.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
          <button
            type="button"
            className="button"
            disabled={busy || images.length > 20}
            onClick={async () => {
              setBusy(true);
              const status = await addAlbumPhotos(
                id,
                images.map((i) => i.id),
              );
              setNotice(status.message);
              if (status.ok) setImages([]);
              setBusy(false);
            }}
          >
            Fotoğrafları albüme ekle
          </button>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
