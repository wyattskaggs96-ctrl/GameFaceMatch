import fs from "node:fs";
import path from "node:path";
import type { Phase0CompletionArtifacts } from "./phase-zero-completion-dashboard";

const artifactPaths = {
  additionalAttributes: "data/phase-zero/additional_attributes.research.json",
  additionalAttributeRecapture: "data/phase-zero/additional_attributes_recapture_requirements.research.json",
  appearanceMenuGaps: "data/phase-zero/appearance_menu_gap_matrix.json",
  environment: "data/phase-zero/environment_manifest.research.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  facialHair: "data/phase-zero/facial_hair.research.json",
  facialHairColors: "data/phase-zero/facial_hair_colors.research.json",
  headRecapture: "data/phase-zero/head_template_recapture_list.research.json",
  heads: "data/phase-zero/heads.research.json",
  issues: "data/phase-zero/issues_register.research.json",
  menuMap: "data/phase-zero/menu_map.research.json",
  creationPaths: "data/phase-zero/creation_paths.research.json",
  researchExportManifest: "data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json",
  researchValidation: "data/research/cf27/reports/current-research-package-validation/current_research_package_validation.json",
  authoritativeRecaptureQueue: "data/research/cf27/reports/authoritative-recapture-queue/authoritative_recapture_queue.json",
  captureRequests: "data/phase-zero/capture_requests.json"
} satisfies Record<keyof Omit<Phase0CompletionArtifacts, "nowISO">, string>;

export function loadPhase0CompletionArtifacts(repositoryRoot = path.resolve(process.cwd(), "..")): Phase0CompletionArtifacts {
  return Object.fromEntries(
    Object.entries(artifactPaths).map(([key, relativePath]) => [
      key,
      readJSON(path.resolve(repositoryRoot, relativePath))
    ])
  ) as Phase0CompletionArtifacts;
}

function readJSON(absolutePath: string) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as unknown;
}
