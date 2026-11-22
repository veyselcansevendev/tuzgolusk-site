"use client";
import { useEffect, useState } from "react";
import { statusNames } from "@/lib/catalog";

export type Score = {
  state: string;
  home: number | null;
  away: number | null;
  events: {
    id: string;
    minute: number;
    type: string;
    detail: string;
    player?: string;
  }[];
};
export function LiveMatch({
  slug,
  initial,
  poll,
}: {
  slug: string;
  initial: Score;
  poll: boolean;
}) {
  const [score, setScore] = useState(initial);
  const [warning, setWarning] = useState(false);
  useEffect(() => {
    if (!poll) return;
    let busy = false;
    const abort = new AbortController();
    async function tick() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const result = await fetch(
          "/api/mac?slug=" + encodeURIComponent(slug),
          { cache: "no-store", signal: abort.signal },
        );
        if (!result.ok) throw new Error();
        setScore(await result.json());
        setWarning(false);
      } catch {
        if (!abort.signal.aborted) setWarning(true);
      } finally {
        busy = false;
      }
    }
    const timer = window.setInterval(tick, 15000);
    return () => {
      clearInterval(timer);
      abort.abort();
    };
  }, [poll, slug]);
  return (
    <section className="panel stack">
      <div className="match-live" aria-live="polite">
        <span>{statusNames[score.state]}</span>
        <strong>
          {score.home === null || score.away === null
            ? "Skor bekleniyor"
            : score.home + " : " + score.away}
        </strong>
      </div>
      {poll && (
        <p className="muted">
          Skor kulüp görevlisi tarafından güncellenir. Sayfa 15 saniyede bir
          kontrol eder.
        </p>
      )}
      {warning && <p role="status">Bağlantı geçici olarak kesildi.</p>}
      <h2>Maç olayları</h2>
      {score.events.length ? (
        <ol className="events">
          {score.events.map((e) => (
            <li key={e.id}>
              <strong>
                {e.minute}′ · {statusNames[e.type]}
              </strong>{" "}
              {e.player && e.player + " · "}
              {e.detail}
            </li>
          ))}
        </ol>
      ) : (
        <p>Henüz olay kaydedilmedi.</p>
      )}
    </section>
  );
}
