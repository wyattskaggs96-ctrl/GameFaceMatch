import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_MAX_EVIDENCE_FILE_SIZE_BYTES,
  addEvidenceFilesToBatch,
  createEmptyEvidenceIntakeBatch,
  createEvidenceIntakeLocalStore,
  finalizeEvidenceIntakeBatch,
  removeEvidenceIntakeItem,
  updateEvidenceIntakeMetadata,
  validateEvidenceIntakeBatch,
  type Phase0EvidenceIntakeBatch,
  type Phase0EvidenceIntakeFileLike
} from "@/lib/phase-zero/phase-zero-evidence-intake";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 evidence intake manager", () => {
  it("documents metadata-only evidence intake schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/evidence-intake.schema.json"), "utf8"));

    expect(schema.required).toEqual(["schemaVersion", "batchID", "createdAt", "updatedAt", "items", "finalizedRecords"]);
    for (const field of ["classification", "catalogItemID", "environmentID", "derivativeState", "fileRole", "view", "notes"]) {
      expect(schema.$defs.metadata.required).toContain(field);
    }
    expect(schema.$defs.finalizedRecord.required).not.toContain("fileBytes");
  });

  it("adds drag-and-drop and folder-selected files without modifying original file metadata", () => {
    const batch = addEvidenceFilesToBatch(baseBatch(), [
      file({ name: "menu.png", webkitRelativePath: "audit/session-1/menu.png" }),
      file({ name: "folder-image.jpg", type: "image/jpeg", webkitRelativePath: "audit/session-1/views/folder-image.jpg" })
    ], "folderPicker", now);

    expect(batch.items).toHaveLength(2);
    expect(batch.items[0]).toMatchObject({
      originalFilename: "menu.png",
      relativeSourcePath: "audit/session-1/menu.png",
      source: "folderPicker",
      sizeBytes: 2048,
      mimeType: "image/png"
    });
    expect(batch.items[1].relativeSourcePath).toBe("audit/session-1/views/folder-image.jpg");
  });

  it("warns about duplicate filenames, invalid file types, and oversized files", () => {
    const batch = addEvidenceFilesToBatch(baseBatch(), [
      file({ name: "duplicate.png" }),
      file({ name: "duplicate.png" }),
      file({ name: "unsupported.exe", type: "application/x-msdownload" }),
      file({ name: "large.mp4", type: "video/mp4", size: PHASE0_MAX_EVIDENCE_FILE_SIZE_BYTES + 1 })
    ], "dragDrop", now);

    const codes = batch.items.flatMap((item) => item.warnings.map((warning) => warning.code));
    expect(codes).toEqual(expect.arrayContaining(["duplicateFilename", "invalidFileType", "oversizedFile", "missingMetadata"]));
  });

  it("requires classification, associations, master or derivative, view, and role before finalization", () => {
    const batch = addEvidenceFilesToBatch(baseBatch(), [file({ name: "front.png" })], "filePicker", now);
    const report = validateEvidenceIntakeBatch(batch);

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingMetadata");
  });

  it("requires catalog-item association when evidence is classified as catalog item evidence", () => {
    let batch = addEvidenceFilesToBatch(baseBatch(), [file({ name: "catalog.png" })], "filePicker", now);
    batch = updateEvidenceIntakeMetadata(batch, batch.items[0].intakeID, {
      classification: "catalogItem",
      environmentID: "environment-synthetic",
      derivativeState: "master",
      fileRole: "standardAngle",
      view: "straightOn"
    }, now);

    expect(validateEvidenceIntakeBatch(batch).errors.map((error) => error.code)).toContain("missingCatalogAssociation");
  });

  it("removes files before finalization", () => {
    let batch = addEvidenceFilesToBatch(baseBatch(), [file({ name: "remove-me.png" })], "filePicker", now);
    batch = removeEvidenceIntakeItem(batch, batch.items[0].intakeID, now);

    expect(batch.items[0].status).toBe("removed");
    expect(validateEvidenceIntakeBatch(batch).ok).toBe(false);
  });

  it("finalizes valid metadata while preserving original filename and excluding raw bytes", () => {
    let batch = addEvidenceFilesToBatch(baseBatch(), [file({ name: "front.png", size: 4096 })], "dragDrop", now);
    batch = completeMetadata(batch);
    const finalized = finalizeEvidenceIntakeBatch(batch, now);

    expect(finalized.finalizedRecords).toHaveLength(1);
    expect(finalized.finalizedRecords[0]).toMatchObject({
      originalFilename: "front.png",
      sizeBytes: 4096,
      mimeType: "image/png",
      source: "dragDrop"
    });
    expect(JSON.stringify(finalized.finalizedRecords[0])).not.toContain("fileBytes");
    expect(finalized.finalizedRecords[0].preservationNote).toMatch(/not modified, uploaded, or serialized/);
  });

  it("stores only finalized metadata in local storage", () => {
    const storage = fakeStorage();
    const store = createEvidenceIntakeLocalStore(storage);
    let batch = addEvidenceFilesToBatch(baseBatch(), [file({ name: "stored.png" })], "filePicker", now);
    batch = finalizeEvidenceIntakeBatch(completeMetadata(batch), now);

    store.save(batch.finalizedRecords);
    const raw = storage.getItem("gameface-match.phase0.evidence-intake.metadata.v1") ?? "";

    expect(store.load()).toHaveLength(1);
    expect(raw).toContain("stored.png");
    expect(raw).not.toContain("data:image");
    expect(raw).not.toContain("ArrayBuffer");
    store.clear();
    expect(store.load()).toEqual([]);
  });
});

function baseBatch(): Phase0EvidenceIntakeBatch {
  return createEmptyEvidenceIntakeBatch({
    batchID: "evidence-intake-synthetic",
    nowISO: now
  });
}

function completeMetadata(batch: Phase0EvidenceIntakeBatch): Phase0EvidenceIntakeBatch {
  return updateEvidenceIntakeMetadata(batch, batch.items[0].intakeID, {
    classification: "standardAngle",
    environmentID: "environment-synthetic",
    catalogItemID: null,
    derivativeState: "master",
    fileRole: "standardAngle",
    view: "straightOn",
    notes: "Synthetic intake metadata."
  }, now);
}

function file(overrides: Partial<Phase0EvidenceIntakeFileLike> = {}): Phase0EvidenceIntakeFileLike {
  return {
    name: "synthetic.png",
    size: 2048,
    type: "image/png",
    lastModified: 1783814400000,
    ...overrides
  };
}

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
}
