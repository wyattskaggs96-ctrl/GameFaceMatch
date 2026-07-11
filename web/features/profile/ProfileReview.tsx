import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { StandardFaceProfile } from "@/types/domain";

export function ProfileReview({
  profile,
  onBack,
  onContinue
}: {
  profile: StandardFaceProfile | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  if (!profile) {
    return (
      <section className="screen-stack narrow" aria-labelledby="profile-review-title">
        <ScreenHeader eyebrow="Profile review" title="Profile not created yet" id="profile-review-title">
          <p>Confirm standardized attributes before reviewing the local profile foundation.</p>
        </ScreenHeader>
        <Button onClick={onBack}>Return to attributes</Button>
      </section>
    );
  }

  const sourceAngles = Object.values(profile.sourceAngleAvailability);
  const capturedAngles = sourceAngles.filter((angle) => angle.available);
  const unavailableMeasurements = profile.geometry.unavailableMeasurements;

  return (
    <section className="screen-stack" aria-labelledby="profile-review-title">
      <ScreenHeader eyebrow="Profile review" title="Standardized profile foundation" id="profile-review-title">
        <p>
          This profile contains capture metadata, source-angle availability, quality summaries, and user-confirmed appearance attributes. It does not contain
          raw image bytes or invented facial measurements.
        </p>
      </ScreenHeader>
      <div className="profile-review-grid">
        <Card className="profile-section">
          <div className="status-row">
            <h2>From captured or uploaded images</h2>
            <StatusBadge tone={capturedAngles.length === 5 ? "success" : "warning"}>{capturedAngles.length}/5 angles</StatusBadge>
          </div>
          <dl className="metadata-list">
            <div>
              <dt>Capture mode</dt>
              <dd>Guided browser RGB</dd>
            </div>
            <div>
              <dt>Depth supported</dt>
              <dd>No</dd>
            </div>
            <div>
              <dt>Profile version</dt>
              <dd>{profile.profileVersion}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{profile.createdAt}</dd>
            </div>
          </dl>
          <ul className="review-list" aria-label="Source angle availability">
            {sourceAngles.map((angle) => (
              <li key={angle.angleID}>
                <span>{formatAngle(angle.angleID)}</span>
                <strong>{angle.available ? `${angle.source ?? "image"} ${angle.width ?? 0}x${angle.height ?? 0}` : "Missing"}</strong>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="profile-section">
          <h2>User-confirmed attributes</h2>
          <dl className="metadata-list">
            {profile.appearance.attributes.map((attribute) => (
              <div key={attribute.id}>
                <dt>{attribute.label}</dt>
                <dd>{formatAttributeValue(attribute.value)}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="profile-section">
          <div className="status-row">
            <h2>Not yet measured</h2>
            <StatusBadge tone="warning">{unavailableMeasurements.length} unavailable</StatusBadge>
          </div>
          <p className="supporting">
            The web MVP has no TrueDepth data, face landmarks, head-pose model, or facial-analysis model. Geometry remains unavailable rather than guessed.
          </p>
          <ul className="review-list">
            {unavailableMeasurements.map((measurement) => (
              <li key={measurement}>
                <span>{measurement}</span>
                <strong>Unavailable</strong>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Alert title={CATALOG_UNAVAILABLE_MESSAGE} tone="warning">
        Matching still requires verified College Football 27 catalog records. Until that production catalog is loaded, GameFace Match cannot recommend menu
        settings or build instructions.
      </Alert>
      <div className="button-row">
        <Button variant="secondary" onClick={onBack}>
          Edit attributes
        </Button>
        <Button onClick={onContinue}>Continue to processing</Button>
      </div>
    </section>
  );
}

function formatAngle(angleID: string) {
  const labels: Record<string, string> = {
    straightOn: "Straight-on",
    left45: "Left 45 degrees",
    right45: "Right 45 degrees",
    leftProfile: "Left profile",
    rightProfile: "Right profile"
  };
  return labels[angleID] ?? angleID;
}

function formatAttributeValue(value: string | number | boolean | null) {
  if (value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
