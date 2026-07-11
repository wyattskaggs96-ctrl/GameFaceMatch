import { Alert, ScreenHeader } from "@/components/design-system";

export function SettingsPanel() {
  return (
    <section className="screen-stack narrow" aria-labelledby="settings-title">
      <ScreenHeader eyebrow="Settings" title="Prototype settings" id="settings-title">
        <p>The active MVP client is the responsive web application. Native iPhone remains the future premium TrueDepth capture path.</p>
      </ScreenHeader>
      <Alert title="Local-only foundation" tone="info">
        No database, authentication provider, analytics SDK, subscription service, cloud media storage, or external AI service is connected.
      </Alert>
    </section>
  );
}
