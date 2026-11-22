"use client";
import { useActionState, useSyncExternalStore } from "react";
import { acceptInvite } from "./actions";
const subscribe = (handler: () => void) => {
  window.addEventListener("hashchange", handler);
  return () => window.removeEventListener("hashchange", handler);
};
export function InviteForm() {
  const key = useSyncExternalStore(
    subscribe,
    () => location.hash.slice(1),
    () => "",
  );
  const [notice, action, busy] = useActionState(acceptInvite, "");
  return (
    <form action={action} className="stack">
      <input type="hidden" name="key" value={key} />
      <label>
        Ad soyad
        <input required name="name" autoComplete="name" />
      </label>
      <label>
        Parola
        <input
          type="password"
          minLength={14}
          name="password"
          required
          autoComplete="new-password"
        />
      </label>
      <button className="button" disabled={busy || !key}>
        Davetle hesap aç
      </button>
      {notice && <p role="alert">{notice}</p>}
    </form>
  );
}
