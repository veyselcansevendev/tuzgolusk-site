import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { digest, token, verifyPassword } from "./credentials";

export const sessionCookie = "eskil_session";
const lifetime = 8 * 60 * 60;
export const siteUrl = () =>
  new URL(process.env.SITE_URL || "https://tuzgolusk.com");

export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin === siteUrl().origin) return true;
  if (process.env.NODE_ENV === "production") return false;
  return (
    origin === "http://" + h.get("host") &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin ?? "")
  );
}

export const actor = cache(async () => {
  const value = (await cookies()).get(sessionCookie)?.value;
  if (!value || !/^[a-zA-Z0-9_-]{43}$/.test(value)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: digest(value) },
    include: { user: { include: { role: true } } },
  });
  return session && session.expiresAt > new Date() && session.user.active
    ? session.user
    : null;
});

export function can(
  user: NonNullable<Awaited<ReturnType<typeof actor>>> | null,
  module: string,
  action: string,
) {
  if (!user) return false;
  if (user.role.key === "super") return true;
  const permissions: unknown = user.role.permissions;
  return (
    Array.isArray(permissions) &&
    (permissions.includes(module + ":" + action) ||
      permissions.includes(module + ":*"))
  );
}
export async function requireActor() {
  const user = await actor();
  if (!user) redirect("/admin/giris");
  return user;
}
export async function mutationActor(module: string, action: string) {
  if (!(await sameOrigin())) throw new Error("İstek kaynağı doğrulanamadı.");
  const user = await actor();
  if (!user || !can(user, module, action))
    throw new Error("Bu işlem için yetkiniz yok.");
  return user;
}

export async function rate(key: string, maximum: number, interval: number) {
  const now = Date.now();
  const value = digest(key);
  const reset = new Date(now + interval);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "Throttle" ("id","key","count","resetAt") VALUES (${value},${value},1,${reset.toISOString()})
    ON CONFLICT ("key") DO UPDATE SET
      "count"=CASE WHEN "resetAt" <= ${new Date(now).toISOString()} THEN 1 ELSE "count"+1 END,
      "resetAt"=CASE WHEN "resetAt" <= ${new Date(now).toISOString()} THEN excluded."resetAt" ELSE "resetAt" END
    RETURNING "count"`;
  if (rows[0].count === 1 && value.startsWith("00"))
    await db.throttle.deleteMany({
      where: { resetAt: { lt: new Date(now - 86_400_000) } },
    });
  return rows[0].count <= maximum;
}
export async function clientKey() {
  const h = await headers();
  return process.env.TRUST_PROXY === "true"
    ? h.get("x-real-ip") || "unknown"
    : "local";
}

export async function login(email: string, password: string) {
  if (!(await sameOrigin()) || email.length > 254 || password.length > 256)
    return false;
  if (
    !(await rate("login-ip:" + (await clientKey()), 30, 900_000)) ||
    !(await rate("login-email:" + email, 8, 900_000))
  )
    return false;
  const user = await db.user.findUnique({ where: { email } });
  if (!(await verifyPassword(password, user?.passwordHash)) || !user?.active)
    return false;
  await openSession(user.id);
  return true;
}
export async function openSession(userId: string) {
  const value = token();
  const jar = await cookies();
  const previous = jar.get(sessionCookie)?.value;
  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    if (previous)
      await tx.session.deleteMany({ where: { tokenHash: digest(previous) } });
    await tx.session.create({
      data: {
        userId,
        tokenHash: digest(value),
        expiresAt: new Date(Date.now() + lifetime * 1000),
      },
    });
    await tx.audit.create({
      data: { actorId: userId, module: "auth", action: "login" },
    });
  });
  jar.set(sessionCookie, value, {
    httpOnly: true,
    secure:
      siteUrl().protocol === "https:" && process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: lifetime,
  });
}
export async function logout() {
  if (!(await sameOrigin())) throw new Error("İstek kaynağı doğrulanamadı.");
  const jar = await cookies();
  const value = jar.get(sessionCookie)?.value;
  if (value)
    await db.session.deleteMany({ where: { tokenHash: digest(value) } });
  jar.delete(sessionCookie);
}
