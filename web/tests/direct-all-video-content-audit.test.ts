import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(process.cwd(), "..");
const inventoryPath = path.join(repositoryRoot, "data/media-audit/all_video_inventory.json");
const timelinePath = path.join(repositoryRoot, "data/media-audit/all_video_timeline_map.json");
const coveragePath = path.join(repositoryRoot, "data/media-audit/game_video_coverage_map.json");
const missingPath = path.join(repositoryRoot, "data/media-audit/exact_missing_recordings.json");

const allowedCoverageStates = new Set([
  "FULLY_CAPTURED",
  "CAPTURED_WITH_LIMITATIONS",
  "PARTIALLY_CAPTURED",
  "VISIBLE_BUT_NOT_OPENED",
  "NOT_SEEN_IN_ANY_VIDEO",
  "DIRECTLY_SHOWN_AS_ABSENT",
  "UNDETERMINED"
]);

describe("direct all-video content audit", () => {
  it("inventories every discovered source-media video exactly once", () => {
    const inventory = readJson<Inventory>(inventoryPath);
    const auditIDs = inventory.videos.map((video) => video.auditID);
    const relativePaths = inventory.videos.map((video) => video.relativePath);

    expect(inventory.summary.totalVideos).toBe(15);
    expect(inventory.summary.uniqueVideos).toBe(12);
    expect(inventory.summary.duplicateVideos).toBe(3);
    expect(inventory.summary.videosOpened).toBe(15);
    expect(inventory.summary.videosFullDurationReadable).toBe(15);
    expect(new Set(auditIDs).size).toBe(auditIDs.length);
    expect(new Set(relativePaths).size).toBe(relativePaths.length);
    expect(inventory.summary.sourceVideosModified).toBe(false);
    expect(inventory.videos.every((video) => video.sourceVideoModified === false)).toBe(true);
  });

  it("marks exact duplicate uploads without adding false timeline coverage", () => {
    const inventory = readJson<Inventory>(inventoryPath);
    const timeline = readJson<Timeline>(timelinePath);
    const duplicateIDs = inventory.videos.filter((video) => video.duplicateOf).map((video) => video.auditID);
    const timelineVideoIDs = new Set(timeline.rows.map((row) => row.auditID));

    expect(duplicateIDs).toEqual(["MEDIA-004", "MEDIA-006", "MEDIA-008"]);
    expect(duplicateIDs.every((id) => !timelineVideoIDs.has(id))).toBe(true);
    expect(inventory.videos.find((video) => video.auditID === "MEDIA-004")?.duplicateOf).toBe("MEDIA-003");
    expect(inventory.videos.find((video) => video.auditID === "MEDIA-006")?.duplicateOf).toBe("MEDIA-005");
    expect(inventory.videos.find((video) => video.auditID === "MEDIA-008")?.duplicateOf).toBe("MEDIA-007");
  });

  it("requires direct timeline inspection for every unique video", () => {
    const inventory = readJson<Inventory>(inventoryPath);
    const timeline = readJson<Timeline>(timelinePath);
    const uniqueIDs = inventory.videos.filter((video) => !video.duplicateOf).map((video) => video.auditID);
    const timelineVideoIDs = new Set(timeline.rows.map((row) => row.auditID));

    expect(timeline.summary.uniqueVideosWithInspection).toBe(uniqueIDs.length);
    expect(uniqueIDs.every((id) => timelineVideoIDs.has(id))).toBe(true);
    expect(timeline.rows.every((row) => row.startTimestamp !== "" && row.endTimestamp !== "")).toBe(true);
    expect(timeline.rows.every((row) => row.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
    expect(timeline.rows.every((row) => row.verificationStatus === "NOT_HUMAN_VERIFIED")).toBe(true);
  });

  it("keeps coverage states factual and per-game", () => {
    const coverage = readJson<Coverage>(coveragePath);
    const games = new Set(coverage.rows.map((row) => row.game));

    expect(coverage.summary.games).toBe(3);
    expect(games).toEqual(new Set([
      "EA Sports FC player creator footage",
      "NBA 2K26 Create A Player footage",
      "College Football 27 create-player footage"
    ]));
    expect(coverage.rows.every((row) => allowedCoverageStates.has(row.state))).toBe(true);
    expect(coverage.rows.every((row) => row.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
  });

  it("limits new recordings to exact missing facts with no broad rerecording", () => {
    const missing = readJson<MissingRecordings>(missingPath);
    const broadTerms = /all heads again|all hairstyles again|record all|entire category again|full-category rerecord/i;

    expect(missing.policy.noBroadRerecordingWithoutProof).toBe(true);
    expect(missing.policy.noProductionPromotion).toBe(true);
    expect(missing.policy.noHumanVerificationClaim).toBe(true);
    expect(missing.summary.totalTasks).toBe(14);
    expect(missing.summary.estimatedMinutes).toBe(50);
    expect(missing.tasks.every((task) => task.exactMissingFact && task.existingVideosReviewed)).toBe(true);
    expect(missing.tasks.every((task) => task.timestampsAlreadyReviewed)).toBe(true);
    expect(missing.tasks.every((task) => task.acceptanceCriteria && task.proposedFilename)).toBe(true);
    expect(missing.tasks.every((task) => !broadTerms.test(task.smallestNewRecordingRequired))).toBe(true);
    expect(missing.tasks.every((task) => task.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
  });
});

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

type Inventory = {
  summary: {
    totalVideos: number;
    uniqueVideos: number;
    duplicateVideos: number;
    videosOpened: number;
    videosFullDurationReadable: number;
    sourceVideosModified: boolean;
  };
  videos: Array<{
    auditID: string;
    relativePath: string;
    duplicateOf: string;
    sourceVideoModified: boolean;
  }>;
};

type Timeline = {
  summary: {
    uniqueVideosWithInspection: number;
  };
  rows: Array<{
    auditID: string;
    startTimestamp: number | "";
    endTimestamp: number | "";
    productionStatus: string;
    verificationStatus: string;
  }>;
};

type Coverage = {
  summary: {
    games: number;
  };
  rows: Array<{
    game: string;
    state: string;
    productionStatus: string;
  }>;
};

type MissingRecordings = {
  policy: {
    noBroadRerecordingWithoutProof: boolean;
    noProductionPromotion: boolean;
    noHumanVerificationClaim: boolean;
  };
  summary: {
    totalTasks: number;
    estimatedMinutes: number;
  };
  tasks: Array<{
    exactMissingFact: string;
    existingVideosReviewed: string;
    timestampsAlreadyReviewed: string;
    smallestNewRecordingRequired: string;
    acceptanceCriteria: string;
    proposedFilename: string;
    productionStatus: string;
  }>;
};
