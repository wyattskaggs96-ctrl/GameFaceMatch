import { Alert, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";

export function MatchingLab() {
  return (
    <section className="screen-stack" aria-labelledby="matching-lab-title">
      <ScreenHeader eyebrow="Development-only matching lab" title="Rule-based matching engine" id="matching-lab-title">
        <p>
          This local lab describes the fixture-backed matching harness. Synthetic fixture records stay in the test-only fixture directory and are not imported
          into production routes.
        </p>
      </ScreenHeader>
      <Alert title={CATALOG_UNAVAILABLE_MESSAGE} tone="warning">
        Production matching still fails closed until verified College Football 27 catalog records exist.
      </Alert>
      <div className="card-grid">
        <Card>
          <div className="status-row">
            <h2>Engine</h2>
            <StatusBadge tone="success">available in tests</StatusBadge>
          </div>
          <p className="supporting">
            Formula: confidence-aware weighted feature distance with missing-feature redistribution and separate appearance/preference adjustments.
          </p>
        </Card>
        <Card>
          <h2>Fixture isolation</h2>
          <p className="supporting">
            Synthetic records are loaded by automated tests only. The engine excludes `isTestFixture` catalog items unless a test explicitly enables fixtures.
          </p>
        </Card>
        <Card>
          <h2>Local command</h2>
          <p className="supporting">Run `npm run test -- matching-engine.test.ts` from `web/` to exercise the synthetic top-three ranking harness.</p>
        </Card>
      </div>
    </section>
  );
}
