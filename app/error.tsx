"use client";
import Link from "next/link";
export default function ErrorScreen({ reset }: { reset: () => void }) {
  return (
    <main className="signin">
      <div className="panel stack">
        <h1>Bir sorun oluştu</h1>
        <p>İstek tamamlanamadı.</p>
        <div className="actions">
          <button className="button" onClick={reset}>
            Tekrar dene
          </button>
          <Link href="/">Ana sayfa</Link>
        </div>
      </div>
    </main>
  );
}
