"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, EmptyState, LoadingState, ScreenHeader, StatusBadge } from "@/components/design-system";
import { CATALOG_UNAVAILABLE_MESSAGE, PRODUCT_EXPLANATION } from "@/lib/product-copy";
import { createBuildInstructions, createRecommendationExplanationReport, createResultsState, getTieGroups, summarizeCaptureQuality } from "@/lib/results/results-experience";
import { createSafeShareCard } from "@/lib/share/share-card";
import type { AppearanceRecommendationCategory, GameAppearanceMatch, StandardFaceProfile, VerifiedAppearanceRecommendation } from "@/types/domain";

export function ResultsExperience({
  profile,
  catalogIsEmpty,
  matches,
  errorMessage,
  isProcessing = false,
  onStartOver,
  onRetryCatalog,
  canSaveBuild = false,
  onSaveBuild,
  onDeleteResult,
  catalogVersionID = "empty-production",
  catalogVerificationDate = null,
  catalogRecordCount = 0,
  catalogStatusMessage = "Catalog status unavailable.",
  catalogStalenessMessage = null,
  testDataMode = false,
  testDataLabel = "TEST DATA",
  shareDisabledMessage = "Sharing is disabled for test data."
}: {
  profile: StandardFaceProfile | null;
  catalogIsEmpty: boolean;
  matches?: GameAppearanceMatch[];
  errorMessage?: string | null;
  isProcessing?: boolean;
  onStartOver: () => void;
  onRetryCatalog?: () => void;
  canSaveBuild?: boolean;
  onSaveBuild?: (match: GameAppearanceMatch) => void;
  onDeleteResult?: () => void;
  catalogVersionID?: string;
  catalogVerificationDate?: string | null;
  catalogRecordCount?: number;
  catalogStatusMessage?: string;
  catalogStalenessMessage?: string | null;
  testDataMode?: boolean;
  testDataLabel?: string;
  shareDisabledMessage?: string;
}) {
  const [selectedMatchID, setSelectedMatchID] = useState<string | null>(null);
  const [resultDeleted, setResultDeleted] = useState(false);
  const state = createResultsState({ profile, catalogIsEmpty, matches, errorMessage, isProcessing });
  const selectedMatch = state.matches.find((match) => match.id === selectedMatchID) ?? state.matches[0];
  const recommendationReport = useMemo(() => createRecommendationExplanationReport({ profile, matches: state.matches }), [profile, state.matches]);
  const selectedRecommendation = selectedMatch ? recommendationReport.recommendations.find((recommendation) => recommendation.rank === selectedMatch.rank) : undefined;
  const shareBuildInstructions = selectedMatch ? createBuildInstructions(selectedMatch) : [];
  const shareCard = useMemo(() => createSafeShareCard({ match: selectedMatch, buildInstructions: shareBuildInstructions }), [selectedMatch, shareBuildInstructions]);

  if (resultDeleted) {
    return (
      <section className="screen-stack narrow" aria-labelledby="results-deleted-title">
        <ScreenHeader eyebrow="Results" title="Result deleted" id="results-deleted-title">
          <p>The current derived result view has been cleared from this local session.</p>
        </ScreenHeader>
        <Button onClick={onStartOver}>Start over</Button>
      </section>
    );
  }

  return (
    <section className="screen-stack" aria-labelledby="results-title">
      <ScreenHeader eyebrow="Results" title={state.title} id="results-title">
        <p>{PRODUCT_EXPLANATION}</p>
      </ScreenHeader>

      {testDataMode ? (
        <Alert title={`${testDataLabel} results`} tone="warning" role="alert">
          These recommendations come from fixture data for staging only. They are not real College Football 27 results and sharing is disabled.
        </Alert>
      ) : null}

      {state.kind === "processing" ? <LoadingState label={state.message} /> : null}

      {state.kind === "catalogUnavailable" ? (
        <CatalogUnavailableState
          captureSummary={summarizeCaptureQuality(profile)}
          catalogVersionID={catalogVersionID}
          catalogVerificationDate={catalogVerificationDate}
          catalogRecordCount={catalogRecordCount}
          catalogStatusMessage={catalogStatusMessage}
          catalogStalenessMessage={catalogStalenessMessage}
          onStartOver={onStartOver}
          onRetryCatalog={onRetryCatalog}
          onDeleteProfile={() => {
            onDeleteResult?.();
            setResultDeleted(true);
          }}
        />
      ) : null}

      {state.kind === "insufficientProfileData" ? (
        <EmptyState
          title={state.message}
          action={
            <Button variant="secondary" onClick={onStartOver}>
              Restart capture
            </Button>
          }
        >
          <p>Results need a local profile with all five required RGB angles. No production match was attempted.</p>
        </EmptyState>
      ) : null}

      {state.kind === "matchingError" ? (
        <Alert title="Matching error" tone="danger" role="alert">
          {state.message}
        </Alert>
      ) : null}

      {state.kind === "topThree" && selectedMatch ? (
        <TopThreeResults
          matches={state.matches}
          selectedMatch={selectedMatch}
          selectedRecommendation={selectedRecommendation}
          captureSummary={summarizeCaptureQuality(profile)}
          shareText={shareCard.text}
          onSelectMatch={setSelectedMatchID}
          canSaveBuild={canSaveBuild}
          onSaveBuild={onSaveBuild}
          onDeleteResult={() => {
            onDeleteResult?.();
            setResultDeleted(true);
          }}
          onStartOver={onStartOver}
          testDataMode={testDataMode}
          testDataLabel={testDataLabel}
          shareDisabledMessage={shareDisabledMessage}
        />
      ) : null}

      <div className="sr-only" role="status" aria-live="polite">
        Results state: {state.kind}. {state.message}
      </div>
    </section>
  );
}

function CatalogUnavailableState({
  captureSummary,
  catalogVersionID,
  catalogVerificationDate,
  catalogRecordCount,
  catalogStatusMessage,
  catalogStalenessMessage,
  onStartOver,
  onRetryCatalog,
  onDeleteProfile
}: {
  captureSummary: string;
  catalogVersionID: string;
  catalogVerificationDate: string | null;
  catalogRecordCount: number;
  catalogStatusMessage: string;
  catalogStalenessMessage: string | null;
  onStartOver: () => void;
  onRetryCatalog?: () => void;
  onDeleteProfile: () => void;
}) {
  return (
    <>
      <EmptyState
        title={CATALOG_UNAVAILABLE_MESSAGE}
        action={
          <div className="button-row">
            <Button variant="secondary" onClick={onRetryCatalog ?? onStartOver}>
              Check catalog status
            </Button>
            <Button variant="danger" onClick={onDeleteProfile}>
              Delete local profile
            </Button>
            <Button variant="secondary" onClick={onStartOver}>
              Start over
            </Button>
          </div>
        }
      >
        <p>Your capture and local profile review completed successfully. Real College Football 27 recommendations require a verified production catalog, and that catalog is not loaded yet.</p>
        <p>No production top-three results, labels, sliders, hairstyles, facial-hair options, or menu paths are displayed because none have been verified.</p>
      </EmptyState>
      <div className="result-grid">
        <Card tone="info">
          <h2>Ready</h2>
          <p>{captureSummary}</p>
          <p>Your derived face profile can stay local in this browser session while you check catalog status or retry later.</p>
        </Card>
        <Card tone="warning">
          <h2>Blocked</h2>
          <p>Verified game recommendations and step-by-step build instructions are blocked until approved College Football 27 catalog records are available.</p>
          <p>This is a catalog availability issue, not a capture mistake.</p>
        </Card>
        <Card tone="neutral">
          <h2>Catalog traceability</h2>
          <dl className="metadata-list">
            <div>
              <span>Catalog version</span>
              <strong>{catalogVersionID}</strong>
            </div>
            <div>
              <span>Catalog verified</span>
              <strong>{catalogVerificationDate ?? "Not verified"}</strong>
            </div>
            <div>
              <span>Verified records loaded</span>
              <strong>{catalogRecordCount}</strong>
            </div>
            <div>
              <span>Runtime status</span>
              <strong>{catalogStatusMessage}</strong>
            </div>
            <div>
              <span>Staleness</span>
              <strong>{catalogStalenessMessage ?? "No verified catalog date"}</strong>
            </div>
          </dl>
        </Card>
        <Card tone="info">
          <h2>Next options</h2>
          <ul className="message-list">
            <li>Keep the local derived profile and check catalog status again later.</li>
            <li>Delete the local derived profile if you do not want to keep it in this session.</li>
            <li>Start over only if you want to redo capture or profile confirmation.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function TopThreeResults({
  matches,
  selectedMatch,
  selectedRecommendation,
  captureSummary,
  shareText,
  onSelectMatch,
  canSaveBuild,
  onSaveBuild,
  onDeleteResult,
  onStartOver,
  testDataMode,
  testDataLabel,
  shareDisabledMessage
}: {
  matches: GameAppearanceMatch[];
  selectedMatch: GameAppearanceMatch;
  selectedRecommendation: ReturnType<typeof createRecommendationExplanationReport>["recommendations"][number] | undefined;
  captureSummary: string;
  shareText: string;
  onSelectMatch: (matchID: string) => void;
  canSaveBuild: boolean;
  onSaveBuild?: (match: GameAppearanceMatch) => void;
  onDeleteResult: () => void;
  onStartOver: () => void;
  testDataMode: boolean;
  testDataLabel: string;
  shareDisabledMessage: string;
}) {
  const tieGroups = getTieGroups(matches);
  const buildInstructions = selectedRecommendation?.stepByStepGameInstructions ?? [];
  const selectedPosition = selectedRecommendation?.position ?? resultPositionLabel(selectedMatch.rank);
  const selectedAppearanceRecommendations = selectedMatch.appearanceRecommendations ?? [];
  const selectedMissingCategories = selectedAppearanceRecommendations.filter((recommendation) => recommendation.status !== "selected");
  const selectedAdditionalControls = buildInstructions.filter((instruction) =>
    ["eyebrows", "skinPresentation", "otherVerifiedControl", "height", "weight", "bodySelection"].includes(instruction.instructionKind)
  );
  return (
    <>
      <div className="result-grid">
        {matches.map((match) => (
          <Card className="result-card" tone={match.id === selectedMatch.id ? "info" : "neutral"} key={match.id}>
            <div className="status-row">
              <h2>{resultPositionLabel(match.rank)}</h2>
              <StatusBadge tone={match.confidence.label === "high" ? "success" : match.confidence.label === "medium" ? "warning" : "info"}>
                {match.confidence.label} confidence
              </StatusBadge>
              {testDataMode ? <StatusBadge tone="warning">{testDataLabel}</StatusBadge> : null}
            </div>
            <p className="field-note">Rank {match.rank}</p>
            <p>{match.scoreLabel}</p>
            <strong className="result-score">{match.score}/100</strong>
            <dl className="metadata-list">
              <div>
                <span>Verified head</span>
                <strong>{match.catalogItem.visibleGameLabelOrIndex}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{Math.round(match.confidence.score * 100)}%</strong>
              </div>
              <div>
                <span>Catalog item</span>
                <strong>{match.catalogItem.stableInternalID}</strong>
              </div>
            </dl>
            <Button variant="secondary" onClick={() => onSelectMatch(match.id)}>
              View details
            </Button>
          </Card>
        ))}
      </div>

      {tieGroups.length > 0 ? (
        <Alert title="Tie comparison" tone="info">
          {tieGroups.map((group) => group.map((match) => `rank ${match.rank}`).join(" and ")).join("; ")} are tied at current matching precision.
        </Alert>
      ) : null}

      <Card className="match-detail-card">
        <div className="section-heading">
          <p className="eyebrow">Match details</p>
          <h2>
            {testDataMode ? `${testDataLabel} ` : ""}{selectedPosition} explanation
          </h2>
          <p>{selectedRecommendation?.scoreLabel ?? selectedMatch.scoreLabel} It does not identify a person.</p>
        </div>
        <div className="result-detail-grid">
          <Card tone="neutral">
            <h3>Verified settings</h3>
            <dl className="metadata-list">
              <div>
                <span>Verified head</span>
                <strong>{selectedMatch.catalogItem.visibleGameLabelOrIndex}</strong>
              </div>
              <div>
                <span>Hair</span>
                <strong>{appearanceValue(selectedAppearanceRecommendations, "hairstyle")}</strong>
              </div>
              <div>
                <span>Hair color</span>
                <strong>{appearanceValue(selectedAppearanceRecommendations, "hairColor")}</strong>
              </div>
              <div>
                <span>Facial hair</span>
                <strong>{appearanceValue(selectedAppearanceRecommendations, "facialHair")}</strong>
              </div>
              <div>
                <span>Facial-hair color</span>
                <strong>{appearanceValue(selectedAppearanceRecommendations, "facialHairColor")}</strong>
              </div>
              <div>
                <span>Additional controls</span>
                <strong>{selectedAdditionalControls.length > 0 ? `${selectedAdditionalControls.length} verified control(s)` : "No verified additional controls"}</strong>
              </div>
            </dl>
          </Card>
          <Card tone={selectedMatch.confidence.label === "low" ? "warning" : "info"}>
            <h3>Score and confidence</h3>
            <dl className="metadata-list">
              <div>
                <span>Match score</span>
                <strong>{selectedMatch.score}/100</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>
                  {selectedMatch.confidence.label} ({Math.round(selectedMatch.confidence.score * 100)}%)
                </strong>
              </div>
              <div>
                <span>Capture quality</span>
                <strong>{selectedRecommendation?.captureQuality ?? captureSummary}</strong>
              </div>
            </dl>
            {selectedMatch.confidence.label === "low" ? (
              <p className="field-note">Low-confidence results should be reviewed carefully because profile evidence, catalog annotation, or both are incomplete.</p>
            ) : null}
          </Card>
          <ResultList title="Key reasons" items={selectedRecommendation?.keyReasons ?? selectedMatch.explanation.strongestSimilarities} />
          <ResultList title="Key differences" items={selectedRecommendation?.keyDifferences ?? selectedMatch.explanation.largestDifferences} />
          <ResultList title="Confidence notes" items={selectedRecommendation?.uncertaintyNotes ?? selectedMatch.explanation.uncertaintyNotes} />
          <Card tone="neutral">
            <h3>Traceability</h3>
            <dl className="metadata-list">
              <div>
                <span>Catalog version</span>
                <strong>{selectedRecommendation?.catalogVersion ?? selectedMatch.catalogVersion.identifier}</strong>
              </div>
              <div>
                <span>Catalog verified</span>
                <strong>{selectedRecommendation?.verificationDate ?? "Not provided"}</strong>
              </div>
              <div>
                <span>Model version</span>
                <strong>{selectedMatch.modelVersion}</strong>
              </div>
              <div>
                <span>Capture quality</span>
                <strong>{selectedRecommendation?.captureQuality ?? captureSummary}</strong>
              </div>
            </dl>
          </Card>
          <ResultList
            title="Limitations"
            items={[
              "Scores compare available verified game options only.",
              "Scores are not identity probabilities.",
              "Browser RGB capture is not TrueDepth, ARKit, depth geometry, or 3D reconstruction.",
              ...(selectedRecommendation?.stepByStepGameInstructions.flatMap((instruction) => instruction.limitations) ?? [])
            ]}
          />
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Appearance controls</p>
          <h2>Verified and missing categories</h2>
        </div>
        {selectedAppearanceRecommendations.length > 0 ? (
          <dl className="metadata-list">
            {selectedAppearanceRecommendations.map((recommendation) => (
              <div key={recommendation.category}>
                <span>
                  {recommendation.label} ({recommendation.status})
                </span>
                <strong>{recommendation.nativeGameValue ?? "Missing verified value"}</strong>
              </div>
            ))}
          </dl>
        ) : (
          <Alert title="No appearance controls" tone="warning">
            This result has no verified hair, facial-hair, color, skin, or additional-control recommendations attached.
          </Alert>
        )}
        {selectedMissingCategories.length > 0 ? (
          <Alert title="Missing or ambiguous categories" tone="warning">
            {selectedMissingCategories.map((recommendation) => `${recommendation.label}: ${recommendation.explanation}`).join(" ")}
          </Alert>
        ) : null}
      </Card>

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Build instructions</p>
          <h2>{testDataMode ? `${testDataLabel} guide` : "Verified guide"}</h2>
        </div>
        {buildInstructions.length > 0 ? (
          <ol className="instruction-list">
            {buildInstructions.map((instruction) => (
              <li key={`${selectedMatch.id}-step-${instruction.stepNumber}`}>
                <strong>
                  {instruction.stepNumber}. {instruction.menuCategory}: {instruction.exactVerifiedGameLabel}
                </strong>
                <span>{instruction.navigationPath.join(" > ")}</span>
                <small>
                  {instruction.platform} | {instruction.gameVersion} | Patch {instruction.patchVersion ?? "not provided"} | {instruction.mode} | {instruction.creationPath} | Verified{" "}
                  {instruction.verificationDate ?? "not provided"}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <Alert title="No build instructions" tone="warning">
            This match has no verified navigation instructions attached.
          </Alert>
        )}
      </Card>

      {testDataMode ? (
        <Alert title="Share disabled for TEST DATA" tone="warning">
          {shareDisabledMessage}
        </Alert>
      ) : (
        <Card tone="info">
          <h2>Share card preview</h2>
          <pre className="share-preview">{shareText}</pre>
          <p className="field-note">Face images are excluded by default.</p>
        </Card>
      )}

      <div className="button-row">
        <Button onClick={() => onSaveBuild?.(selectedMatch)} disabled={testDataMode || !onSaveBuild || !canSaveBuild}>
          Save build
        </Button>
        <Button variant="danger" onClick={onDeleteResult}>
          Delete result
        </Button>
        <Button variant="secondary" onClick={onStartOver}>
          Start over
        </Button>
      </div>
      {!canSaveBuild ? (
        <Alert title="Build saving needs separate consent" tone="warning">
          Saving a completed build stores non-image build and profile information only after the saved-build consent is enabled.
        </Alert>
      ) : null}
      {testDataMode ? (
        <Alert title="Saving disabled for TEST DATA" tone="warning">
          Staging recommendations cannot be saved as completed builds.
        </Alert>
      ) : null}
    </>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card tone="neutral">
      <h3>{title}</h3>
      <ul className="message-list">
        {Array.from(new Set(items)).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

function resultPositionLabel(rank: number) {
  if (rank === 1) return "Best match";
  if (rank === 2) return "Second match";
  if (rank === 3) return "Third match";
  return `Rank ${rank}`;
}

function appearanceValue(recommendations: VerifiedAppearanceRecommendation[], category: AppearanceRecommendationCategory) {
  const recommendation = recommendations.find((candidate) => candidate.category === category);
  if (!recommendation) return "Not available";
  if (recommendation.status !== "selected") return `${recommendation.status}: ${recommendation.nativeGameValue ?? "missing verified value"}`;
  return recommendation.nativeGameValue ?? "Missing verified value";
}
