import { describe, expect, it } from "vitest";
// @ts-expect-error Root verification helper is a plain ESM script without TypeScript declarations.
import { classifyIsolatedWorktreeMutations, isAllowedNextEnvRouteTypeDrift, parsePorcelainStatus } from "../../scripts/verify-non-mutating.mjs";

describe("non-mutating verification runner", () => {
  it("parses porcelain status paths for tracked and untracked changes", () => {
    expect(parsePorcelainStatus(" M web/next-env.d.ts\n?? docs/example.md\n")).toEqual(["web/next-env.d.ts", "docs/example.md"]);
  });

  it("allows only the known Next route-type import drift", () => {
    const diff = [
      "diff --git a/web/next-env.d.ts b/web/next-env.d.ts",
      "index 9edff1c..c4b7818 100644",
      "--- a/web/next-env.d.ts",
      "+++ b/web/next-env.d.ts",
      "@@ -1,6 +1,6 @@",
      ' /// <reference types="next" />',
      ' /// <reference types="next/image-types/global" />',
      '-import "./.next/types/routes.d.ts";',
      '+import "./.next/dev/types/routes.d.ts";'
    ].join("\n");
    expect(isAllowedNextEnvRouteTypeDrift(diff)).toBe(true);
    expect(classifyIsolatedWorktreeMutations({ status: " M web/next-env.d.ts\n", nextEnvDiff: diff })).toMatchObject({
      ok: true,
      allowedMutations: ["web/next-env.d.ts"],
      unexpectedMutations: []
    });
  });

  it("rejects unrelated isolated worktree mutations", () => {
    const result = classifyIsolatedWorktreeMutations({
      status: " M web/features/capture/GuidedCaptureFlow.tsx\n",
      nextEnvDiff: ""
    });
    expect(result.ok).toBe(false);
    expect(result.unexpectedMutations).toEqual(["web/features/capture/GuidedCaptureFlow.tsx"]);
  });

  it("rejects semantic next-env changes beyond the route-type import", () => {
    const diff = [
      "diff --git a/web/next-env.d.ts b/web/next-env.d.ts",
      "--- a/web/next-env.d.ts",
      "+++ b/web/next-env.d.ts",
      "@@ -1,3 +1,3 @@",
      '-import "./.next/types/routes.d.ts";',
      '+import "./malicious.d.ts";'
    ].join("\n");
    expect(isAllowedNextEnvRouteTypeDrift(diff)).toBe(false);
    expect(classifyIsolatedWorktreeMutations({ status: " M web/next-env.d.ts\n", nextEnvDiff: diff }).ok).toBe(false);
  });
});
