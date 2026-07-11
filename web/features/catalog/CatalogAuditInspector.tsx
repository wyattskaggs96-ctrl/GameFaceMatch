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
  const progressByState = countBy(items.map((item) => item.verificationState));
  const progressByCategory = countBy(items.map((item) => item.category || "Uncategorized"));
  const missingAssets = items.flatMap((item) => item.sourceImageReferences.filter((reference) => reference.trim().length === 0));
  const publicationReady = validation.ok && items.length > 0 && missingAssets.length === 0;
  const nextActions = getNextActions({ itemCount: items.length, validationOK: validation.ok, publicationReady });

  return (
    <section className="screen-stack" aria-labelledby="catalog-audit-title">
      <ScreenHeader eyebrow="Development-only catalog audit" title="Local catalog inspector" id="catalog-audit-title">
        <p>This local view summarizes bundled production catalog readiness and the manual audit workflow. It is hidden from production navigation.</p>
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
      <div className="card-grid">
        <Card>
          <h2>Console-side audit session</h2>
          <p className="supporting">Use this order beside the console. Every value must come from visible game evidence.</p>
          <ol className="compact-list">
            <li>Create an audit session and choose platform.</li>
            <li>Record game version, patch/build, Road to Glory creation path, and category.</li>
            <li>Enter the exact visible label or index, then capture the standard screenshot set.</li>
            <li>Add capture conditions, human annotations, and menu instructions with evidence.</li>
            <li>Route first review, second review, then publication package validation.</li>
          </ol>
        </Card>
        <Card>
          <h2>Required screenshot set</h2>
          <ul className="review-list">
            {["Straight-on", "Left 45 degrees", "Right 45 degrees", "Left profile", "Right profile"].map((angle) => (
              <li key={angle}>
                <span>{angle}</span>
                <strong>required</strong>
              </li>
            ))}
          </ul>
          <p className="supporting">Screenshots remain local audit evidence. They are not automatically copied to public web assets.</p>
        </Card>
        <Card>
          <h2>CSV workflow</h2>
          <p className="supporting">
            Bulk import/export is available through <code>node scripts/catalog-tools.mjs import-csv</code> and <code>export-csv</code>. Imported rows stay
            unverified until both review gates pass.
          </p>
          <p className="supporting">Columns include platform, game version, patch, creation path, category, label, five angle asset IDs, navigation evidence, and notes.</p>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h2>Progress by verification</h2>
          <ProgressList entries={progressByState} emptyLabel="No records loaded" />
        </Card>
        <Card>
          <h2>Progress by category</h2>
          <ProgressList entries={progressByCategory} emptyLabel="No categories discovered" />
        </Card>
        <Card>
          <h2>Next actions</h2>
          <ul className="compact-list">
            {nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
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

function ProgressList({ entries, emptyLabel }: { entries: Record<string, number>; emptyLabel: string }) {
  const rows = Object.entries(entries).sort(([left], [right]) => left.localeCompare(right));
  if (rows.length === 0) return <p className="supporting">{emptyLabel}</p>;
  return (
    <ul className="review-list">
      {rows.map(([label, count]) => (
        <li key={label}>
          <span>{label}</span>
          <strong>{count}</strong>
        </li>
      ))}
    </ul>
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

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    if (!value.trim()) return counts;
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function getNextActions(input: { itemCount: number; validationOK: boolean; publicationReady: boolean }) {
  if (input.itemCount === 0) {
    return [
      "Create an audit session from the local template.",
      "Record platform, game version, patch, and Road to Glory creation path.",
      "Discover categories from the shipping game before entering records."
    ];
  }
  if (!input.validationOK) return ["Fix validation errors before review or publication."];
  if (!input.publicationReady) return ["Complete screenshots, first review, second review, and checksum validation."];
  return ["Package is locally ready for owner review before any production import."];
}
