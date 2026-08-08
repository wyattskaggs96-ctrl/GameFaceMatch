import { Button, Card, ScreenHeader } from "@/components/design-system";

const preparationItems = [
  "Remove glasses or headwear.",
  "Pull hair away from your face.",
  "Face a soft, even light.",
  "Hold the phone at eye level.",
  "Keep a neutral expression."
];

export function CapturePreparation({
  onContinue,
  onAssistedCapture,
  variant = "standard"
}: {
  onContinue: () => void;
  onAssistedCapture?: () => void;
  variant?: "standard" | "immersive";
}) {
  if (variant === "immersive") {
    return (
      <section className="setup-flow-screen setup-prep-screen" aria-labelledby="capture-prep-title">
        <button className="setup-top-control" type="button" onClick={onAssistedCapture ?? onContinue} aria-label="Accessibility options">
          <span aria-hidden="true">?</span>
        </button>
        <div className="setup-prep-content">
          <p className="setup-brand">GameFace Match</p>
          <h1 id="capture-prep-title">Get Ready</h1>
          <p>For the best match:</p>
          <ul className="setup-prep-list">
            {preparationItems.map((item) => (
              <li key={item}>{item.replace(/\.$/, "")}</li>
            ))}
          </ul>
        </div>
        <div className="setup-bottom-actions">
          <Button className="setup-primary-button" onClick={onContinue}>
            Start Camera
          </Button>
          <button className="setup-link-button" type="button" onClick={onAssistedCapture ?? onContinue}>
            Accessibility Options
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen-stack narrow" aria-labelledby="capture-prep-title">
      <ScreenHeader eyebrow="Capture preparation" title="Get ready for your face scan" id="capture-prep-title">
        <p>
          Browser capture uses guided RGB images only. It does not provide native TrueDepth geometry, depth maps, ARKit capture, or 3D reconstruction. Good
          lighting, one-face framing, and calm movement matter.
        </p>
      </ScreenHeader>
      <Card>
        <ul className="checklist">
          {preparationItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Card tone="info">
        <h2>Accessibility and limitations</h2>
        <p>
          Use assisted capture if another person will hold the phone, you need more time, or pose-by-pose capture is easier than a continuous movement. The
          existing upload fallback remains available for required RGB views.
        </p>
      </Card>
      <div className="button-row">
        <Button onClick={onContinue}>Get Started</Button>
        <Button variant="secondary" onClick={onAssistedCapture ?? onContinue}>
          Use assisted capture
        </Button>
      </div>
    </section>
  );
}
