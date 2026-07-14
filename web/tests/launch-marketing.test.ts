import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AFFILIATION_COPY,
  CREATOR_DEMO_SCRIPT,
  EXAMPLE_RESULT,
  FAQ_ITEMS,
  LAUNCH_HERO,
  LAUNCH_SCREENSHOT_ASSETS,
  PRIVACY_SUMMARY_POINTS,
  REQUIRED_LAUNCH_MESSAGES,
  SAFE_SHARE_CARD,
  SUPPORT_PAGE_CONTENT,
  SUPPORTED_GAME_STATEMENT
} from "@/lib/marketing/launch-messaging";

const repositoryRoot = path.resolve(__dirname, "..", "..");
const webRoot = path.join(repositoryRoot, "web");

describe("launch marketing messaging", () => {
  it("includes the required launch messages", () => {
    expect(REQUIRED_LAUNCH_MESSAGES).toEqual(
      expect.arrayContaining([
        "Build yourself in College Football 27",
        "Get your closest available in-game appearance",
        "Top-three verified matches",
        "Manual step-by-step build guide",
        "Independent companion application",
        "No direct game import",
        "Not affiliated with EA"
      ])
    );
    expect(LAUNCH_HERO.title).toBe("Build yourself in College Football 27");
    expect(LAUNCH_HERO.lede).toContain("closest available in-game appearance");
  });

  it("keeps the supported-game statement honest while the production catalog is unavailable", () => {
    expect(SUPPORTED_GAME_STATEMENT.game).toBe("EA SPORTS College Football 27");
    expect(SUPPORTED_GAME_STATEMENT.versionStatus).toBe("Verified College Football 27 catalog not loaded.");
    expect(SUPPORTED_GAME_STATEMENT.limitation).toContain("guided RGB images only");
    expect(SUPPORTED_GAME_STATEMENT.limitation).toContain("does not claim TrueDepth");
  });

  it("uses an example result that does not invent production game settings", () => {
    expect(EXAMPLE_RESULT.status).toBe("Verified College Football 27 catalog not loaded.");
    expect(EXAMPLE_RESULT.slots).toHaveLength(3);
    expect(EXAMPLE_RESULT.slots.every((slot) => slot.includes("unavailable until catalog verification"))).toBe(true);
    expect(EXAMPLE_RESULT.explanation).toContain("without showing fake College Football 27 settings");
    expect(JSON.stringify(EXAMPLE_RESULT)).not.toMatch(/Head\s+\d+|Hair\s+\d+|Facial Hair\s+\d+|Slider\s+\d+/i);
  });

  it("defaults share and support messaging to privacy-safe behavior", () => {
    expect(SAFE_SHARE_CARD.body).toContain("Text-only");
    expect(SAFE_SHARE_CARD.body).toContain("never include face images");
    expect(SUPPORT_PAGE_CONTENT.beforeContacting.join(" ")).toContain("Do not send face images");
    expect(SUPPORT_PAGE_CONTENT.privacyGuidance).toContain("does not sell face data");
    expect(PRIVACY_SUMMARY_POINTS.join(" ")).toContain("No face images are uploaded");
  });

  it("keeps FAQ and creator-demo copy inside legal claim boundaries", () => {
    const combined = [AFFILIATION_COPY.independent, ...FAQ_ITEMS.map((item) => `${item.question} ${item.answer}`), ...CREATOR_DEMO_SCRIPT].join("\n");
    expect(combined).toContain("not affiliated with, endorsed by, or sponsored by Electronic Arts");
    expect(combined).toContain("does not directly import your face");
    expect(combined).not.toMatch(/perfect match|guaranteed resemblance|official EA integration|biometric identification/i);
  });

  it("ships launch screenshot assets without real-person imagery or fake settings", () => {
    for (const asset of LAUNCH_SCREENSHOT_ASSETS) {
      const absolutePath = path.join(webRoot, "public", asset.path.replace(/^\//, ""));
      const text = fs.readFileSync(absolutePath, "utf8");
      expect(text).toContain("<svg");
      expect(text).not.toMatch(/<image\b|data:image|Head\s+\d+|Hair\s+\d+|Facial Hair\s+\d+|Slider\s+\d+/i);
    }
  });

  it("documents the launch assets and creator script", () => {
    const docs = [
      "docs/marketing/LAUNCH_MESSAGING.md",
      "docs/marketing/CREATOR_DEMONSTRATION_SCRIPT.md",
      "docs/marketing/LAUNCH_SCREENSHOTS.md",
      "docs/marketing/SUPPORT_PAGE_COPY.md"
    ].map((relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"));
    const combined = docs.join("\n");

    expect(combined).toContain("Build yourself in College Football 27");
    expect(combined).toContain("Verified College Football 27 catalog not loaded.");
    expect(combined).toContain("Do not send face images");
    expect(combined).not.toMatch(/Head\s+\d+|Hair\s+\d+|Facial Hair\s+\d+|Slider\s+\d+/i);
  });
});
