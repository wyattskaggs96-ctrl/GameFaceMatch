import { Alert, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { validateProductionCatalog } from "@/lib/catalog/catalog-validator";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { GameCatalogManifest } from "@/types/domain";

export function CatalogAuditInspector({ manifest }: { manifest: GameCatalogManifest }) {
  const validation = getValidationState(manifest);
  const items = manifest.items;
  const categories = unique(items.map((item) => item.category));
  const platforms = unique(items.map((item) => item.platform));
  const gameVersions = unique(items.map((item) => item.gameVersion));
  const missingAssets = items.flatMap((item) => item.sourceImageReferences.filter((reference) => reference.trim().length === 0));
  const publicationReady = validation.ok && items.length > 0 && missingAssets.length === 0;

  return (
    <section className="screen-stack" aria-labelledby="catalog-audit-title">
      <ScreenHeader eyebrow="Development-only catalog audit" title="Local catalog inspector" id="catalog-audit-title">
        <p>This local view summarizes bundled production catalog readiness. It is hidden from production navigation.</p>
      </ScreenHeader>
      <Alert title={items.length === 0 ? CATALOG_UNAVAILABLE_MESSAGE : "Catalog records present"} tone={items.length === 0 ? "warning" : "info"}>
        {items.length === 0 ? "The empty production catalog is valid, but no recommendations can be produced." : "Only verified production records may be shown to users."}
      </Alert>
      <div className="card-grid">
        <Card>
          <div className="status-row">
            <h2>Manifest status</h2>
            <StatusBadge tone={validation.ok ? "success" : "danger"}>{validation.ok ? "valid" : "invalid"}</StatusBadge>
          </div>
          <dl className="metadata-list">
            <div>
              <dt>Catalog version</dt>
              <dd>{manifest.catalogVersion.identifier}</dd>
            </div>
            <div>
              <dt>Production records</dt>
              <dd>{items.length}</dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>{manifest.generatedAt}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2>Coverage</h2>
          <dl className="metadata-list">
            <div>
              <dt>Categories</dt>
              <dd>{formatList(categories)}</dd>
            </div>
            <div>
              <dt>Platforms</dt>
              <dd>{formatList(platforms)}</dd>
            </div>
            <div>
              <dt>Game versions</dt>
              <dd>{formatList(gameVersions)}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <div className="status-row">
            <h2>Publication readiness</h2>
            <StatusBadge tone={publicationReady ? "success" : "warning"}>{publicationReady ? "ready" : "not ready"}</StatusBadge>
          </div>
          <p className="supporting">
            Publication requires verified records, complete required-angle assets, duplicate-ID checks, placeholder checks, and checksum validation.
          </p>
        </Card>
      </div>
      {!validation.ok ? (
        <Alert title="Validation failed" tone="danger" role="alert">
          {validation.message}
        </Alert>
      ) : null}
    </section>
  );
}

function getValidationState(manifest: GameCatalogManifest) {
  try {
    validateProductionCatalog(manifest);
    return { ok: true, message: "Catalog validates." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Catalog validation failed." };
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort();
}

function formatList(values: string[]) {
  return values.length === 0 ? "None loaded" : values.join(", ");
}
