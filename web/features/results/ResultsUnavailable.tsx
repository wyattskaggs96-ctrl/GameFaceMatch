import { Alert, EmptyState, ScreenHeader } from "@/components/design-system";
import { CATALOG_UNAVAILABLE_MESSAGE, PRODUCT_EXPLANATION } from "@/lib/product-copy";

export function ResultsUnavailable() {
  return (
    <section className="screen-stack narrow" aria-labelledby="results-title">
      <ScreenHeader eyebrow="Results" title="No match available yet" id="results-title">
        <p>{PRODUCT_EXPLANATION}</p>
      </ScreenHeader>
      <EmptyState title={CATALOG_UNAVAILABLE_MESSAGE}>
        <p>No head numbers, hairstyles, facial-hair options, sliders, or menu paths are displayed because none have been verified.</p>
      </EmptyState>
      <Alert title="Matching not implemented" tone="info">
        This task keeps the product shell honest and does not add facial analysis or production matching.
      </Alert>
    </section>
  );
}
