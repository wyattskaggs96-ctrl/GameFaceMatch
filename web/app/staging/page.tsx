import { Alert, Card, ScreenHeader } from "@/components/design-system";
import { loadStagingFixtureCatalog } from "@/lib/staging/staging-fixture-loader";
import { createStagingReleaseScenario, isStagingReleaseModeEnabled, STAGING_ROUTE_PATH } from "@/lib/staging/staging-release-mode";
import { StagingReleaseExperience } from "@/features/staging/StagingReleaseExperience";

export default async function StagingPage() {
  if (!isStagingReleaseModeEnabled()) {
    return (
      <main className="page" id="main-content" tabIndex={-1}>
        <section className="screen-stack narrow" aria-labelledby="staging-disabled-title">
          <ScreenHeader eyebrow="Staging route" title="Staging mode is disabled" id="staging-disabled-title">
            <p>This route does not load fixture records unless the app is built with `GAMEFACE_RELEASE_MODE=staging`.</p>
          </ScreenHeader>
          <Alert title="Production-safe default" tone="warning">
            Normal production builds keep fixture data out of the app package and continue to fail closed while the verified catalog is empty.
          </Alert>
          <Card>
            <h2>How to enable locally</h2>
            <p>Run `npm run build:staging` from `web/`, then start the built app and open `{STAGING_ROUTE_PATH}`.</p>
          </Card>
        </section>
      </main>
    );
  }

  const catalog = await loadStagingFixtureCatalog();
  const scenario = createStagingReleaseScenario(catalog);
  return <StagingReleaseExperience scenario={scenario} />;
}
