"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { ResultsExperience } from "@/features/results/ResultsExperience";
import { PRODUCT_EXPLANATION } from "@/lib/product-copy";
import type { StagingReleaseScenario } from "@/lib/staging/staging-release-mode";

export function StagingReleaseExperience({ scenario }: { scenario: StagingReleaseScenario }) {
  const [resetCount, setResetCount] = useState(0);
  const workflowSteps = useMemo(
    () => [
      "Welcome and product explanation acknowledged with fixture-only data.",
      "Required consent path simulated without storing raw face media.",
      "Guided five-angle RGB capture represented by generated synthetic angle metadata.",
      "StandardFaceProfile generated from synthetic fixture measurements.",
      "Rule-based top-three matching run against the test-only catalog version.",
      "Build guide and results rendered with sharing disabled."
    ],
    []
  );

  function resetStagingData() {
    if (typeof window !== "undefined") {
      for (const storage of [window.localStorage, window.sessionStorage]) {
        for (const key of Object.keys(storage)) {
          if (key.startsWith(scenario.resetStoragePrefix)) storage.removeItem(key);
        }
      }
    }
    setResetCount((count) => count + 1);
  }

  return (
    <main className="page staging-page" id="main-content" tabIndex={-1}>
      <section className="screen-stack" aria-labelledby="staging-title">
        <Alert title="TEST DATA staging mode" tone="warning" role="alert">
          This route uses fixture catalog records only. It is not a production recommendation path and cannot be shared as real College Football 27 results.
        </Alert>
        <ScreenHeader eyebrow="TEST DATA release rehearsal" title="Fixture-backed staging workflow" id="staging-title">
          <p>{PRODUCT_EXPLANATION}</p>
          <p>Use this route to rehearse the full product experience before verified production catalog records exist.</p>
        </ScreenHeader>

        <div className="card-grid">
          <Card tone="warning">
            <div className="status-row">
              <h2>Data class</h2>
              <StatusBadge tone="warning">TEST DATA</StatusBadge>
            </div>
            <p>Catalog source: {scenario.catalog.sourceType}. Production: {scenario.catalog.isProduction ? "yes" : "no"}.</p>
            <p>Fixture labels are intentionally synthetic and must not be treated as game facts.</p>
          </Card>
          <Card tone="info">
            <h2>Test-only catalog version</h2>
            <dl className="metadata-list">
              <div>
                <span>Version</span>
                <strong>{scenario.catalog.catalogVersion.identifier}</strong>
              </div>
              <div>
                <span>Records</span>
                <strong>{scenario.catalog.items.length}</strong>
              </div>
              <div>
                <span>Verified date</span>
                <strong>{scenario.catalog.catalogVersion.verifiedAt ?? "fixture only"}</strong>
              </div>
            </dl>
          </Card>
          <Card tone="neutral">
            <h2>Reset controls</h2>
            <p>Clear staging-only browser state and rerun the fixture scenario without touching production catalog data.</p>
            <div className="button-row">
              <Button variant="danger" onClick={resetStagingData}>
                Reset staging test data
              </Button>
            </div>
            <p className="field-note" aria-live="polite">
              Reset count: {resetCount}
            </p>
          </Card>
        </div>

        <Card>
          <div className="section-heading">
            <p className="eyebrow">TEST DATA workflow coverage</p>
            <h2>Complete product path rehearsal</h2>
          </div>
          <ol className="instruction-list">
            {workflowSteps.map((step, index) => (
              <li key={step}>
                <strong>{index + 1}. TEST DATA</strong>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <ResultsExperience
          profile={scenario.profile}
          catalogIsEmpty={false}
          matches={scenario.matches}
          catalogVersionID={scenario.catalog.catalogVersion.identifier}
          catalogVerificationDate={scenario.catalog.catalogVersion.verifiedAt}
          catalogRecordCount={scenario.catalog.items.length}
          catalogStatusMessage="TEST DATA fixture catalog loaded for staging only."
          catalogStalenessMessage="Fixture catalog does not represent real College Football 27 availability."
          onStartOver={resetStagingData}
          canSaveBuild={false}
          testDataMode
          testDataLabel={scenario.label}
          shareDisabledMessage={scenario.sharingDisabledMessage}
        />
      </section>
    </main>
  );
}
