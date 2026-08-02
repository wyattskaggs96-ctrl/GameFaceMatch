#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dataPath = path.join(repositoryRoot, "data", "research", "fc26", "player_creator_research.json");
const allowedConfidence = new Set(["verified", "probable", "unclear", "not_shown"]);
const allowedControlTypes = new Set(["colorCarousel", "presetCarousel", "valueCarousel", "groupSelector", "slider", "unknown"]);

export function validateFc26PlayerCreatorResearch(research) {
  const errors = [];
  const warnings = [];

  requireField(research, "schemaVersion", "fc26-player-creator-research-v1", errors);
  requireField(research?.game, "gameID", "ea-sports-fc-26", errors);
  requireField(research, "sourceType", "shippingGameVideoResearch", errors);
  if (research?.productionEligible !== false) errors.push("FC26 research data must not be production eligible.");
  if (research?.game?.recommendationsEnabled !== false) errors.push("FC26 recommendations must remain disabled until a verified production catalog exists.");

  const sourceVideos = asArray(research?.sourceVideos, "sourceVideos", errors);
  const sourceVideoIDs = new Set();
  for (const video of sourceVideos) {
    if (!video.videoID) errors.push("Source video is missing videoID.");
    if (sourceVideoIDs.has(video.videoID)) errors.push(`Duplicate source video ID: ${video.videoID}`);
    sourceVideoIDs.add(video.videoID);
    if (video.opensSuccessfully !== true) errors.push(`Source video ${video.videoID ?? "unknown"} is not marked readable.`);
    if (!isSha256(video.sha256)) errors.push(`Source video ${video.videoID ?? "unknown"} has invalid SHA-256.`);
    if (!Number.isFinite(video.durationSeconds) || video.durationSeconds <= 0) errors.push(`Source video ${video.videoID ?? "unknown"} has invalid duration.`);
    if (!video.relativePath?.startsWith("source-media/Fc26/player-creator/")) {
      errors.push(`Source video ${video.videoID ?? "unknown"} must preserve a portable source-media path.`);
    }
  }

  const menuIDs = new Set();
  for (const menu of asArray(research?.menuHierarchy, "menuHierarchy", errors)) {
    if (!menu.menuID) errors.push("Menu entry is missing menuID.");
    if (menuIDs.has(menu.menuID)) errors.push(`Duplicate menu ID: ${menu.menuID}`);
    menuIDs.add(menu.menuID);
    validateConfidence(menu.confidence, `menu ${menu.menuID}`, errors);
    validateEvidence(menu.evidence, sourceVideoIDs, `menu ${menu.menuID}`, errors);
  }

  const controlIDs = new Set();
  for (const control of asArray(research?.controls, "controls", errors)) {
    if (!control.controlID) errors.push("Control entry is missing controlID.");
    if (controlIDs.has(control.controlID)) errors.push(`Duplicate control ID: ${control.controlID}`);
    controlIDs.add(control.controlID);
    if (!menuIDs.has(control.menuID)) errors.push(`Control ${control.controlID} references unknown menuID ${control.menuID}.`);
    if (!allowedControlTypes.has(control.controlType)) errors.push(`Control ${control.controlID} has unsupported controlType ${control.controlType}.`);
    if (control.rangeComplete === true && (!control.firstValueProven || !control.lastValueProven || !control.wrapProven)) {
      errors.push(`Control ${control.controlID} cannot claim a complete range without first, last, and wrap evidence.`);
    }
    if (control.controlType === "slider" && !hasCompleteSliderRange(control)) {
      errors.push(`Slider control ${control.controlID} must include min, max, step, and evidence before it can be validated.`);
    }
    for (const observation of asArray(control.observedValues, `${control.controlID}.observedValues`, errors)) {
      if (!observation.value) errors.push(`Control ${control.controlID} has an observed value without text.`);
      validateConfidence(observation.confidence, `${control.controlID} value ${observation.value}`, errors);
      validateEvidence(observation, sourceVideoIDs, `${control.controlID} value ${observation.value}`, errors);
    }
  }

  for (const unresolved of asArray(research?.unresolvedObservations, "unresolvedObservations", errors)) {
    if (unresolved.confidence !== "unclear" && unresolved.confidence !== "not_shown") {
      errors.push(`Unresolved observation ${unresolved.id ?? "unknown"} must use unclear or not_shown confidence.`);
    }
    if (unresolved.evidence) validateEvidence(unresolved.evidence, sourceVideoIDs, `unresolved observation ${unresolved.id}`, errors);
  }

  for (const missing of asArray(research?.notShownRequirements, "notShownRequirements", errors)) {
    if (missing.confidence !== "not_shown") errors.push(`Not-shown requirement ${missing.id ?? "unknown"} must use not_shown confidence.`);
  }

  const serialized = JSON.stringify(research);
  if (/College Football 27/i.test(serialized)) errors.push("FC26 research data must not contain College Football 27 catalog text.");
  if (/production[_ -]?approved/i.test(serialized)) warnings.push("FC26 research text mentions production approval; confirm it is a negative/non-production statement.");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      sourceVideos: sourceVideos.length,
      menuEntries: Array.isArray(research?.menuHierarchy) ? research.menuHierarchy.length : 0,
      controls: Array.isArray(research?.controls) ? research.controls.length : 0,
      unresolvedObservations: Array.isArray(research?.unresolvedObservations) ? research.unresolvedObservations.length : 0
    }
  };
}

function requireField(target, field, expected, errors) {
  if (!target || target[field] !== expected) errors.push(`Expected ${field} to equal ${expected}.`);
}

function asArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return [];
  }
  return value;
}

function validateConfidence(value, label, errors) {
  if (!allowedConfidence.has(value)) errors.push(`${label} has invalid confidence ${value}.`);
}

function validateEvidence(evidence, sourceVideoIDs, label, errors) {
  if (!evidence) {
    errors.push(`${label} is missing evidence.`);
    return;
  }
  if (!sourceVideoIDs.has(evidence.videoID)) errors.push(`${label} references unknown videoID ${evidence.videoID}.`);
  if (!Number.isFinite(evidence.timestampSeconds) || evidence.timestampSeconds < 0) {
    errors.push(`${label} has invalid timestampSeconds.`);
  }
}

function hasCompleteSliderRange(control) {
  return (
    Number.isFinite(control.range?.minimum) &&
    Number.isFinite(control.range?.maximum) &&
    Number.isFinite(control.range?.step) &&
    control.range?.evidence?.videoID &&
    Number.isFinite(control.range?.evidence?.timestampSeconds)
  );
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const research = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const report = validateFc26PlayerCreatorResearch(research);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}
