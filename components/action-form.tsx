"use client";
import { useActionState } from "react";
import type { ReactNode } from "react";
import { FormStatus } from "./admin-form";

export function ActionForm({
  action,
  children,
  label,
  className = "stack",
}: {
  action: (state: string, form: FormData) => Promise<string>;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const [message, submit, busy] = useActionState(action, "");
  return (
    <form action={submit} className={className}>
      {children}
      <FormStatus message={message} busy={busy} label={label} />
    </form>
  );
}
