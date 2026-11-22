"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function MatchRefresh() {
  const router = useRouter();
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) router.refresh();
    };
    const timer = window.setInterval(handler, 15000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <p className="muted">
      Maç bilgileri kulüp görevlisi tarafından güncellenir. Sayfa 15 saniyede
      bir yenilenir.
    </p>
  );
}
