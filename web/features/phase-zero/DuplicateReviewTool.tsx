"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  createDuplicateReviewDecision,
  createDuplicateReviewReport,
  type Phase0DuplicateReviewCategory,
  type Phase0DuplicateReviewDecisionState,
  type Phase0DuplicateReviewRecord,
  type Phase0DuplicateResearcherObservation
} from "@/lib/phase-zero/phase-zero-duplicate-review";

const decisionOptions: Array<Exclude<Phase0DuplicateReviewDecisionState, "unreviewed">> = [
  "confirmedDuplicate",
  "nearDuplicate",
  "notDuplicate",
  "needsRecapture"
];

export function DuplicateReviewTool() {
  const [category, setCategory] = useState<Phase0DuplicateReviewCategory>("heads");
  const [researcherID, setResearcherID] = useState("local-reviewer");
  const [notes, setNotes] = useState("Tooling candidate reviewed from local evidence metadata.");
  const [decision, setDecision] = useState<Exclude<Phase0DuplicateReviewDecisionState, "unreviewed">>("notDuplicate");
  const [observations, setObservations] = useState<Phase0DuplicateResearcherObservation[]>([]);
  const records = useMemo(() => sampleRecords(category, observations), [category, observations]);
  const report = useMemo(() => createDuplicateReviewReport({
    category,
    generatedAt: new Date().toISOString(),
    records
  }), [category, records]);

  function recordDecision(candidateID: string) {
    const observation = createDuplicateReviewDecision({
      candidateID,
      researcherID,
      decision,
      notes,
      observedAt: new Date().toISOString()
    });
    setObservations((current) => [...current, observation]);
  }

  return (
    <section className="screen-stack" aria-labelledby="duplicate-review-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="duplicate-review-title">Duplicate review assistance</h2>
        </div>
        <StatusBadge tone={report.candidateCount > 0 ? "warning" : "success"}>{report.candidateCount} candidates</StatusBadge>
      </div>
      <p className="supporting">
        Use exact checksums to find duplicate files and perceptual hashes to surface visually similar options for human review. Native menu order and
        all original entries are preserved.
      </p>
      <Alert title="Human review required" tone="warning">
        Similarity confidence is tooling output, not a verified game fact. The tool never silently deletes, merges, verifies, or reorders records.
      </Alert>
      <div className="card-grid">
        <Card>
          <h3>Review controls</h3>
          <div className="form-stack">
            <SelectField label="Category" value={category} onChange={(event) => setCategory(event.currentTarget.value as Phase0DuplicateReviewCategory)}>
              {["heads", "hairstyles", "facialHair", "additionalAttributes"].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Researcher ID" value={researcherID} onChange={(event) => setResearcherID(event.currentTarget.value)} />
            <SelectField label="Decision" value={decision} onChange={(event) => setDecision(event.currentTarget.value as Exclude<Phase0DuplicateReviewDecisionState, "unreviewed">)}>
              {decisionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Observation notes" value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Summary</h3>
          <dl className="metadata-list">
            <div>
              <dt>Records</dt>
              <dd>{report.recordCount}</dd>
            </div>
            <div>
              <dt>Duplicate files</dt>
              <dd>{report.duplicateFileCount}</dd>
            </div>
            <div>
              <dt>Visual candidates</dt>
              <dd>{report.visuallySimilarOptionCount}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>{report.summary.reviewedCount}</dd>
            </div>
            <div>
              <dt>Not a duplicate</dt>
              <dd>{report.summary.notDuplicateCount}</dd>
            </div>
          </dl>
          <p className="supporting">Native order: {report.recordsInNativeOrder.join(" -> ")}</p>
        </Card>
      </div>
      <div className="result-grid">
        {report.candidates.map((candidate) => (
          <Card key={candidate.candidateID} tone={candidate.decision === "unreviewed" ? "warning" : "info"}>
            <div className="status-row">
              <h3>{candidate.kind}</h3>
              <StatusBadge tone={candidate.decision === "notDuplicate" ? "success" : candidate.decision === "unreviewed" ? "warning" : "info"}>
                {candidate.decision}
              </StatusBadge>
            </div>
            <dl className="metadata-list">
              <div>
                <dt>First record</dt>
                <dd>{candidate.firstStableInternalID} ({candidate.firstNativeOrder})</dd>
              </div>
              <div>
                <dt>Second record</dt>
                <dd>{candidate.secondStableInternalID} ({candidate.secondNativeOrder})</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{Math.round(candidate.toolConfidence * 100)}% tooling output</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{candidate.confidenceSource}</dd>
              </div>
              <div>
                <dt>Game fact</dt>
                <dd>{String(candidate.confidenceIsGameFact)}</dd>
              </div>
            </dl>
            <p className="supporting">{candidate.recommendation}</p>
            <Button onClick={() => recordDecision(candidate.candidateID)}>Record selected decision</Button>
          </Card>
        ))}
      </div>
      <Card>
        <h3>Safety guarantees</h3>
        <ul className="compact-list">
          <li>Original entries preserved: {String(report.summary.originalEntriesPreserved)}</li>
          <li>Native order preserved: {String(report.summary.nativeOrderPreserved)}</li>
          <li>No automatic merge or delete: {String(report.summary.noAutomaticMergeOrDelete)}</li>
          <li>Verified game facts created: {String(report.summary.verifiedGameFactsCreated)}</li>
        </ul>
        <p className="supporting">{report.notice}</p>
      </Card>
    </section>
  );
}

function sampleRecords(category: Phase0DuplicateReviewCategory, observations: Phase0DuplicateResearcherObservation[]): Phase0DuplicateReviewRecord[] {
  const firstID = `CF27_SAMPLE_${category.toUpperCase()}_001`;
  const secondID = `CF27_SAMPLE_${category.toUpperCase()}_002`;
  const thirdID = `CF27_SAMPLE_${category.toUpperCase()}_003`;
  return [
    record(category, firstID, 1, "a".repeat(64), "1111000011110000111100001111000011110000111100001111000011110000", observations),
    record(category, secondID, 2, "a".repeat(64), "1111000011110000111100001111000011110000111100001111000011110000", observations),
    record(category, thirdID, 3, "b".repeat(64), "0000111100001111000011110000111100001111000011110000111100001111", observations)
  ];
}

function record(
  category: Phase0DuplicateReviewCategory,
  stableInternalID: string,
  nativeOrder: number,
  sha256: string,
  perceptualHash: string,
  observations: Phase0DuplicateResearcherObservation[]
): Phase0DuplicateReviewRecord {
  return {
    stableInternalID,
    nativeOrder,
    category,
    evidence: [{
      evidenceFileID: `evidence-${stableInternalID.toLowerCase()}`,
      sha256,
      perceptualHash,
      viewID: "front",
      notes: "Synthetic local metadata for duplicate-review UI preview only."
    }],
    researcherObservations: observations
  };
}
