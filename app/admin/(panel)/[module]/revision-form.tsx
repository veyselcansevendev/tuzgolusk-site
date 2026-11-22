"use client";
import { useActionState } from "react";
import { restoreRevision } from "./actions";
import { FormStatus } from "@/components/admin-form";
export function RestoreRevision({
  moduleKey,
  recordId,
  revisionId,
  version,
}: {
  moduleKey: string;
  recordId: string;
  revisionId: string;
  version: number;
}) {
  const [message, action, busy] = useActionState(
    restoreRevision.bind(null, moduleKey, recordId, revisionId, version),
    "",
  );
  return (
    <form action={action}>
      <FormStatus message={message} busy={busy} label="Bu sürümü geri yükle" />
    </form>
  );
}
