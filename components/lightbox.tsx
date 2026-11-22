"use client";
import { useRef, useState } from "react";
import { Photo } from "./site";

export function Lightbox({
  images,
}: {
  images: {
    key: string;
    alt: string;
    credit?: string;
    width?: number;
    height?: number;
    small?: boolean;
  }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  if (!images.length) return null;
  const item = images[index];
  function move(amount: number) {
    setIndex((i) => (i + amount + images.length) % images.length);
  }
  return (
    <>
      <div className="gallery-grid">
        {images.map((image, i) => (
          <button
            key={image.key}
            aria-label={image.alt}
            onClick={() => {
              setIndex(i);
              dialog.current?.showModal();
            }}
          >
            <Photo asset={image} />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label="Fotoğraf görüntüleyici"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") move(-1);
          if (e.key === "ArrowRight") move(1);
        }}
      >
        <div className="actions">
          <button className="button" onClick={() => dialog.current?.close()}>
            Kapat
          </button>
          {images.length > 1 && (
            <>
              <button onClick={() => move(-1)}>Önceki</button>
              <button onClick={() => move(1)}>Sonraki</button>
            </>
          )}
        </div>
        <Photo asset={item} />
        <p>
          {item.alt}
          {item.credit ? " · " + item.credit : ""}
        </p>
      </dialog>
    </>
  );
}
