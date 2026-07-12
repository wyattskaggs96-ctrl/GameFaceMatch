#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const webRoot = path.join(repositoryRoot, "web");
const iosProject = path.join(repositoryRoot, "ios", "GameFaceMatch.xcodeproj");
const iosDestination = process.env.GAMEFACE_VERIFY_IOS_DESTINATION ?? "platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5";
const skipE2E = process.env.GAMEFACE_VERIFY_SKIP_E2E === "1";
const skipIOS = process.env.GAMEFACE_VERIFY_SKIP_IOS === "1";

const stages = [
  {
    name: "Repository status and documentation safety",
    command: "node",
    args: ["scripts/repository-status.mjs", "--strict"],
    cwd: repositoryRoot
  },
  {
    name: "Web type-check",
    command: "npm",
    args: ["run", "typecheck"],
    cwd: webRoot
  },
  {
    name: "Web lint",
    command: "npm",
    args: ["run", "lint"],
    cwd: webRoot
  },
  {
    name: "Web unit and integration tests",
    command: "npm",
    args: ["run", "test"],
    cwd: webRoot
  },
  {
    name: "Production catalog schema validation",
    command: "npm",
    args: ["run", "catalog:validate"],
    cwd: webRoot
  },
  {
    name: "Production catalog placeholder check",
    command: "npm",
    args: ["run", "catalog:placeholders"],
    cwd: webRoot
  },
  {
    name: "Production catalog fixture separation check",
    command: "npm",
    args: ["run", "catalog:fixtures"],
    cwd: webRoot
  },
  {
    name: "Production catalog duplicate-ID check",
    command: "node",
    args: ["../scripts/catalog-tools.mjs", "detect-duplicates", "../data/catalog/production/catalog_manifest.json"],
    cwd: webRoot
  },
  {
    name: "Web integrity and documentation checks",
    command: "npm",
    args: ["run", "integrity"],
    cwd: webRoot
  },
  {
    name: "Web production build and production gates",
    command: "npm",
    args: ["run", "build"],
    cwd: webRoot
  },
  {
    name: "Web local smoke and end-to-end tests",
    command: "npm",
    args: ["run", "test:e2e"],
    cwd: webRoot,
    skip: skipE2E,
    skipReason: "GAMEFACE_VERIFY_SKIP_E2E=1"
  },
  ...iosStages()
];

console.log("GameFace Match verification starting.");
console.log(`Repository: ${repositoryRoot}`);
console.log(`Stages: ${stages.filter((stage) => !stage.skip).length} active, ${stages.filter((stage) => stage.skip).length} skipped`);

for (const stage of stages) {
  if (stage.skip) {
    console.log(`\n==> SKIP: ${stage.name}`);
    console.log(`Reason: ${stage.skipReason}`);
    continue;
  }
  console.log(`\n==> START: ${stage.name}`);
  console.log(`Command: ${stage.command} ${stage.args.join(" ")}`);
  const result = spawnSync(stage.command, stage.args, {
    cwd: stage.cwd,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) {
    console.error(`\n==> FAIL: ${stage.name}`);
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n==> FAIL: ${stage.name}`);
    console.error(`Exit code: ${result.status}`);
    process.exit(result.status ?? 1);
  }
  console.log(`==> PASS: ${stage.name}`);
}

console.log("\nGameFace Match verification passed.");

function iosStages() {
  if (skipIOS) {
    return [
      {
        name: "Native iOS build and tests",
        command: "xcodebuild",
        args: [],
        cwd: repositoryRoot,
        skip: true,
        skipReason: "GAMEFACE_VERIFY_SKIP_IOS=1"
      }
    ];
  }
  if (!fs.existsSync(iosProject)) return [];
  if (!commandExists("xcodebuild")) {
    return [
      {
        name: "Native iOS build and tests",
        command: "xcodebuild",
        args: [],
        cwd: repositoryRoot,
        skip: true,
        skipReason: "xcodebuild is unavailable on this machine"
      }
    ];
  }
  return [
    {
      name: "Native iOS build",
      command: "xcodebuild",
      args: [
        "build",
        "-project",
        "ios/GameFaceMatch.xcodeproj",
        "-scheme",
        "GameFaceMatch",
        "-destination",
        iosDestination,
        "-derivedDataPath",
        "build-artifacts/DerivedData"
      ],
      cwd: repositoryRoot
    },
    {
      name: "Native iOS unit tests",
      command: "xcodebuild",
      args: [
        "test",
        "-project",
        "ios/GameFaceMatch.xcodeproj",
        "-scheme",
        "GameFaceMatch",
        "-destination",
        iosDestination,
        "-derivedDataPath",
        "build-artifacts/DerivedData",
        "-only-testing:GameFaceMatchTests"
      ],
      cwd: repositoryRoot
    },
    {
      name: "Native iOS UI tests",
      command: "xcodebuild",
      args: [
        "test",
        "-project",
        "ios/GameFaceMatch.xcodeproj",
        "-scheme",
        "GameFaceMatch",
        "-destination",
        iosDestination,
        "-derivedDataPath",
        "build-artifacts/DerivedData",
        "-only-testing:GameFaceMatchUITests"
      ],
      cwd: repositoryRoot
    }
  ];
}

function commandExists(command) {
  const result = spawnSync(command, ["-version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}
