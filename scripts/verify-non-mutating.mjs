#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const tempRoot = path.join(repositoryRoot, ".verification-worktrees");
const keepTemp = process.argv.includes("--keep-temp") || process.env.GAMEFACE_VERIFY_KEEP_TEMP === "1";
const mutationSmoke = process.argv.includes("--mutation-smoke");

export function classifyIsolatedWorktreeMutations({ status, nextEnvDiff = "" }) {
  const changedPaths = parsePorcelainStatus(status);
  if (changedPaths.length === 0) {
    return {
      ok: true,
      allowedMutations: [],
      unexpectedMutations: []
    };
  }

  const allowedMutations = [];
  const unexpectedMutations = [];
  for (const changedPath of changedPaths) {
    if (changedPath === "web/next-env.d.ts" && isAllowedNextEnvRouteTypeDrift(nextEnvDiff)) {
      allowedMutations.push(changedPath);
    } else {
      unexpectedMutations.push(changedPath);
    }
  }
  return {
    ok: unexpectedMutations.length === 0,
    allowedMutations,
    unexpectedMutations
  };
}

export function isAllowedNextEnvRouteTypeDrift(diffText) {
  const contentLines = diffText
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("diff --git "))
    .filter((line) => !line.startsWith("index "))
    .filter((line) => !line.startsWith("--- "))
    .filter((line) => !line.startsWith("+++ "))
    .filter((line) => !line.startsWith("@@ "))
    .filter((line) => line.startsWith("-") || line.startsWith("+"));

  if (contentLines.length !== 2) return false;
  const removed = contentLines.find((line) => line.startsWith("-"));
  const added = contentLines.find((line) => line.startsWith("+"));
  if (!removed || !added) return false;
  const allowedImports = new Set([
    '-import "./.next/types/routes.d.ts";',
    '+import "./.next/types/routes.d.ts";',
    '-import "./.next/dev/types/routes.d.ts";',
    '+import "./.next/dev/types/routes.d.ts";'
  ]);
  return allowedImports.has(removed) && allowedImports.has(added) && removed.slice(1) !== added.slice(1);
}

export function parsePorcelainStatus(status) {
  return status
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

if (mutationSmoke) {
  const result = classifyIsolatedWorktreeMutations({
    status: " M web/features/capture/GuidedCaptureFlow.tsx\n",
    nextEnvDiff: ""
  });
  if (result.ok) {
    console.error("Mutation smoke test failed: unexpected mutation was not detected.");
    process.exit(1);
  }
  console.log("Mutation smoke test passed: unexpected isolated mutations are detected.");
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runNonMutatingVerification();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function runNonMutatingVerification() {
  console.log("GameFace Match non-mutating verification starting.");
  console.log(`Source repository: ${repositoryRoot}`);

  assertGitAvailable();
  const branch = git(["branch", "--show-current"], repositoryRoot).stdout.trim() || "(detached)";
  const head = git(["rev-parse", "HEAD"], repositoryRoot).stdout.trim();
  const startStatus = gitStatus(repositoryRoot);
  console.log(`Branch: ${branch}`);
  console.log(`HEAD: ${head}`);
  console.log("Starting source worktree status:");
  console.log(startStatus || "(clean)");

  if (hasUnmergedEntries(startStatus)) {
    fail("Refusing to run with unresolved merge conflicts in the source worktree.");
  }
  if (startStatus.trim().length > 0) {
    fail("Refusing to treat a dirty source worktree as full verification success. Commit, stash, or move unrelated work first.");
  }

  fs.mkdirSync(tempRoot, { recursive: true });
  const tempParent = fs.mkdtempSync(path.join(tempRoot, "verify-"));
  const tempCheckout = path.join(tempParent, "checkout");
  try {
    console.log(`Temporary checkout: ${tempCheckout}`);
    git(["clone", "--quiet", "--local", "--no-hardlinks", repositoryRoot, tempCheckout], repositoryRoot);
    git(["checkout", "--detach", "--quiet", head], tempCheckout);
    installIsolatedDependencies(tempCheckout);
    copyIgnoredValidationInputs(tempCheckout);

    const verifyResult = runCommand("npm", ["run", "verify"], tempCheckout);
    const sourceEndStatus = gitStatus(repositoryRoot);
    if (sourceEndStatus !== startStatus) {
      console.error("Source worktree changed during isolated verification.");
      console.error("Before:");
      console.error(startStatus || "(clean)");
      console.error("After:");
      console.error(sourceEndStatus || "(clean)");
      fail("Source worktree mutation detected.");
    }

    const isolatedStatus = gitStatus(tempCheckout);
    const nextEnvDiff = isolatedStatus.includes("web/next-env.d.ts") ? git(["diff", "--", "web/next-env.d.ts"], tempCheckout).stdout : "";
    const mutationClassification = classifyIsolatedWorktreeMutations({ status: isolatedStatus, nextEnvDiff });
    if (!mutationClassification.ok) {
      console.error("Verification modified unexpected tracked files inside the isolated checkout:");
      for (const changedPath of mutationClassification.unexpectedMutations) console.error(`- ${changedPath}`);
      fail("Unexpected isolated checkout mutation detected.");
    }
    if (mutationClassification.allowedMutations.length > 0) {
      console.log("Allowed generated-file drift observed only in the isolated checkout:");
      for (const changedPath of mutationClassification.allowedMutations) console.log(`- ${changedPath}`);
    }

    if (verifyResult.status !== 0) {
      fail(`Full verification failed inside the isolated checkout with exit code ${verifyResult.status}.`);
    }
    console.log("Source worktree status after verification:");
    console.log(sourceEndStatus || "(clean)");
    console.log("GameFace Match non-mutating verification passed.");
  } finally {
    if (!keepTemp) {
      fs.rmSync(tempParent, { recursive: true, force: true });
    } else {
      console.log(`Temporary checkout retained for inspection: ${tempCheckout}`);
    }
  }
}

function installIsolatedDependencies(tempCheckout) {
  const webDirectory = path.join(tempCheckout, "web");
  if (!fs.existsSync(path.join(webDirectory, "package-lock.json"))) {
    fail("Cannot install isolated dependencies because web/package-lock.json is missing.");
  }
  const installResult = runCommand("npm", ["ci"], webDirectory);
  if (installResult.status !== 0) {
    fail(`Isolated dependency installation failed with exit code ${installResult.status}.`);
  }
}

function copyIgnoredValidationInputs(tempWorktree) {
  mirrorIgnoredDirectoryContents(
    path.join(repositoryRoot, "data", "phase-zero", "derivative-frames"),
    path.join(tempWorktree, "data", "phase-zero", "derivative-frames")
  );
  mirrorIgnoredDirectoryContents(
    path.join(repositoryRoot, "data", "research", "cf27", "generated", "full-resolution-frames"),
    path.join(tempWorktree, "data", "research", "cf27", "generated", "full-resolution-frames")
  );
}

function mirrorIgnoredDirectoryContents(sourceDirectory, destinationDirectory) {
  if (!fs.existsSync(sourceDirectory) || !fs.existsSync(destinationDirectory)) return;
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (entry.name === ".gitkeep" || entry.name === "README.md") continue;
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);
    if (fs.existsSync(destinationPath)) continue;
    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
      dereference: false,
      force: false,
      errorOnExist: false
    });
    console.log(`Copied ignored validation input into isolated checkout: ${path.relative(repositoryRoot, destinationPath)}`);
  }
}

function runCommand(command, args, cwd) {
  console.log(`\n==> ISOLATED RUN: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) {
    fail(result.error.message);
  }
  return result;
}

function git(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(result.stderr || `git ${args.join(" ")} failed`);
  return result;
}

function gitStatus(cwd) {
  return git(["status", "--porcelain=v1", "--untracked-files=all"], cwd).stdout;
}

function hasUnmergedEntries(status) {
  return status
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => ["DD", "AU", "UD", "UA", "DU", "AA", "UU"].includes(line.slice(0, 2)));
}

function assertGitAvailable() {
  git(["--version"], repositoryRoot);
}

function fail(message) {
  throw new Error(message);
}
