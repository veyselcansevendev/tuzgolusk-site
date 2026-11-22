"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";

export type HeroSlide = {
  title: string;
  summary: string;
  image?: string;
  mobile?: string;
  href?: string;
  cta?: string;
  video?: string;
};
export function Hero({
  slides,
  club,
  location,
}: {
  slides: HeroSlide[];
  club: string;
  location: string;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (
      slides.length < 2 ||
      !playing ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      7000,
    );
    return () => clearInterval(timer);
  }, [playing, slides.length]);
  const item = slides[index] || slides[0];
  function move(offset: number) {
    setIndex((i) => (i + offset + slides.length) % slides.length);
    setPlaying(false);
  }
  return (
    <section className="hero" aria-label={slides.length ? "Manşetler" : club}>
      {item?.image && (
        <picture className="hero-image">
          {item.mobile && (
            <source media="(max-width: 600px)" srcSet={item.mobile} />
          )}
          <img src={item.image} alt="" fetchPriority="high" />
        </picture>
      )}
      <div className="pitch" aria-hidden="true">
        <div className="pitch-circle" />
      </div>
      <div className="hero-shade" />
      <div className="wrap hero-content">
        <p className="eyebrow">{item ? club : location}</p>
        <h1>{item?.title || club}</h1>
        {item?.summary && <p className="hero-summary">{item.summary}</p>}
        <div className="actions">
          {item?.href ? (
            <Link className="button light" href={item.href}>
              {item.cta || "Devamını oku"}
            </Link>
          ) : (
            <Link className="button light" href="/fikstur">
              Fikstürü incele
            </Link>
          )}
          {item?.video && (
            <Link className="button ghost" href={item.video}>
              Videoyu izle
            </Link>
          )}
          {!item && (
            <Link className="button ghost" href="/haberler">
              Kulüp haberleri
            </Link>
          )}
        </div>
        {slides.length > 1 && (
          <div className="hero-controls">
            <button aria-label="Önceki manşet" onClick={() => move(-1)}>
              <ChevronLeft size={22} />
            </button>
            <span>
              {index + 1} / {slides.length}
            </span>
            <button aria-label="Sonraki manşet" onClick={() => move(1)}>
              <ChevronRight size={22} />
            </button>
            <button
              aria-label={playing ? "Slaytı duraklat" : "Slaytı başlat"}
              onClick={() => setPlaying((v) => !v)}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
