import fs from "node:fs";
import path from "node:path";
import { isSafeRepositoryRelativePath } from "./security-hardening";

export interface ResearchVideoInventoryFile {
  inventoryId: string;
  workingFilename: string;
  manifestOriginalFilename: string;
  discoveredFilename: string;
  absoluteDiscoveryPathInternal: string | null;
  portableRelativeEvidencePath: string;
}

export interface ResearchVideoResolveOptions {
  repositoryRoot: string;
  inventoryEntry: ResearchVideoInventoryFile;
  configuredVideoRoot?: string | null;
}

export function resolveResearchVideoPath(options: ResearchVideoResolveOptions) {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const configuredVideoRoot = options.configuredVideoRoot ? path.resolve(options.configuredVideoRoot) : null;
  const candidates = [
    ...configuredVideoRootCandidates(configuredVideoRoot, options.inventoryEntry),
    repositoryRelativeCandidate(repositoryRoot, options.inventoryEntry.portableRelativeEvidencePath)
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (isAllowedResearchVideoCandidate({ repositoryRoot, configuredVideoRoot, candidate }) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }
  return null;
}

export function isAllowedResearchVideoCandidate(input: {
  repositoryRoot: string;
  configuredVideoRoot?: string | null;
  candidate: string;
}) {
  const candidate = path.resolve(input.candidate);
  const repositoryRoot = path.resolve(input.repositoryRoot);
  const configuredVideoRoot = input.configuredVideoRoot ? path.resolve(input.configuredVideoRoot) : null;

  if (candidate.includes(`${path.sep}node_modules${path.sep}`) || candidate.includes(`${path.sep}.next${path.sep}`)) return false;

  if (isPathWithinRoot(candidate, repositoryRoot)) return true;
  if (configuredVideoRoot && isPathWithinRoot(candidate, configuredVideoRoot)) return true;
  return false;
}

function configuredVideoRootCandidates(configuredVideoRoot: string | null, inventoryEntry: ResearchVideoInventoryFile) {
  if (!configuredVideoRoot) return [];
  return [inventoryEntry.workingFilename, inventoryEntry.manifestOriginalFilename, inventoryEntry.discoveredFilename]
    .filter((fileName) => fileName.trim().length > 0 && !fileName.includes("/") && !fileName.includes("\\"))
    .map((fileName) => path.resolve(configuredVideoRoot, fileName));
}

function repositoryRelativeCandidate(repositoryRoot: string, portableRelativeEvidencePath: string) {
  if (!isSafeRepositoryRelativePath(portableRelativeEvidencePath)) return null;
  return path.resolve(repositoryRoot, portableRelativeEvidencePath);
}

function isPathWithinRoot(candidate: string, root: string) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
