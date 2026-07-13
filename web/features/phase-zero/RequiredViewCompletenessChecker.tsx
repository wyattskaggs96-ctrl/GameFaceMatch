"use client";

import { useMemo, useState } from "react";
import { Alert, Card, SelectField, StatusBadge } from "@/components/design-system";
import {
  PHASE0_REQUIRED_VIEW_RULES,
  createRequiredViewCompletenessReport,
  type Phase0RequiredViewCategory,
  type Phase0RequiredViewCompletenessReport,
  type Phase0RequiredViewStatus
} from "@/lib/phase-zero/phase-zero-required-view-completeness";

const categories: Array<{ value: Phase0RequiredViewCategory; label: string }> = [
  { value: "heads", label: "Heads" },
  { value: "hairstyles", label: "Hairstyles" },
  { value: "facialHair", label: "Facial hair" },
  { value: "additionalAttributes", label: "Additional attributes" },
  { value: "environmentEvidence", label: "Environment evidence" },
  { value: "menuEvidence", label: "Menu evidence" }
];

const statusTone: Record<Phase0RequiredViewStatus, "success" | "warning" | "danger" | "info"> = {
  missing: "danger",
  present: "info",
  rejected: "danger",
  recaptureRequested: "warning",
  verified: "success"
};

export function RequiredViewCompletenessChecker() {
  const [category, setCategory] = useState<Phase0RequiredViewCategory>("heads");
  const report = useMemo(() => createPreviewReport(category), [category]);

  return (
    <section className="screen-stack" aria-labelledby="required-view-completeness-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="required-view-completeness-title">Required view completeness</h2>
        </div>
        <StatusBadge tone={report.productionCompletionAllowed ? "success" : "danger"}>
          {report.productionCompletionAllowed ? "views complete" : "production blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Check whether a catalog category has the required evidence views before publication. This tool reports required, present, missing, rejected,
        recapture-requested, and verified states; it does not verify records or create production catalog data.
      </p>
      <Alert title="Completeness gate only" tone="warning">
        Mandatory missing, rejected, or recapture-requested evidence blocks production. Separate first-review, second-review, catalog-manager, and
        checksum gates still decide whether a record can publish.
      </Alert>
      <Card>
        <SelectField label="Evidence category" value={category} onChange={(event) => setCategory(event.currentTarget.value as Phase0RequiredViewCategory)}>
          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </SelectField>
      </Card>
      <CompletenessSummary report={report} />
      <div className="result-grid">
        {report.rows.map((row) => (
          <Card key={row.viewID} tone={row.blocking ? "danger" : row.verified ? "success" : "info"}>
            <div className="status-row">
              <h3>{row.label}</h3>
              <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge>
            </div>
            <dl className="metadata-list">
              <div>
                <dt>Required</dt>
                <dd>{String(row.required)}</dd>
              </div>
              <div>
                <dt>Present</dt>
                <dd>{String(row.present)}</dd>
              </div>
              <div>
                <dt>Missing</dt>
                <dd>{String(row.missing)}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{String(row.rejected)}</dd>
              </div>
              <div>
                <dt>Recapture requested</dt>
                <dd>{String(row.recaptureRequested)}</dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>{String(row.verified)}</dd>
              </div>
            </dl>
            {row.evidenceFileIDs.length > 0 ? (
              <p className="supporting">Evidence references: {row.evidenceFileIDs.join(", ")}</p>
            ) : (
              <p className="supporting">No evidence reference is recorded for this required view.</p>
            )}
          </Card>
        ))}
      </div>
      <Card tone={report.productionBlockers.length > 0 ? "danger" : "success"}>
        <h3>Production blockers</h3>
        {report.productionBlockers.length === 0 ? (
          <p className="supporting">No required-view blockers are present in this sample report.</p>
        ) : (
          <ul className="compact-list">
            {report.productionBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        )}
        <p className="supporting">{report.notice}</p>
      </Card>
    </section>
  );
}

function CompletenessSummary({ report }: { report: Phase0RequiredViewCompletenessReport }) {
  return (
    <Card>
      <h3>Summary</h3>
      <dl className="metadata-list">
        <div>
          <dt>Category</dt>
          <dd>{report.category}</dd>
        </div>
        <div>
          <dt>Required</dt>
          <dd>{report.summary.requiredCount}</dd>
        </div>
        <div>
          <dt>Present</dt>
          <dd>{report.summary.presentCount}</dd>
        </div>
        <div>
          <dt>Missing</dt>
          <dd>{report.summary.missingCount}</dd>
        </div>
        <div>
          <dt>Rejected</dt>
          <dd>{report.summary.rejectedCount}</dd>
        </div>
        <div>
          <dt>Recapture requested</dt>
          <dd>{report.summary.recaptureRequestedCount}</dd>
        </div>
        <div>
          <dt>Verified</dt>
          <dd>{report.summary.verifiedCount}</dd>
        </div>
        <div>
          <dt>Blocking</dt>
          <dd>{report.summary.blockingCount}</dd>
        </div>
      </dl>
    </Card>
  );
}

function createPreviewReport(category: Phase0RequiredViewCategory) {
  const rules = PHASE0_REQUIRED_VIEW_RULES[category];
  return createRequiredViewCompletenessReport({
    category,
    entityID: `phase-zero-required-view-${category}`,
    label: `${categories.find((item) => item.value === category)?.label ?? category} sample`,
    evidence: rules.slice(0, Math.max(1, rules.length - 1)).map((viewRule, index) => ({
      viewID: viewRule.viewID,
      evidenceFileIDs: [`evidence-local-${category}-${viewRule.viewID}`],
      verificationStatus: index === 0 ? "verified" : "firstReviewApproved",
      recaptureRequested: index === 1 && viewRule.required,
      notes: "Local checker sample metadata only."
    }))
  });
}
