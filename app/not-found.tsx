import Link from "next/link";
export default function NotFound() {
  return (
    <main className="signin">
      <div className="panel stack">
        <h1>Sayfa bulunamadı</h1>
        <Link className="button" href="/">
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
