"use client";

import { useEffect, useState } from "react";
import { Alert, Card, LoadingState, ScreenHeader, StatusBadge } from "@/components/design-system";
import { createBundledCatalogRepository, type CatalogRuntimeStatus } from "@/lib/catalog/catalog-repository";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";

export function GameCatalogStatus() {
  const [status, setStatus] = useState<CatalogRuntimeStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const repository = createBundledCatalogRepository();
    void repository
      .loadRuntimeStatus()
      .then((nextStatus) => {
        setStatus(nextStatus);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Catalog failed closed.");
      });
  }, []);

  const manifest = status?.manifest;

  return (
    <section className="screen-stack narrow" aria-labelledby="catalog-title">
      <ScreenHeader eyebrow="Catalog status" title="College Football 27" id="catalog-title">
        <p>Only verified production catalog records can become user-facing recommendations.</p>
      </ScreenHeader>
      <Alert title={CATALOG_UNAVAILABLE_MESSAGE} tone="warning">
        An empty production catalog is valid. Invented production game records are not.
      </Alert>
      <Card>
        {status && manifest ? (
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
              <StatusBadge tone={manifest.items.length > 0 ? "success" : "warning"}>{manifest.items.length > 0 ? "Loaded" : "Not loaded"}</StatusBadge>
            </div>
            <div>
              <span>Integrity</span>
              <strong>{status.integrity.state}</strong>
            </div>
            <div>
              <span>Compatibility</span>
              <strong>{status.compatibility.compatible ? "Compatible" : "Blocked"}</strong>
            </div>
            <div>
              <span>Staleness</span>
              <strong>{status.staleness.state}</strong>
            </div>
            <div>
              <span>Runtime errors</span>
              <strong>{status.runtimeErrors.length}</strong>
            </div>
          </div>
        ) : errorMessage ? (
          <Alert title="Catalog failed closed" tone="danger" role="alert">
            {errorMessage}
          </Alert>
        ) : (
          <LoadingState label="Loading bundled manifest" />
        )}
      </Card>
      {status?.staleness.state === "stale" ? (
        <Alert title="Catalog may be stale" tone="warning">
          {status.staleness.message}
        </Alert>
      ) : null}
    </section>
  );
}
