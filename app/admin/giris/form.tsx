"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginForm() {
  const [message, action, busy] = useActionState(signIn, "");
  return (
    <form action={action} className="stack">
      <label>
        E-posta
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          maxLength={254}
        />
      </label>
      <label>
        Parola
        <input
          name="password"
          required
          type="password"
          autoComplete="current-password"
          maxLength={256}
        />
      </label>
      {message && <p role="alert">{message}</p>}
      <button className="button" disabled={busy}>
        {busy ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
