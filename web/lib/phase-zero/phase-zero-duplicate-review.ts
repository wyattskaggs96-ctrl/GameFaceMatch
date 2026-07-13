import type { PixelSample } from "@/lib/capture/image-quality-service";
import type { Phase0EntityID } from "./phase-zero-domain";

export const PHASE0_DUPLICATE_REVIEW_SCHEMA_VERSION = "phase0-duplicate-review-v1";

export type Phase0DuplicateReviewCategory = "heads" | "hairstyles" | "facialHair" | "additionalAttributes";
export type Phase0DuplicateCandidateKind = "duplicateFile" | "visuallySimilarOption";
export type Phase0DuplicateReviewDecisionState = "unreviewed" | "confirmedDuplicate" | "nearDuplicate" | "notDuplicate" | "needsRecapture";
export type Phase0DuplicateToolConfidenceSource = "checksum" | "perceptualHash";

export interface Phase0DuplicateReviewEvidence {
  evidenceFileID: Phase0EntityID;
  sha256: string | null;
  perceptualHash: string | null;
  viewID: string;
  notes: string;
}

export interface Phase0DuplicateReviewRecord {
  stableInternalID: string;
  nativeOrder: number;
  category: Phase0DuplicateReviewCategory;
  evidence: Phase0DuplicateReviewEvidence[];
  researcherObservations: Phase0DuplicateResearcherObservation[];
}

export interface Phase0DuplicateResearcherObservation {
  observationID: Phase0EntityID;
  candidateID: Phase0EntityID;
  researcherID: string;
  observedAt: string;
  decision: Phase0DuplicateReviewDecisionState;
  notes: string;
}

export interface Phase0DuplicateCandidate {
  candidateID: Phase0EntityID;
  kind: Phase0DuplicateCandidateKind;
  firstStableInternalID: string;
  secondStableInternalID: string;
  firstNativeOrder: number;
  secondNativeOrder: number;
  sharedEvidenceFileIDs: Phase0EntityID[];
  comparedEvidenceFileIDs: Phase0EntityID[];
  checksum: string | null;
  perceptualHashDistance: number | null;
  perceptualSimilarity: number | null;
  toolConfidence: number;
  confidenceSource: Phase0DuplicateToolConfidenceSource;
  confidenceIsGameFact: false;
  decision: Phase0DuplicateReviewDecisionState;
  researcherObservations: Phase0DuplicateResearcherObservation[];
  preservesNativeOrder: true;
  originalEntriesPreserved: true;
  recommendation: string;
}

export interface Phase0DuplicateReviewThresholds {
  nearDuplicateHammingDistance: number;
  highSimilarityConfidence: number;
}

export interface Phase0DuplicateReviewReport {
  schemaVersion: typeof PHASE0_DUPLICATE_REVIEW_SCHEMA_VERSION;
  category: Phase0DuplicateReviewCategory;
  generatedAt: string;
  recordCount: number;
  candidateCount: number;
  duplicateFileCount: number;
  visuallySimilarOptionCount: number;
  candidates: Phase0DuplicateCandidate[];
  recordsInNativeOrder: string[];
  summary: {
    reviewedCount: number;
    notDuplicateCount: number;
    originalEntriesPreserved: true;
    nativeOrderPreserved: true;
    noAutomaticMergeOrDelete: true;
    verifiedGameFactsCreated: false;
  };
  notice: string;
}

export function createDefaultDuplicateReviewThresholds(overrides: Partial<Phase0DuplicateReviewThresholds> = {}): Phase0DuplicateReviewThresholds {
  return {
    nearDuplicateHammingDistance: 8,
    highSimilarityConfidence: 0.88,
    ...overrides
  };
}

export function createPerceptualHashFromPixelSample(sample: PixelSample, hashSize = 8): string {
  if (hashSize < 2 || !Number.isInteger(hashSize)) {
    throw new Error("hashSize must be an integer of at least 2.");
  }
  const cells: number[] = [];
  for (let y = 0; y < hashSize; y += 1) {
    for (let x = 0; x < hashSize; x += 1) {
      cells.push(sampleCellLuma(sample, x, y, hashSize));
    }
  }
  const average = cells.reduce((sum, value) => sum + value, 0) / cells.length;
  return cells.map((value) => (value >= average ? "1" : "0")).join("");
}

export function hammingDistance(first: string, second: string): number {
  if (first.length !== second.length) {
    throw new Error("Perceptual hashes must have the same length.");
  }
  let distance = 0;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) distance += 1;
  }
  return distance;
}

export function createDuplicateReviewReport({
  category,
  generatedAt,
  records,
  thresholds = createDefaultDuplicateReviewThresholds()
}: {
  category: Phase0DuplicateReviewCategory;
  generatedAt: string;
  records: Phase0DuplicateReviewRecord[];
  thresholds?: Phase0DuplicateReviewThresholds;
}): Phase0DuplicateReviewReport {
  const orderedRecords = [...records].sort((first, second) => first.nativeOrder - second.nativeOrder);
  const candidates = [
    ...detectDuplicateFiles(orderedRecords),
    ...detectVisualSimilarities(orderedRecords, thresholds)
  ].sort((first, second) => first.firstNativeOrder - second.firstNativeOrder || first.secondNativeOrder - second.secondNativeOrder || first.candidateID.localeCompare(second.candidateID));
  const dedupedCandidates = dedupeCandidates(candidates);

  return {
    schemaVersion: PHASE0_DUPLICATE_REVIEW_SCHEMA_VERSION,
    category,
    generatedAt,
    recordCount: records.length,
    candidateCount: dedupedCandidates.length,
    duplicateFileCount: dedupedCandidates.filter((candidate) => candidate.kind === "duplicateFile").length,
    visuallySimilarOptionCount: dedupedCandidates.filter((candidate) => candidate.kind === "visuallySimilarOption").length,
    candidates: dedupedCandidates,
    recordsInNativeOrder: orderedRecords.map((record) => record.stableInternalID),
    summary: {
      reviewedCount: dedupedCandidates.filter((candidate) => candidate.decision !== "unreviewed").length,
      notDuplicateCount: dedupedCandidates.filter((candidate) => candidate.decision === "notDuplicate").length,
      originalEntriesPreserved: true,
      nativeOrderPreserved: true,
      noAutomaticMergeOrDelete: true,
      verifiedGameFactsCreated: false
    },
    notice: "Duplicate review is tooling assistance only. It never deletes, merges, reorders, or verifies College Football 27 catalog records."
  };
}

export function createDuplicateReviewDecision(input: {
  candidateID: Phase0EntityID;
  researcherID: string;
  decision: Exclude<Phase0DuplicateReviewDecisionState, "unreviewed">;
  notes: string;
  observedAt: string;
}): Phase0DuplicateResearcherObservation {
  return {
    observationID: `${input.candidateID}-${input.decision}-${slugify(input.researcherID || "researcher")}`,
    candidateID: input.candidateID,
    researcherID: input.researcherID.trim(),
    observedAt: input.observedAt,
    decision: input.decision,
    notes: input.notes.trim()
  };
}

function detectDuplicateFiles(records: Phase0DuplicateReviewRecord[]): Phase0DuplicateCandidate[] {
  const candidates: Phase0DuplicateCandidate[] = [];
  for (let firstIndex = 0; firstIndex < records.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < records.length; secondIndex += 1) {
      const first = records[firstIndex];
      const second = records[secondIndex];
      const shared = first.evidence.flatMap((firstEvidence) =>
        second.evidence
          .filter((secondEvidence) => hasChecksum(firstEvidence.sha256) && firstEvidence.sha256 === secondEvidence.sha256)
          .map((secondEvidence) => ({
            checksum: firstEvidence.sha256,
            firstEvidenceID: firstEvidence.evidenceFileID,
            secondEvidenceID: secondEvidence.evidenceFileID
          }))
      );
      for (const match of shared) {
        candidates.push(candidate({
          kind: "duplicateFile",
          first,
          second,
          sharedEvidenceFileIDs: [match.firstEvidenceID, match.secondEvidenceID],
          comparedEvidenceFileIDs: [match.firstEvidenceID, match.secondEvidenceID],
          checksum: match.checksum,
          perceptualHashDistance: null,
          perceptualSimilarity: null,
          toolConfidence: 1,
          confidenceSource: "checksum"
        }));
      }
    }
  }
  return candidates;
}

function detectVisualSimilarities(records: Phase0DuplicateReviewRecord[], thresholds: Phase0DuplicateReviewThresholds): Phase0DuplicateCandidate[] {
  const candidates: Phase0DuplicateCandidate[] = [];
  for (let firstIndex = 0; firstIndex < records.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < records.length; secondIndex += 1) {
      const first = records[firstIndex];
      const second = records[secondIndex];
      const comparisons = first.evidence.flatMap((firstEvidence) =>
        second.evidence.flatMap((secondEvidence) => {
          if (!firstEvidence.perceptualHash || !secondEvidence.perceptualHash || firstEvidence.perceptualHash.length !== secondEvidence.perceptualHash.length) return [];
          const distance = hammingDistance(firstEvidence.perceptualHash, secondEvidence.perceptualHash);
          if (distance > thresholds.nearDuplicateHammingDistance) return [];
          const similarity = 1 - distance / firstEvidence.perceptualHash.length;
          return [{
            firstEvidence,
            secondEvidence,
            distance,
            similarity
          }];
        })
      );
      if (comparisons.length === 0) continue;
      const best = comparisons.sort((a, b) => b.similarity - a.similarity)[0];
      candidates.push(candidate({
        kind: "visuallySimilarOption",
        first,
        second,
        sharedEvidenceFileIDs: [],
        comparedEvidenceFileIDs: [best.firstEvidence.evidenceFileID, best.secondEvidence.evidenceFileID],
        checksum: null,
        perceptualHashDistance: best.distance,
        perceptualSimilarity: best.similarity,
        toolConfidence: Math.max(thresholds.highSimilarityConfidence, best.similarity),
        confidenceSource: "perceptualHash"
      }));
    }
  }
  return candidates;
}

function candidate(input: {
  kind: Phase0DuplicateCandidateKind;
  first: Phase0DuplicateReviewRecord;
  second: Phase0DuplicateReviewRecord;
  sharedEvidenceFileIDs: Phase0EntityID[];
  comparedEvidenceFileIDs: Phase0EntityID[];
  checksum: string | null;
  perceptualHashDistance: number | null;
  perceptualSimilarity: number | null;
  toolConfidence: number;
  confidenceSource: Phase0DuplicateToolConfidenceSource;
}): Phase0DuplicateCandidate {
  const observations = [...input.first.researcherObservations, ...input.second.researcherObservations].filter((observation) =>
    observation.candidateID === candidateID(input.kind, input.first.stableInternalID, input.second.stableInternalID)
  );
  const latestDecision = observations.at(-1)?.decision ?? "unreviewed";
  return {
    candidateID: candidateID(input.kind, input.first.stableInternalID, input.second.stableInternalID),
    kind: input.kind,
    firstStableInternalID: input.first.stableInternalID,
    secondStableInternalID: input.second.stableInternalID,
    firstNativeOrder: input.first.nativeOrder,
    secondNativeOrder: input.second.nativeOrder,
    sharedEvidenceFileIDs: input.sharedEvidenceFileIDs,
    comparedEvidenceFileIDs: input.comparedEvidenceFileIDs,
    checksum: input.checksum,
    perceptualHashDistance: input.perceptualHashDistance,
    perceptualSimilarity: input.perceptualSimilarity,
    toolConfidence: clamp01(input.toolConfidence),
    confidenceSource: input.confidenceSource,
    confidenceIsGameFact: false,
    decision: latestDecision,
    researcherObservations: observations,
    preservesNativeOrder: true,
    originalEntriesPreserved: true,
    recommendation: input.kind === "duplicateFile"
      ? "Review evidence assignment. The files are byte-identical, but no records are deleted or merged automatically."
      : "Review side by side. The options may be visually similar, but this is not a verified duplicate without researcher confirmation."
  };
}

function dedupeCandidates(candidates: Phase0DuplicateCandidate[]) {
  const byID = new Map<string, Phase0DuplicateCandidate>();
  for (const item of candidates) {
    const existing = byID.get(item.candidateID);
    if (!existing || item.toolConfidence > existing.toolConfidence) {
      byID.set(item.candidateID, item);
    }
  }
  return Array.from(byID.values());
}

function candidateID(kind: Phase0DuplicateCandidateKind, firstID: string, secondID: string) {
  return `duplicate-review-${kind}-${slugify(firstID)}-${slugify(secondID)}`;
}

function sampleCellLuma(sample: PixelSample, cellX: number, cellY: number, hashSize: number) {
  const xStart = Math.floor((cellX / hashSize) * sample.width);
  const xEnd = Math.max(xStart + 1, Math.floor(((cellX + 1) / hashSize) * sample.width));
  const yStart = Math.floor((cellY / hashSize) * sample.height);
  const yEnd = Math.max(yStart + 1, Math.floor(((cellY + 1) / hashSize) * sample.height));
  let total = 0;
  let count = 0;
  for (let y = yStart; y < Math.min(yEnd, sample.height); y += 1) {
    for (let x = xStart; x < Math.min(xEnd, sample.width); x += 1) {
      const index = (y * sample.width + x) * 4;
      total += 0.299 * sample.rgba[index] + 0.587 * sample.rgba[index + 1] + 0.114 * sample.rgba[index + 2];
      count += 1;
    }
  }
  return count > 0 ? total / count : 0;
}

function hasChecksum(value: string | null): value is string {
  return Boolean(value && /^[a-f0-9]{64}$/.test(value));
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
