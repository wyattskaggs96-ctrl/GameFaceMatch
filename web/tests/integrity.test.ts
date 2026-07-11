import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KEY_NAVIGATION_FLOW } from "@/lib/navigation";

describe("production bundle boundaries", () => {
  it("does not include test-only fixture files under web public", () => {
    const publicDir = path.join(process.cwd(), "public");
    const files = fs.existsSync(publicDir) ? listFiles(publicDir) : [];
    expect(files.some((file) => file.includes("test-only") || file.includes(`${path.sep}fixtures${path.sep}`))).toBe(false);
  });
});

describe("key navigation flow", () => {
  it("contains the expected customer-facing sequence", () => {
    expect(KEY_NAVIGATION_FLOW).toEqual([
      "welcome",
      "product",
      "disclaimer",
      "privacy",
      "consent",
      "home",
      "start",
      "preparation",
      "capability",
      "capture",
      "attributes",
      "profile-review",
      "processing",
      "results"
    ]);
  });
});

function listFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
