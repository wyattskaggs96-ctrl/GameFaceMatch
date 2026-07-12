"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  addPhase0MenuMapItem,
  buildPhase0MenuTree,
  createEmptyPhase0MenuMap,
  createPhase0MenuMapItem,
  exportReadablePhase0MenuTree,
  getPhase0MenuChildren,
  PHASE0_MENU_CONTROL_TYPES,
  PHASE0_MENU_LATER_EDITABILITY_STATES,
  PHASE0_MENU_RESET_BEHAVIORS,
  PHASE0_MENU_VERIFICATION_STATES,
  PHASE0_MENU_VISIBLE_LABEL_STATES,
  PHASE0_MENU_WRAP_BEHAVIORS,
  reorderPhase0MenuSiblings,
  validatePhase0MenuMap,
  type Phase0MenuControlType,
  type Phase0MenuLaterEditability,
  type Phase0MenuMap,
  type Phase0MenuResetBehavior,
  type Phase0MenuTreeNode,
  type Phase0MenuVisibleLabelState,
  type Phase0MenuWrapBehavior
} from "@/lib/phase-zero/phase-zero-menu-map";
import type { Phase0VerificationState } from "@/lib/phase-zero/phase-zero-domain";

interface MenuDraft {
  stableMenuID: string;
  parentMenuID: string;
  displayLabel: string;
  nativeLabel: string;
  nativeOrder: string;
  controlType: Phase0MenuControlType;
  minimum: string;
  maximum: string;
  step: string;
  defaultValue: string;
  totalValues: string;
  wrapBehavior: Phase0MenuWrapBehavior;
  visibleLabelState: Phase0MenuVisibleLabelState;
  advancedControl: boolean;
  resetBehavior: Phase0MenuResetBehavior;
  laterEditability: Phase0MenuLaterEditability;
  dependencyMenuID: string;
  dependencyCondition: string;
  dependencyEvidenceIDs: string;
  lockReason: string;
  lockEvidenceIDs: string;
  defectDescription: string;
  defectSeverity: "minor" | "major" | "blocking";
  defectEvidenceIDs: string;
  evidenceFileID: string;
  evidenceDescription: string;
  scrollToMenuID: string;
  scrollDirection: "up" | "down" | "left" | "right";
  scrollEvidenceIDs: string;
  scrollNotes: string;
  verifier: string;
  verificationStatus: Phase0VerificationState;
  notes: string;
}

const initialDraft: MenuDraft = {
  stableMenuID: "",
  parentMenuID: "",
  displayLabel: "",
  nativeLabel: "",
  nativeOrder: "1",
  controlType: "unknown",
  minimum: "",
  maximum: "",
  step: "",
  defaultValue: "",
  totalValues: "",
  wrapBehavior: "unknown",
  visibleLabelState: "unknown",
  advancedControl: false,
  resetBehavior: "unknown",
  laterEditability: "unknown",
  dependencyMenuID: "",
  dependencyCondition: "",
  dependencyEvidenceIDs: "",
  lockReason: "",
  lockEvidenceIDs: "",
  defectDescription: "",
  defectSeverity: "minor",
  defectEvidenceIDs: "",
  evidenceFileID: "",
  evidenceDescription: "",
  scrollToMenuID: "",
  scrollDirection: "down",
  scrollEvidenceIDs: "",
  scrollNotes: "",
  verifier: "",
  verificationStatus: "draft",
  notes: "Research draft awaiting direct evidence."
};

export function MenuMapEditor() {
  const [menuMap, setMenuMap] = useState<Phase0MenuMap>(() =>
    createEmptyPhase0MenuMap({
      mapID: "cf27-menu-map-draft",
      gameID: "college-football-27",
      creationPathID: "unconfirmed-creation-path",
      nowISO: new Date().toISOString()
    })
  );
  const [draft, setDraft] = useState<MenuDraft>(initialDraft);
  const validation = useMemo(() => validatePhase0MenuMap(menuMap), [menuMap]);
  const tree = useMemo(() => buildPhase0MenuTree(menuMap), [menuMap]);
  const readableTree = useMemo(() => exportReadablePhase0MenuTree(menuMap), [menuMap]);
  const currentSiblings = getPhase0MenuChildren(menuMap, draft.parentMenuID || null);

  function updateDraft<Key extends keyof MenuDraft>(key: Key, value: MenuDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function addMenuItem() {
    const item = createPhase0MenuMapItem({
      stableMenuID: draft.stableMenuID.trim(),
      parentMenuID: draft.parentMenuID.trim() || null,
      displayLabel: draft.displayLabel.trim(),
      nativeLabel: draft.nativeLabel.trim(),
      nativeOrder: Number.parseInt(draft.nativeOrder, 10),
      controlType: draft.controlType,
      minimum: parseOptionalNumber(draft.minimum),
      maximum: parseOptionalNumber(draft.maximum),
      step: parseOptionalNumber(draft.step),
      defaultValue: parseOptionalDefaultValue(draft.defaultValue),
      totalValues: parseOptionalInteger(draft.totalValues),
      wrapBehavior: draft.wrapBehavior,
      visibleLabelState: draft.visibleLabelState,
      advancedControl: draft.advancedControl,
      resetBehavior: draft.resetBehavior,
      laterEditability: draft.laterEditability,
      dependencies: draft.dependencyMenuID.trim() && draft.dependencyCondition.trim()
        ? [{
            id: `${draft.stableMenuID.trim()}-dependency-1`,
            dependsOnMenuID: draft.dependencyMenuID.trim(),
            condition: draft.dependencyCondition.trim(),
            evidenceFileIDs: splitIDs(draft.dependencyEvidenceIDs)
          }]
        : [],
      locks: draft.lockReason.trim()
        ? [{
            id: `${draft.stableMenuID.trim()}-lock-1`,
            reason: draft.lockReason.trim(),
            evidenceFileIDs: splitIDs(draft.lockEvidenceIDs)
          }]
        : [],
      defects: draft.defectDescription.trim()
        ? [{
            id: `${draft.stableMenuID.trim()}-defect-1`,
            description: draft.defectDescription.trim(),
            severity: draft.defectSeverity,
            evidenceFileIDs: splitIDs(draft.defectEvidenceIDs)
          }]
        : [],
      evidence: draft.evidenceFileID.trim()
        ? [{
            evidenceFileID: draft.evidenceFileID.trim(),
            description: draft.evidenceDescription.trim()
          }]
        : [],
      scrollingContinuationEvidence: draft.scrollToMenuID.trim()
        ? [{
            fromMenuID: draft.stableMenuID.trim(),
            toMenuID: draft.scrollToMenuID.trim(),
            direction: draft.scrollDirection,
            evidenceFileIDs: splitIDs(draft.scrollEvidenceIDs),
            notes: draft.scrollNotes.trim()
          }]
        : [],
      environmentID: "environment-unconfirmed",
      captureResearcher: "local-audit-operator",
      verifier: draft.verifier.trim() || null,
      verificationStatus: draft.verificationStatus,
      notes: draft.notes.trim()
    });
    setMenuMap((currentMap) => addPhase0MenuMapItem(currentMap, item, new Date().toISOString()));
    setDraft((currentDraft) => ({
      ...initialDraft,
      parentMenuID: currentDraft.parentMenuID,
      nativeOrder: String(currentSiblings.length + 2)
    }));
  }

  function normalizeSiblingOrder() {
    const orderedMenuIDs = [...currentSiblings].sort((first, second) => first.nativeOrder - second.nativeOrder).map((item) => item.stableMenuID);
    setMenuMap((currentMap) => reorderPhase0MenuSiblings(currentMap, draft.parentMenuID || null, orderedMenuIDs, new Date().toISOString()));
  }

  return (
    <section className="screen-stack" aria-labelledby="menu-map-editor-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="menu-map-editor-title">Hierarchical menu-map editor</h2>
        </div>
        <StatusBadge tone={validation.ok ? "success" : "warning"}>{validation.ok ? "valid draft" : "needs evidence"}</StatusBadge>
      </div>
      <p className="supporting">
        Build the observed menu tree from direct shipping-game evidence. Start blank, add parent or child menus, record control metadata, and keep
        duplicate labels as warnings because some games legitimately reuse labels.
      </p>
      <Alert title="No categories are assumed" tone="info">
        This editor does not seed College Football 27 categories or options. Every label, range, dependency, and defect must be entered from evidence.
      </Alert>
      <div className="card-grid">
        <Card>
          <h3>Add parent or child menu</h3>
          <div className="form-stack">
            <SelectField label="Parent menu" value={draft.parentMenuID} onChange={(event) => updateDraft("parentMenuID", event.currentTarget.value)}>
              <option value="">Root level</option>
              {menuMap.items.map((item) => (
                <option key={item.stableMenuID} value={item.stableMenuID}>
                  {item.displayLabel} ({item.stableMenuID})
                </option>
              ))}
            </SelectField>
            <TextField label="Stable menu ID" value={draft.stableMenuID} onChange={(event) => updateDraft("stableMenuID", event.currentTarget.value)} />
            <TextField label="Display label" value={draft.displayLabel} onChange={(event) => updateDraft("displayLabel", event.currentTarget.value)} />
            <TextField label="Native label" value={draft.nativeLabel} onChange={(event) => updateDraft("nativeLabel", event.currentTarget.value)} />
            <TextField label="Native order" inputMode="numeric" value={draft.nativeOrder} onChange={(event) => updateDraft("nativeOrder", event.currentTarget.value)} />
            <SelectField label="Control type" value={draft.controlType} onChange={(event) => updateDraft("controlType", event.currentTarget.value as Phase0MenuControlType)}>
              {PHASE0_MENU_CONTROL_TYPES.map((controlType) => (
                <option key={controlType} value={controlType}>{controlType}</option>
              ))}
            </SelectField>
          </div>
        </Card>
        <Card>
          <h3>Control behavior</h3>
          <div className="form-stack">
            <TextField label="Minimum" value={draft.minimum} onChange={(event) => updateDraft("minimum", event.currentTarget.value)} />
            <TextField label="Maximum" value={draft.maximum} onChange={(event) => updateDraft("maximum", event.currentTarget.value)} />
            <TextField label="Step" value={draft.step} onChange={(event) => updateDraft("step", event.currentTarget.value)} />
            <TextField label="Default value" value={draft.defaultValue} onChange={(event) => updateDraft("defaultValue", event.currentTarget.value)} />
            <TextField label="Total values" inputMode="numeric" value={draft.totalValues} onChange={(event) => updateDraft("totalValues", event.currentTarget.value)} />
            <SelectField label="Wrap behavior" value={draft.wrapBehavior} onChange={(event) => updateDraft("wrapBehavior", event.currentTarget.value as Phase0MenuWrapBehavior)}>
              {PHASE0_MENU_WRAP_BEHAVIORS.map((behavior) => <option key={behavior} value={behavior}>{behavior}</option>)}
            </SelectField>
            <SelectField label="Visible label state" value={draft.visibleLabelState} onChange={(event) => updateDraft("visibleLabelState", event.currentTarget.value as Phase0MenuVisibleLabelState)}>
              {PHASE0_MENU_VISIBLE_LABEL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </SelectField>
            <label className="form-field">
              <span>Advanced control</span>
              <input
                type="checkbox"
                checked={draft.advancedControl}
                onChange={(event) => updateDraft("advancedControl", event.currentTarget.checked)}
              />
            </label>
            <SelectField label="Reset behavior" value={draft.resetBehavior} onChange={(event) => updateDraft("resetBehavior", event.currentTarget.value as Phase0MenuResetBehavior)}>
              {PHASE0_MENU_RESET_BEHAVIORS.map((behavior) => <option key={behavior} value={behavior}>{behavior}</option>)}
            </SelectField>
            <SelectField label="Later editability" value={draft.laterEditability} onChange={(event) => updateDraft("laterEditability", event.currentTarget.value as Phase0MenuLaterEditability)}>
              {PHASE0_MENU_LATER_EDITABILITY_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </SelectField>
          </div>
        </Card>
        <Card>
          <h3>Evidence, locks, and defects</h3>
          <div className="form-stack">
            <TextField label="Full-screen evidence ID" value={draft.evidenceFileID} onChange={(event) => updateDraft("evidenceFileID", event.currentTarget.value)} />
            <TextField label="Full-screen evidence description" value={draft.evidenceDescription} onChange={(event) => updateDraft("evidenceDescription", event.currentTarget.value)} />
            <TextField label="Scroll continuation target menu ID" value={draft.scrollToMenuID} onChange={(event) => updateDraft("scrollToMenuID", event.currentTarget.value)} />
            <SelectField label="Scroll direction" value={draft.scrollDirection} onChange={(event) => updateDraft("scrollDirection", event.currentTarget.value as MenuDraft["scrollDirection"])}>
              {["up", "down", "left", "right"].map((direction) => <option key={direction} value={direction}>{direction}</option>)}
            </SelectField>
            <TextField label="Scroll continuation evidence IDs" value={draft.scrollEvidenceIDs} onChange={(event) => updateDraft("scrollEvidenceIDs", event.currentTarget.value)} note="Comma-separated evidence IDs." />
            <TextField label="Scroll notes" value={draft.scrollNotes} onChange={(event) => updateDraft("scrollNotes", event.currentTarget.value)} />
            <TextField label="Dependency menu ID" value={draft.dependencyMenuID} onChange={(event) => updateDraft("dependencyMenuID", event.currentTarget.value)} />
            <TextField label="Dependency condition" value={draft.dependencyCondition} onChange={(event) => updateDraft("dependencyCondition", event.currentTarget.value)} />
            <TextField label="Dependency evidence IDs" value={draft.dependencyEvidenceIDs} onChange={(event) => updateDraft("dependencyEvidenceIDs", event.currentTarget.value)} />
            <TextField label="Lock reason" value={draft.lockReason} onChange={(event) => updateDraft("lockReason", event.currentTarget.value)} />
            <TextField label="Lock evidence IDs" value={draft.lockEvidenceIDs} onChange={(event) => updateDraft("lockEvidenceIDs", event.currentTarget.value)} />
            <TextField label="Defect description" value={draft.defectDescription} onChange={(event) => updateDraft("defectDescription", event.currentTarget.value)} />
            <SelectField label="Defect severity" value={draft.defectSeverity} onChange={(event) => updateDraft("defectSeverity", event.currentTarget.value as MenuDraft["defectSeverity"])}>
              {["minor", "major", "blocking"].map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </SelectField>
            <TextField label="Defect evidence IDs" value={draft.defectEvidenceIDs} onChange={(event) => updateDraft("defectEvidenceIDs", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Verification</h3>
          <div className="form-stack">
            <SelectField label="Verification status" value={draft.verificationStatus} onChange={(event) => updateDraft("verificationStatus", event.currentTarget.value as Phase0VerificationState)}>
              {PHASE0_MENU_VERIFICATION_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </SelectField>
            <TextField label="Verifier" value={draft.verifier} onChange={(event) => updateDraft("verifier", event.currentTarget.value)} />
            <TextField label="Notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
            <div className="button-row">
              <Button onClick={addMenuItem}>Add menu item</Button>
              <Button variant="secondary" onClick={normalizeSiblingOrder}>Normalize sibling order</Button>
            </div>
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Validation</h3>
          {validation.errors.length === 0 ? <p className="supporting">No blocking menu-map errors.</p> : null}
          {validation.errors.length > 0 ? (
            <ul className="compact-list">
              {validation.errors.slice(0, 8).map((error) => <li key={`${error.code}-${error.menuID ?? error.message}`}>{error.message}</li>)}
            </ul>
          ) : null}
          {validation.warnings.length > 0 ? (
            <>
              <p className="supporting">Warnings needing operator review:</p>
              <ul className="compact-list">
                {validation.warnings.slice(0, 8).map((warning) => <li key={`${warning.code}-${warning.menuID ?? warning.message}`}>{warning.message}</li>)}
              </ul>
            </>
          ) : null}
        </Card>
        <Card>
          <h3>Readable menu tree</h3>
          {tree.length === 0 ? (
            <p className="supporting">No menu items recorded yet.</p>
          ) : (
            <pre aria-label="Readable menu tree">{readableTree}</pre>
          )}
        </Card>
      </div>
      {tree.length > 0 ? (
        <div className="result-grid" aria-label="Menu hierarchy">
          {tree.map((node) => <MenuNode key={node.item.stableMenuID} node={node} depth={0} />)}
        </div>
      ) : null}
    </section>
  );
}

function MenuNode({ node, depth }: { node: Phase0MenuTreeNode; depth: number }) {
  return (
    <>
      <Card>
        <div className="status-row">
          <h3 style={{ marginLeft: `${depth * 12}px` }}>{node.item.nativeOrder}. {node.item.displayLabel}</h3>
          <StatusBadge tone={node.item.verificationStatus === "verified" ? "success" : "warning"}>{node.item.verificationStatus}</StatusBadge>
        </div>
        <p className="supporting">
          {node.item.stableMenuID} - {node.item.controlType} - {node.item.visibleLabelState}
          {node.item.advancedControl ? " - advanced" : ""}
        </p>
      </Card>
      {node.children.map((child) => <MenuNode key={child.item.stableMenuID} node={child} depth={depth + 1} />)}
    </>
  );
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalDefaultValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}

function splitIDs(value: string) {
  return value.split(",").map((id) => id.trim()).filter(Boolean);
}
