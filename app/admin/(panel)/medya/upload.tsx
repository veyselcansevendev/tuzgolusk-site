"use client";
import { useRouter } from "next/navigation";
import { Upload } from "@/components/admin-form";
export function MediaUpload() {
  const router = useRouter();
  return <Upload multiple onUpload={() => router.refresh()} />;
}
