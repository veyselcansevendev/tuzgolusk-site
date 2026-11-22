"use client";
import { useActionState } from "react";
import Link from "next/link";
import { sendMessage } from "./actions";
export function ContactForm() {
  const [notice, action, busy] = useActionState(sendMessage, "");
  return (
    <form className="panel stack" action={action}>
      <h2>Mesaj gönder</h2>
      <label>
        Ad soyad
        <input name="name" autoComplete="name" required maxLength={100} />
      </label>
      <label>
        E-posta
        <input
          name="email"
          autoComplete="email"
          type="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Konu
        <input name="subject" required maxLength={150} />
      </label>
      <label>
        Mesaj
        <textarea name="body" required maxLength={4000} rows={6} />
      </label>
      <label hidden>
        Web sitesi
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="check">
        <input name="consent" type="checkbox" required />
        <span>
          İletişim talebimin işlenmesini kabul ediyorum.{" "}
          <Link href="/kvkk">KVKK bilgilendirmesi</Link>
        </span>
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Gönderiliyor…" : "Gönder"}
      </button>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
