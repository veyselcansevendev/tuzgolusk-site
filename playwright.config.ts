import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory =
  process.env.ESKIL_E2E_DIR ||
  (process.env.ESKIL_E2E_DIR = mkdtempSync(join(tmpdir(), "eskil-e2e-")));
const baseURL = "http://127.0.0.1:3417";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    actionTimeout: 7000,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: baseURL + "/api/health",
    reuseExistingServer: false,
    timeout: 90000,
    env: {
      DATABASE_URL: "file:" + join(directory, "club.db"),
      MEDIA_ROOT: join(directory, "media"),
      BACKUP_ROOT: join(directory, "backups"),
      SITE_URL: baseURL,
      INDEX_PUBLIC_SITE: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
