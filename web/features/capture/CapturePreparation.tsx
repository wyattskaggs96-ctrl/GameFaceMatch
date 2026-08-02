import { Button, Card, ScreenHeader } from "@/components/design-system";

const preparationItems = [
  "Remove glasses and headwear.",
  "Pull hair away from your face.",
  "Face a soft, even light.",
  "Hold the phone at eye level.",
  "Keep a neutral expression."
];

export function CapturePreparation({ onContinue, onAssistedCapture }: { onContinue: () => void; onAssistedCapture?: () => void }) {
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
