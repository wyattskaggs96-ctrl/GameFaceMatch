"use client";

import { useState } from "react";
import { Alert, Button, Card, ModalDialog, ScreenHeader, StatusBadge } from "@/components/design-system";
import { RecoveryActionList } from "@/components/reliability";
import { INDEPENDENT_APP_DISCLAIMER } from "@/lib/product-copy";
import { createDeletionConfirmation, getNetworkUploadStatus, type DataInventoryItem, type DeletionRecord, type DeletionScope } from "@/lib/privacy/data-lifecycle";
import { getRecoveryPlan } from "@/lib/reliability/recovery-actions";
import type { SavedBuild } from "@/types/domain";
import { CONSENT_DEFINITIONS, CONSENT_VERSION, type ConsentID, type ConsentState } from "@/lib/privacy/consent";
import type { SavedProfileStorageStatus, SavedProfileSummary } from "@/lib/privacy/profile-storage";

export function PrivacyCenter({
  inventory,
  deletionRecords,
  savedBuilds,
  savedProfiles,
  savedProfileStatus,
  consentState,
  nonRawExportJson,
  deletionRecorded,
  onDeleteScope,
  onDeleteSavedBuild,
  onDeleteSavedProfile,
  onRevokeOptionalConsent
}: {
  inventory: DataInventoryItem[];
  deletionRecords: DeletionRecord[];
  savedBuilds: SavedBuild[];
  savedProfiles: SavedProfileSummary[];
  savedProfileStatus: SavedProfileStorageStatus;
  consentState: ConsentState;
  nonRawExportJson: string;
  deletionRecorded: boolean;
  onDeleteScope: (scope: DeletionScope) => void;
  onDeleteSavedBuild: (buildID: string) => void;
  onDeleteSavedProfile: (profileID: string) => void;
  onRevokeOptionalConsent: (consentID: ConsentID) => void;
}) {
  const [pendingScope, setPendingScope] = useState<DeletionScope | null>(null);
  const [pendingBuildID, setPendingBuildID] = useState<string | null>(null);
  const [pendingProfileID, setPendingProfileID] = useState<string | null>(null);
  const [exportVisible, setExportVisible] = useState(false);
  const uploadStatus = getNetworkUploadStatus();
  const confirmation = pendingScope ? createDeletionConfirmation(pendingScope) : null;
  const collectedItems = inventory.filter((item) => ["captured-image-bytes", "temporary-blob-urls", "screenshot-refinement-session"].includes(item.id));
  const processedItems = inventory.filter((item) => ["capture-session-metadata", "user-confirmed-attributes", "derived-profile"].includes(item.id));
  const savedItems = inventory.filter((item) => ["saved-profiles", "saved-builds", "deletion-records", "application-preferences", "consent-version"].includes(item.id));
  const optionalConsents = CONSENT_DEFINITIONS.filter((definition) => !definition.requiredForCapture);

  function downloadNonRawExport() {
    const blob = new Blob([nonRawExportJson], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "gameface-match-non-raw-export.json";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  function confirmDeletion() {
    if (pendingProfileID) {
      onDeleteSavedProfile(pendingProfileID);
      setPendingProfileID(null);
      return;
    }
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
        <Card tone="neutral">
          <h2>Raw-media retention</h2>
          <p>Raw camera and upload images are temporary by default. Saving raw images is not available in this MVP.</p>
        </Card>
      </div>

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Plain-language summary</p>
          <h2>Collected, processed, and saved</h2>
        </div>
        <div className="result-detail-grid">
          <DataSummary title="Collected temporarily" items={collectedItems} emptyText="No temporary raw media is currently stored." />
          <DataSummary title="Processed locally" items={processedItems} emptyText="No active profile-processing data is currently stored." />
          <DataSummary title="Saved non-raw data" items={savedItems} emptyText="No saved non-raw data is currently stored." />
          <Card tone="info">
            <h3>Retention</h3>
            <p>Raw media lasts only for the active capture or screenshot session. Derived profiles and builds are saved only after explicit action and remain local until deleted.</p>
            <p>No account, cloud sync, upload endpoint, analytics SDK, or external logging service is connected.</p>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Consent controls</p>
          <h2>Current consent version: {CONSENT_VERSION}</h2>
        </div>
        <div className="inventory-list">
          {optionalConsents.map((definition) => {
            const record = consentState[definition.id];
            const granted = Boolean(record?.granted);
            return (
              <article className="inventory-item" key={definition.id}>
                <div className="status-row">
                  <div>
                    <h3>{definition.label}</h3>
                    <p>{definition.description}</p>
                    <p className="field-note">Updated: {record?.updatedAt ?? "Not granted"}</p>
                  </div>
                  <StatusBadge tone={granted ? "warning" : definition.available ? "success" : "neutral"}>
                    {granted ? "Granted" : definition.available ? "Not granted" : "Unavailable"}
                  </StatusBadge>
                </div>
                <Button variant="secondary" disabled={!definition.available || !granted} onClick={() => onRevokeOptionalConsent(definition.id)}>
                  Revoke {definition.label.toLowerCase()}
                </Button>
              </article>
            );
          })}
        </div>
      </Card>

      <Alert title="Independent companion" tone="info">
        {INDEPENDENT_APP_DISCLAIMER}
      </Alert>

      <Card tone="neutral">
        <h2>Analytics and logs</h2>
        <p>The MVP uses local/no-op analytics only. Analytics validation rejects raw images, Blob URLs, camera frames, landmarks, precise measurements, embeddings, and profile payloads.</p>
        <p>Deletion records contain only scope and completion time, not images, landmarks, measurements, or profile contents.</p>
      </Card>

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
                  <span>Why</span>
                  <strong>{item.purpose}</strong>
                </div>
                <div>
                  <span>Leaves device</span>
                  <strong>{item.leavesDevice || item.uploaded ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span>How to delete</span>
                  <strong>{item.deletionDescription}</strong>
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
          <p className="eyebrow">Saved profiles</p>
          <h2>Delete one profile or all profiles</h2>
          <p className="supporting">{savedProfileStatus.encryptionDescription}</p>
        </div>
        {savedProfileStatus.lastError ? (
          <>
            <Alert title="Saved profile recovery" tone="warning" role="alert">
              {savedProfileStatus.lastError}
            </Alert>
            <RecoveryActionList plans={[getRecoveryPlan("saveFailure")]} />
          </>
        ) : null}
        {savedProfiles.length > 0 ? (
          <ul className="review-list">
            {savedProfiles.map((profile) => (
              <li key={profile.profileID}>
                <span>
                  {profile.profileID} | {profile.savedAt} | {profile.encryptionStatus}
                </span>
                <Button variant="secondary" onClick={() => setPendingProfileID(profile.profileID)}>
                  Delete this profile
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-note">No saved derived profiles are stored in this browser session.</p>
        )}
        <div className="button-row">
          <Button variant="secondary" disabled={savedProfiles.length === 0} onClick={() => setPendingScope("saved-profiles")}>
            Delete all saved profiles
          </Button>
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

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Export</p>
          <h2>Export saved non-raw data</h2>
          <p className="supporting">The export includes consent metadata, inventory summaries, saved profile summaries, saved build metadata, deletion records, and preferences. It excludes raw media, object URLs, landmarks, embeddings, and precise facial measurements.</p>
        </div>
        <div className="button-row">
          <Button variant="secondary" onClick={() => setExportVisible((visible) => !visible)}>
            {exportVisible ? "Hide non-raw export" : "Generate non-raw export"}
          </Button>
          <Button variant="secondary" onClick={downloadNonRawExport}>
            Download non-raw export
          </Button>
        </div>
        {exportVisible ? (
          <textarea className="export-preview" readOnly aria-label="Non-raw data export" value={nonRawExportJson} rows={12} />
        ) : null}
      </Card>

      <Card tone="info">
        <div className="section-heading">
          <p className="eyebrow">Reliability recovery</p>
          <h2>Local-only failure handling</h2>
        </div>
        <RecoveryActionList plans={[getRecoveryPlan("deletionFailure"), getRecoveryPlan("accountOrSyncFailure")]} />
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

      {pendingScope || pendingBuildID || pendingProfileID ? (
        <ModalDialog
          title={pendingProfileID ? "Delete saved profile?" : pendingBuildID ? "Delete saved build?" : confirmation?.title ?? "Confirm deletion"}
          onDismiss={() => {
            setPendingScope(null);
            setPendingBuildID(null);
            setPendingProfileID(null);
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
                  setPendingProfileID(null);
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

function DataSummary({ title, items, emptyText }: { title: string; items: DataInventoryItem[]; emptyText: string }) {
  const storedItems = items.filter((item) => item.currentlyStored);
  return (
    <Card tone={storedItems.length > 0 ? "warning" : "success"}>
      <h3>{title}</h3>
      {storedItems.length > 0 ? (
        <ul className="message-list">
          {storedItems.map((item) => (
            <li key={item.id}>
              {item.label}: {item.count} stored. {item.retention}
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-note">{emptyText}</p>
      )}
    </Card>
  );
}
