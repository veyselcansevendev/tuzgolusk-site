import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { z } from "zod";
import { db } from "../lib/db";
import { hashPassword } from "../lib/credentials";
import { roles } from "../lib/access";

const siteHost = URL.parse(process.env.SITE_URL || "")?.hostname;
const localSetup =
  process.env.NODE_ENV !== "production" &&
  (siteHost === "localhost" ||
    siteHost === "127.0.0.1" ||
    siteHost === "[::1]");
const minimumPasswordLength = localSetup ? 12 : 14;

function validEmail(value: string | undefined) {
  const email = z.email().safeParse(value?.trim().toLowerCase());
  if (!email.success)
    throw new Error("Geçerli bir yönetici e-posta adresi girin.");
  return email.data;
}

function validPassword(value: string | undefined) {
  if (!value || value.length < minimumPasswordLength || value.length > 256)
    throw new Error(
      `Yönetici parolası ${minimumPasswordLength}–256 karakter uzunluğunda olmalı.`,
    );
  return value;
}

async function credentials() {
  const [emailArgument] = process.argv.slice(2);
  if (process.argv.length > 3)
    throw new Error("Kullanım: npm run admin:create -- E-POSTA");

  if (!emailArgument && process.env.ADMIN_PASSWORD !== undefined)
    return {
      email: validEmail(process.env.ADMIN_EMAIL),
      password: validPassword(process.env.ADMIN_PASSWORD),
    };

  if (!process.stdin.isTTY || !process.stderr.isTTY)
    throw new Error(
      "Etkileşimli kurulum için komutu VS Code terminalinde çalıştırın.",
    );

  let hidden = false;
  const output = new Writable({
    write(chunk, _, callback) {
      if (!hidden) process.stderr.write(chunk);
      callback();
    },
  });
  const terminal = createInterface({
    input: process.stdin,
    output,
    terminal: true,
    historySize: 0,
  });
  const controller = new AbortController();
  terminal.once("SIGINT", () => terminal.close());
  terminal.once("close", () => controller.abort());
  const options = { signal: controller.signal };
  try {
    const email = validEmail(
      emailArgument ??
        process.env.ADMIN_EMAIL ??
        (await terminal.question("Yönetici e-postası: ", options)),
    );
    process.stderr.write(
      `Yeni parola (${minimumPasswordLength}–256 karakter, giriş gizli): `,
    );
    hidden = true;
    let password: string;
    try {
      password = await terminal.question("", options);
    } finally {
      hidden = false;
      process.stderr.write("\n");
    }
    return { email, password: validPassword(password) };
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("Hesap kurulumu iptal edildi.");
    throw error;
  } finally {
    terminal.close();
  }
}

try {
  const { email, password } = await credentials();
  const name = process.env.ADMIN_NAME?.trim() || "Kulüp Yöneticisi";
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    if (
      await tx.user.count({ where: { active: true, role: { key: "super" } } })
    )
      throw new Error("Etkin Super Admin hesabı zaten var.");
    for (const role of roles)
      await tx.role.upsert({
        where: { key: role.key },
        create: role,
        update: {},
      });
    const role = await tx.role.findUniqueOrThrow({ where: { key: "super" } });
    const user = await tx.user.create({
      data: { name, email, passwordHash, roleId: role.id },
    });
    await tx.audit.create({
      data: {
        actorId: user.id,
        module: "users",
        action: "bootstrap",
        recordId: user.id,
      },
    });
  });
  console.log("Super Admin hesabı oluşturuldu.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Kurulum tamamlanamadı.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
