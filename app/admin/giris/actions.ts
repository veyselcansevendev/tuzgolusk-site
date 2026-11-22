"use server";
import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

export async function signIn(_: string, form: FormData) {
  const ok = await login(
    String(form.get("email") || "")
      .trim()
      .toLowerCase(),
    String(form.get("password") || ""),
  );
  if (!ok) return "Giriş bilgileri doğrulanamadı veya deneme sınırı aşıldı.";
  redirect("/admin");
}
export async function signOut() {
  await logout();
  redirect("/admin/giris");
}
