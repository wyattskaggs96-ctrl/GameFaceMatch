"use client";

import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { CONSENT_DEFINITIONS, CONSENT_VERSION, hasRequiredCaptureConsent, updateConsent, type ConsentID, type ConsentState } from "@/lib/privacy/consent";

export function ConsentPanel({
  consentState,
  onConsentChange,
  onContinue
}: {
  consentState: ConsentState;
  onConsentChange: (state: ConsentState) => void;
  onContinue: () => void;
}) {
  const canContinue = hasRequiredCaptureConsent(consentState);

  function setConsent(id: ConsentID, granted: boolean) {
    onConsentChange(updateConsent(consentState, id, granted));
  }

  return (
    <section className="screen-stack" aria-labelledby="consent-title">
      <ScreenHeader eyebrow="Consent acknowledgment" title="Choose each consent separately" id="consent-title">
        <p>Consent version {CONSENT_VERSION}. GameFace Match does not bundle face, camera, save, improvement, or training consent into one checkbox.</p>
      </ScreenHeader>
      <Alert title="Local-only MVP" tone="info">
        No facial images are uploaded, no account is required, and browser RGB capture is not equivalent to native TrueDepth capture.
      </Alert>
      <div className="consent-grid">
        {CONSENT_DEFINITIONS.map((definition) => {
          const record = consentState[definition.id];
          return (
            <Card className="consent-card" tone={record.granted ? "success" : definition.available ? "neutral" : "warning"} key={definition.id}>
              <div className="status-row">
                <h2>{definition.label}</h2>
                <StatusBadge tone={!definition.available ? "warning" : record.granted ? "success" : definition.requiredForCapture ? "info" : "neutral"}>
                  {!definition.available ? "Unavailable" : definition.requiredForCapture ? "Required" : "Optional"}
                </StatusBadge>
              </div>
              <p>{definition.description}</p>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={record.granted}
                  disabled={!definition.available}
                  onChange={(event) => setConsent(definition.id, event.currentTarget.checked)}
                />
                <span>{definition.available ? "I acknowledge this consent." : "Not available in this MVP."}</span>
              </label>
              {record.updatedAt ? <p className="field-note">Updated {record.updatedAt}</p> : null}
            </Card>
          );
        })}
      </div>
      {!canContinue ? (
        <Alert title="Required consent missing" tone="warning" role="alert">
          Camera use, face analysis for the current recommendation, and temporary local processing must be acknowledged before capture.
        </Alert>
      ) : null}
      <Button disabled={!canContinue} onClick={onContinue}>
        Continue to home
      </Button>
    </section>
  );
}
