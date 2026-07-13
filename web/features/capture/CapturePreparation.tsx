import { Button, Card, ScreenHeader } from "@/components/design-system";

const preparationItems = [
  "Sit or stand upright with shoulders relaxed and your head in a natural position.",
  "Remove glasses where practical.",
  "Remove hats, headwear, helmets, masks, and anything covering key facial features.",
  "Pull hair away from your face when practical, especially around cheeks, forehead, and ears.",
  "Use soft, even front lighting. Avoid direct sun, hard overhead light, strong shadows, and bright windows behind you.",
  "Keep a neutral expression, relax your jaw, keep lips gently closed, and avoid talking or smiling.",
  "Keep one person in frame with your face centered and fully inside the image.",
  "Hold the phone around arm's length. Move closer or farther if guidance says your face is too small or too large.",
  "Use portrait orientation when practical and avoid digital zoom, beauty filters, and Portrait Mode blur.",
  "Avoid blur and motion. Wipe the camera lens before starting."
];

export function CapturePreparation({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="screen-stack narrow" aria-labelledby="capture-prep-title">
      <ScreenHeader eyebrow="Capture preparation" title="Five clean RGB angles" id="capture-prep-title">
        <p>
          Browser capture uses guided RGB images only. It does not provide native TrueDepth geometry, depth maps, ARKit capture, or 3D reconstruction.
          Good lighting, one-face framing, and complete angles matter.
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
          The app should not fail you solely because of hair, facial hair, makeup, facial differences, mobility limitations, or assistive needs. If a pose is
          hard to complete exactly, use the upload fallback or continue with documented limitations after blocking file checks are resolved.
        </p>
      </Card>
      <Button onClick={onContinue}>
        Check browser capability
      </Button>
    </section>
  );
}
