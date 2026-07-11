import { Button, Card, ScreenHeader } from "@/components/design-system";

const preparationItems = [
  "Remove glasses where practical.",
  "Remove hats, headwear, helmets, masks, and anything covering key facial features.",
  "Pull hair away from your face when practical, especially around cheeks, forehead, and ears.",
  "Use even front lighting and avoid a bright window or strong light behind you.",
  "Keep a neutral expression, relax your jaw, and keep lips gently closed.",
  "Keep your face centered and capture one person only.",
  "Avoid blur and motion.",
  "Clean the camera lens before starting."
];

export function CapturePreparation({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="screen-stack narrow" aria-labelledby="capture-prep-title">
      <ScreenHeader eyebrow="Capture preparation" title="Five clean RGB angles" id="capture-prep-title">
        <p>Browser capture is convenient, but it does not provide native TrueDepth geometry. Good lighting and complete angles matter.</p>
      </ScreenHeader>
      <Card>
        <ul className="checklist">
          {preparationItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Button onClick={onContinue}>
        Check browser capability
      </Button>
    </section>
  );
}
