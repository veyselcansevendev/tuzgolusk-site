"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sameOrigin, rate, clientKey } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(10).max(4000),
});
export async function sendMessage(_: string, form: FormData) {
  if (!(await sameOrigin())) return "İstek kaynağı doğrulanamadı.";
  if (form.get("website")) return "Mesajınız alındı.";
  if (form.get("consent") !== "on") return "Mesaj işleme onayını işaretleyin.";
  if (!(await rate("contact:" + (await clientKey()), 8, 900000)))
    return "Lütfen daha sonra tekrar deneyin.";
  const result = schema.safeParse(Object.fromEntries(form));
  if (!result.success) return "Lütfen iletişim alanlarını kontrol edin.";
  await db.message.create({ data: { ...result.data, consentAt: new Date() } });
  return "Mesajınız alındı.";
}
