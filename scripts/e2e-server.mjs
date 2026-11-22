import { spawn, spawnSync } from "node:child_process";
const steps = [
  ["npm", ["run", "db:migrate"]],
  ["npm", ["run", "db:seed"]],
  ["node", ["--import", "tsx", "tests/fixtures.ts"]],
];
for (const [command, args] of steps) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
const app = spawn(
  "node",
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3417",
  ],
  { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => app.kill(signal));
app.on("exit", (code) => process.exit(code || 0));
