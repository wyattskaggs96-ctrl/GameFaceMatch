import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { StandardFaceProfile } from "@/types/domain";

export function ProfileReview({
  profile,
  onBack,
  onContinue,
  canSaveProfile = false,
  onSaveProfile,
  saveStatusMessage = null,
  saveErrorMessage = null
}: {
  profile: StandardFaceProfile | null;
  onBack: () => void;
  onContinue: () => void;
  canSaveProfile?: boolean;
  onSaveProfile?: () => void;
  saveStatusMessage?: string | null;
  saveErrorMessage?: string | null;
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
  const geometryGroups = groupGeometryMeasurements(profile);

  return (
    <section className="screen-stack" aria-labelledby="profile-review-title">
      <ScreenHeader eyebrow="Profile review" title="Standardized profile foundation" id="profile-review-title">
        <p>
          This profile contains capture metadata, source-angle availability, quality summaries, and user-confirmed appearance attributes. It does not contain
          raw image bytes, landmark coordinate arrays, identity embeddings, or invented facial measurements.
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
          <p className="supporting">These fields came from the confirmation form, not from model estimates or College Football 27 catalog labels.</p>
          <dl className="metadata-list">
            {profile.userConfirmedAttributes.map((attribute) => (
              <div key={attribute.id}>
                <dt>{attribute.label}</dt>
                <dd>
                  {formatAttributeValue(attribute.value)}
                  <span className="sr-only">, source user confirmed</span>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="profile-section">
          <div className="status-row">
            <h2>Geometry status</h2>
            <StatusBadge tone={geometryGroups.unavailable.length > 0 ? "warning" : "success"}>{geometryGroups.unavailable.length} unavailable</StatusBadge>
          </div>
          <p className="supporting">
            Browser RGB landmarks can support some normalized geometry ratios. Approximate measurements are marked separately, unavailable measurements remain
            unavailable, low-quality or wrong-pose images are not used for measurements, and depth-supported is always no for the web flow.
          </p>
          <GeometryStatusList title="Measured" measurements={geometryGroups.measured} />
          <GeometryStatusList title="Approximate" measurements={geometryGroups.approximate} />
          <GeometryStatusList title="Unavailable" measurements={geometryGroups.unavailable} />
        </Card>
      </div>
      <Alert title={CATALOG_UNAVAILABLE_MESSAGE} tone="warning">
        Matching still requires verified College Football 27 catalog records. Until that production catalog is loaded, GameFace Match cannot recommend menu
        settings or build instructions.
      </Alert>
      <Card tone="info">
        <h2>Save profile locally</h2>
        <p>
          The current profile is session-only by default. Saving is optional, local to this browser session, and excludes raw images, object URLs, file names,
          and landmark coordinate arrays.
        </p>
        <p className="supporting">Saved profile payloads are encrypted with WebCrypto where the browser supports it.</p>
        {saveStatusMessage ? (
          <Alert title="Profile saved" tone="success">
            {saveStatusMessage}
          </Alert>
        ) : null}
        {saveErrorMessage ? (
          <Alert title="Profile save needs attention" tone="warning" role="alert">
            {saveErrorMessage}
          </Alert>
        ) : null}
        <Button variant="secondary" onClick={onSaveProfile} disabled={!canSaveProfile || !onSaveProfile}>
          Save derived profile locally
        </Button>
        {!canSaveProfile ? <p className="field-note">Enable the separate save-derived-profile consent before saving this non-image profile.</p> : null}
      </Card>
      <div className="button-row">
        <Button variant="secondary" onClick={onBack}>
          Edit attributes
        </Button>
        <Button onClick={onContinue}>Continue to processing</Button>
      </div>
    </section>
  );
}

function GeometryStatusList({ title, measurements }: { title: string; measurements: string[] }) {
  return (
    <div>
      <div className="status-row">
        <h3>{title}</h3>
        <StatusBadge tone={measurements.length > 0 ? (title === "Measured" ? "success" : title === "Approximate" ? "warning" : "neutral") : "neutral"}>
          {measurements.length}
        </StatusBadge>
      </div>
      {measurements.length > 0 ? (
        <ul className="review-list">
          {measurements.map((measurement) => (
            <li key={measurement}>
              <span>{formatMeasurement(measurement)}</span>
              <strong>{title}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="supporting">None</p>
      )}
    </div>
  );
}

function groupGeometryMeasurements(profile: StandardFaceProfile) {
  const measured: string[] = [];
  const approximate: string[] = [];
  const unavailable: string[] = [];
  for (const [id, measurement] of Object.entries(profile.geometry.measurements)) {
    if (!measurement || measurement.availabilityState !== "available") {
      unavailable.push(id);
    } else if (measurement.confidence.score >= 0.68 && !measurement.profileEvidenceExists) {
      measured.push(id);
    } else {
      approximate.push(id);
    }
  }
  return {
    measured: measured.sort(),
    approximate: approximate.sort(),
    unavailable: unavailable.sort()
  };
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

function formatMeasurement(measurementID: string) {
  const labels: Record<string, string> = {
    faceWidthRatio: "Face width-to-length ratio",
    faceLengthRatio: "Standalone face length ratio",
    foreheadWidthRatio: "Forehead width ratio",
    jawWidthRatio: "Jaw width ratio",
    chinWidthRatio: "Chin width ratio",
    eyeSpacingRatio: "Eye spacing ratio",
    meanEyeWidthRatio: "Mean eye width ratio",
    noseWidthRatio: "Nose width ratio",
    noseLengthRatio: "Nose length ratio",
    mouthWidthRatio: "Mouth width ratio",
    lowerFaceRatio: "Lower-face ratio",
    eyeTilt: "Eye tilt",
    browPosition: "Brow position",
    jawAngle: "Approximate jaw angle",
    noseProjection: "Approximate nose projection",
    chinProjection: "Approximate chin projection"
  };
  return labels[measurementID] ?? measurementID;
}

function formatAttributeValue(value: string | number | boolean | null) {
  if (value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
