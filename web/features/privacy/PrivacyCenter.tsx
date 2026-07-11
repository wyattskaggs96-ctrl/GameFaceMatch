"use client";

import { useState } from "react";
import { Alert, Button, Card, ModalDialog, ScreenHeader, StatusBadge } from "@/components/design-system";
import { INDEPENDENT_APP_DISCLAIMER } from "@/lib/product-copy";
import { createDeletionConfirmation, getNetworkUploadStatus, type DataInventoryItem, type DeletionRecord, type DeletionScope } from "@/lib/privacy/data-lifecycle";
import type { SavedBuild } from "@/types/domain";

export function PrivacyCenter({
  inventory,
  deletionRecords,
  savedBuilds,
  deletionRecorded,
  onDeleteScope,
  onDeleteSavedBuild
}: {
  inventory: DataInventoryItem[];
  deletionRecords: DeletionRecord[];
  savedBuilds: SavedBuild[];
  deletionRecorded: boolean;
  onDeleteScope: (scope: DeletionScope) => void;
  onDeleteSavedBuild: (buildID: string) => void;
}) {
  const [pendingScope, setPendingScope] = useState<DeletionScope | null>(null);
  const [pendingBuildID, setPendingBuildID] = useState<string | null>(null);
  const uploadStatus = getNetworkUploadStatus();
  const confirmation = pendingScope ? createDeletionConfirmation(pendingScope) : null;

  function confirmDeletion() {
    if (pendingBuildID) {
      onDeleteSavedBuild(pendingBuildID);
      setPendingBuildID(null);
      return;
    }
    if (pendingScope) {
      onDeleteScope(pendingScope);
      setPendingScope(null);
    }
  }

  return (
    <section className="screen-stack" aria-labelledby="privacy-title">
      <ScreenHeader eyebrow="Privacy center" title="Local data controls" id="privacy-title">
        <p>Review what exists in this browser session, where it lives, and delete each category or everything at once.</p>
      </ScreenHeader>

      <div className="result-grid">
        <Card tone="info">
          <h2>Upload status</h2>
          <p>{uploadStatus.uploadsEnabled ? "Uploads enabled." : "No face images, screenshots, profiles, or builds have been uploaded."}</p>
        </Card>
        <Card tone="neutral">
          <h2>Identity recognition</h2>
          <p>GameFace Match does not identify people, verify identity, or match scans to names.</p>
        </Card>
        <Card tone="neutral">
          <h2>No sale of face data</h2>
          <p>This MVP has no advertising SDK, analytics SDK, broker sharing, cloud sync, or sale of face data.</p>
        </Card>
      </div>

      <Alert title="Independent companion" tone="info">
        {INDEPENDENT_APP_DISCLAIMER}
      </Alert>

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Data inventory</p>
          <h2>What is currently stored</h2>
        </div>
        <div className="inventory-list">
          {inventory.map((item) => (
            <article className="inventory-item" key={item.id}>
              <div className="status-row">
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.retention}</p>
                </div>
                <StatusBadge tone={item.currentlyStored ? "warning" : "success"}>{item.currentlyStored ? `${item.count} stored` : "Not stored"}</StatusBadge>
              </div>
              <dl className="metadata-list">
                <div>
                  <span>Storage</span>
                  <strong>{item.storageLocation}</strong>
                </div>
                <div>
                  <span>Uploaded</span>
                  <strong>{item.uploaded ? "Yes" : "No"}</strong>
                </div>
              </dl>
              {item.deleteAction ? (
                <Button variant="secondary" disabled={!item.currentlyStored && item.deleteAction !== "all-local-data"} onClick={() => setPendingScope(item.deleteAction ?? null)}>
                  Delete {item.label.toLowerCase()}
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Saved builds</p>
          <h2>Delete one build or all builds</h2>
        </div>
        {savedBuilds.length > 0 ? (
          <ul className="review-list">
            {savedBuilds.map((build) => (
              <li key={build.id}>
                <span>{build.id}</span>
                <Button variant="secondary" onClick={() => setPendingBuildID(build.id)}>
                  Delete this build
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-note">No saved builds are stored in this browser session.</p>
        )}
        <div className="button-row">
          <Button variant="secondary" disabled={savedBuilds.length === 0} onClick={() => setPendingScope("saved-builds")}>
            Delete all saved builds
          </Button>
          <Button variant="danger" onClick={() => setPendingScope("all-local-data")}>
            Delete everything local
          </Button>
        </div>
      </Card>

      <Card tone="neutral">
        <h2>Deletion records</h2>
        {deletionRecords.length > 0 ? (
          <ul className="message-list">
            {deletionRecords.map((record) => (
              <li key={`${record.scope}-${record.completedAt}`}>
                {record.scope} completed at {record.completedAt}
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-note">No deletion completion has been recorded yet.</p>
        )}
      </Card>

      {pendingScope || pendingBuildID ? (
        <ModalDialog
          title={pendingBuildID ? "Delete saved build?" : confirmation?.title ?? "Confirm deletion"}
          onDismiss={() => {
            setPendingScope(null);
            setPendingBuildID(null);
          }}
          actions={
            <>
              <Button variant="danger" onClick={confirmDeletion}>
                Confirm deletion
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPendingScope(null);
                  setPendingBuildID(null);
                }}
              >
                Cancel
              </Button>
            </>
          }
        >
          <p>This action only affects local browser data for this MVP. It does not contact a server because no upload service exists.</p>
        </ModalDialog>
      ) : null}

      {deletionRecorded ? (
        <Alert title="Deletion completion recorded." tone="success">
          Deletion records do not contain face images.
        </Alert>
      ) : null}
    </section>
  );
}
