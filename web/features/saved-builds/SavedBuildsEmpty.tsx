import { Button, Card, EmptyState, ScreenHeader } from "@/components/design-system";
import type { SavedBuild } from "@/types/domain";

export function SavedBuildsEmpty({
  savedBuilds = [],
  onDeleteSavedBuild
}: {
  savedBuilds?: SavedBuild[];
  onDeleteSavedBuild?: (buildID: string) => void;
}) {
  return (
    <section className="screen-stack narrow" aria-labelledby="saved-title">
      <ScreenHeader eyebrow="Saved builds" title={savedBuilds.length > 0 ? "Saved non-image builds" : "Nothing saved"} id="saved-title">
        <p>Saved builds use local browser storage only after a user explicitly saves derived results. Raw face images are not included.</p>
      </ScreenHeader>
      {savedBuilds.length === 0 ? (
        <EmptyState title="No saved builds on this browser.">
          <p>Raw face images are not stored in localStorage.</p>
        </EmptyState>
      ) : (
        <Card>
          <ul className="review-list">
            {savedBuilds.map((build) => (
              <li key={build.id}>
                <span>
                  {build.id} | {build.createdAt}
                </span>
                <Button variant="secondary" onClick={() => onDeleteSavedBuild?.(build.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
