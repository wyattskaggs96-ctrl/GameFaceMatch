#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  GAMEFACE_RELEASE_MODE: "staging",
  NEXT_PUBLIC_GAMEFACE_RELEASE_MODE: "staging"
};

for (const [command, args] of [
  ["node", ["scripts/clean-next-build.mjs"]],
  ["npm", ["run", "catalog:generate"]],
  ["npm", ["run", "mediapipe:assets"]],
  ["next", ["build"]]
]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
    shell: process.platform === "win32"
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Staging build completed with TEST DATA route enabled.");
