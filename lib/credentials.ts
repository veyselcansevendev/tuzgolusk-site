import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt + ":" + ((await derive(password, salt, 64)) as Buffer).toString("hex")
  );
}
export async function verifyPassword(password: string, stored?: string) {
  const [salt, expected] = (
    stored ?? "00000000000000000000000000000000:" + "00".repeat(64)
  ).split(":");
  const key = (await derive(password, salt, 64)) as Buffer;
  const hash = Buffer.from(expected, "hex");
  return (
    hash.length === key.length && timingSafeEqual(hash, key) && Boolean(stored)
  );
}
