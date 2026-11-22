"use client";
import { useActionState } from "react";
import type { ReactNode } from "react";
import { FormStatus } from "@/components/admin-form";
import { bulkArchive } from "./actions";
export function BulkForm({
  moduleKey,
  children,
  enabled,
}: {
  moduleKey: string;
  children: ReactNode;
  enabled: boolean;
}) {
  const [message, action, busy] = useActionState(
    bulkArchive.bind(null, moduleKey),
    "",
  );
  if (!enabled) return children;
  return (
    <form action={action} className="stack">
      {children}
      <label className="check">
        <input name="confirm" type="checkbox" required />
        Seçili kayıtları arşivlemeyi onaylıyorum.
      </label>
      <FormStatus busy={busy} message={message} label="Seçilenleri arşivle" />
    </form>
  );
}
