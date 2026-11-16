import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(rootDir, "artifacts", "api-server");

// Load .env if present
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

console.log("[dev] Building API server...");
const buildResult = spawnSync(process.execPath, ["./build.mjs"], {
  cwd: apiDir,
  stdio: "inherit",
});
if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const apiProc = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: apiDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: process.env.API_PORT ?? "5000",
  },
});

const webProc = spawn("pnpm --filter @workspace/my-health-first run dev", {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PORT: process.env.WEB_PORT ?? "5173",
  },
});

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!apiProc.killed) apiProc.kill();
  if (!webProc.killed) webProc.kill();
  process.exit(code);
}

apiProc.on("exit", (code) => {
  if (!shuttingDown) {
    console.error(`[dev] API server exited with code ${code}`);
    shutdown(code ?? 1);
  }
});

webProc.on("exit", (code) => {
  if (!shuttingDown) {
    console.error(`[dev] Web dev server exited with code ${code}`);
    shutdown(code ?? 1);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

