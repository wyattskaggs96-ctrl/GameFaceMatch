"use client";

import { useEffect, useState } from "react";
import { Alert, Card, LoadingState, ScreenHeader, StatusBadge } from "@/components/design-system";
import { createBundledCatalogRepository } from "@/lib/catalog/catalog-repository";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { GameCatalogManifest } from "@/types/domain";

export function GameCatalogStatus() {
  const [manifest, setManifest] = useState<GameCatalogManifest | null>(null);

  useEffect(() => {
    const repository = createBundledCatalogRepository();
    void repository.loadProductionManifest().then(setManifest);
  }, []);

  return (
    <section className="screen-stack narrow" aria-labelledby="catalog-title">
      <ScreenHeader eyebrow="Catalog status" title="College Football 27" id="catalog-title">
        <p>Only verified production catalog records can become user-facing recommendations.</p>
      </ScreenHeader>
      <Alert title={CATALOG_UNAVAILABLE_MESSAGE} tone="warning">
        An empty production catalog is valid. Invented production game records are not.
      </Alert>
      <Card>
        {manifest ? (
          <div className="metadata-list">
            <div>
              <span>Manifest</span>
              <strong>{manifest.catalogVersion.identifier}</strong>
            </div>
            <div>
              <span>UI records</span>
              <strong>{manifest.items.length}</strong>
            </div>
            <div>
              <span>Verification</span>
              <StatusBadge tone="warning">Not loaded</StatusBadge>
            </div>
          </div>
        ) : (
          <LoadingState label="Loading bundled manifest" />
        )}
      </Card>
    </section>
  );
}
