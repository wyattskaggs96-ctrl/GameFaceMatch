"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, EmptyState, LoadingState, ScreenHeader, StatusBadge } from "@/components/design-system";
import { CATALOG_UNAVAILABLE_MESSAGE, PRODUCT_EXPLANATION } from "@/lib/product-copy";
import { createBuildInstructions, createResultsState, getTieGroups, summarizeCaptureQuality } from "@/lib/results/results-experience";
import { createSafeShareCard } from "@/lib/share/share-card";
import type { GameAppearanceMatch, StandardFaceProfile } from "@/types/domain";

export function ResultsExperience({
  profile,
  catalogIsEmpty,
  matches,
  errorMessage,
  isProcessing = false,
  onStartOver,
  canSaveBuild = false,
  onSaveBuild,
  onDeleteResult,
  catalogVersionID = "empty-production",
  catalogVerificationDate = null
}: {
  profile: StandardFaceProfile | null;
  catalogIsEmpty: boolean;
  matches?: GameAppearanceMatch[];
  errorMessage?: string | null;
  isProcessing?: boolean;
  onStartOver: () => void;
  canSaveBuild?: boolean;
  onSaveBuild?: (match: GameAppearanceMatch) => void;
  onDeleteResult?: () => void;
  catalogVersionID?: string;
  catalogVerificationDate?: string | null;
}) {
  const [selectedMatchID, setSelectedMatchID] = useState<string | null>(null);
  const [resultDeleted, setResultDeleted] = useState(false);
  const state = createResultsState({ profile, catalogIsEmpty, matches, errorMessage, isProcessing });
  const selectedMatch = state.matches.find((match) => match.id === selectedMatchID) ?? state.matches[0];
  const buildInstructions = selectedMatch ? createBuildInstructions(selectedMatch) : [];
  const shareCard = useMemo(() => createSafeShareCard({ match: selectedMatch, buildInstructions }), [selectedMatch, buildInstructions]);

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

      {state.kind === "processing" ? <LoadingState label={state.message} /> : null}

      {state.kind === "catalogUnavailable" ? (
        <CatalogUnavailableState
          captureSummary={summarizeCaptureQuality(profile)}
          catalogVersionID={catalogVersionID}
          catalogVerificationDate={catalogVerificationDate}
          onStartOver={onStartOver}
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
          buildInstructions={buildInstructions}
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
  onStartOver
}: {
  captureSummary: string;
  catalogVersionID: string;
  catalogVerificationDate: string | null;
  onStartOver: () => void;
}) {
  return (
    <>
      <EmptyState
        title={CATALOG_UNAVAILABLE_MESSAGE}
        action={
          <Button variant="secondary" onClick={onStartOver}>
            Start over
          </Button>
        }
      >
        <p>No production top-three results, labels, sliders, hairstyles, facial-hair options, or menu paths are displayed because none have been verified.</p>
      </EmptyState>
      <div className="result-grid">
        <Card tone="info">
          <h2>Capture-quality summary</h2>
          <p>{captureSummary}</p>
        </Card>
        <Card tone="warning">
          <h2>Build guide unavailable</h2>
          <p>Step-by-step instructions require exact verified game labels and navigation evidence from the production catalog.</p>
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
          </dl>
        </Card>
      </div>
    </>
  );
}

function TopThreeResults({
  matches,
  selectedMatch,
  buildInstructions,
  captureSummary,
  shareText,
  onSelectMatch,
  canSaveBuild,
  onSaveBuild,
  onDeleteResult,
  onStartOver
}: {
  matches: GameAppearanceMatch[];
  selectedMatch: GameAppearanceMatch;
  buildInstructions: ReturnType<typeof createBuildInstructions>;
  captureSummary: string;
  shareText: string;
  onSelectMatch: (matchID: string) => void;
  canSaveBuild: boolean;
  onSaveBuild?: (match: GameAppearanceMatch) => void;
  onDeleteResult: () => void;
  onStartOver: () => void;
}) {
  const tieGroups = getTieGroups(matches);
  return (
    <>
      <div className="result-grid">
        {matches.map((match) => (
          <Card className="result-card" tone={match.id === selectedMatch.id ? "info" : "neutral"} key={match.id}>
            <div className="status-row">
              <h2>Rank {match.rank}</h2>
              <StatusBadge tone={match.confidence.label === "high" ? "success" : match.confidence.label === "medium" ? "warning" : "info"}>
                {match.confidence.label} confidence
              </StatusBadge>
            </div>
            <p>{match.scoreLabel}</p>
            <strong className="result-score">{match.score}/100</strong>
            <p className="field-note">Catalog item: {match.catalogItem.stableInternalID}</p>
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
          <h2>Rank {selectedMatch.rank} explanation</h2>
          <p>{selectedMatch.explanation.summary}</p>
        </div>
        <div className="result-detail-grid">
          <ResultList title="Similarities" items={selectedMatch.explanation.strongestSimilarities} />
          <ResultList title="Differences" items={selectedMatch.explanation.largestDifferences} />
          <ResultList title="Confidence notes" items={selectedMatch.explanation.uncertaintyNotes} />
          <Card tone="neutral">
            <h3>Traceability</h3>
            <dl className="metadata-list">
              <div>
                <span>Catalog version</span>
                <strong>{selectedMatch.catalogVersion.identifier}</strong>
              </div>
              <div>
                <span>Catalog verified</span>
                <strong>{selectedMatch.catalogVersion.verifiedAt ?? "Not provided"}</strong>
              </div>
              <div>
                <span>Model version</span>
                <strong>{selectedMatch.modelVersion}</strong>
              </div>
              <div>
                <span>Capture quality</span>
                <strong>{captureSummary}</strong>
              </div>
            </dl>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <p className="eyebrow">Build instructions</p>
          <h2>Verified guide</h2>
        </div>
        {buildInstructions.length > 0 ? (
          <ol className="instruction-list">
            {buildInstructions.map((instruction) => (
              <li key={instruction.id}>
                <strong>
                  {instruction.sequenceNumber}. {instruction.menuCategory}: {instruction.verifiedGameLabel}
                </strong>
                <span>{instruction.navigationPath.length > 0 ? instruction.navigationPath.join(" > ") : instruction.detail}</span>
                <small>
                  {instruction.platform} | {instruction.gameVersion} | {instruction.mode} | {instruction.creationPath} | Verified{" "}
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

      <Card tone="info">
        <h2>Share card preview</h2>
        <pre className="share-preview">{shareText}</pre>
        <p className="field-note">Face images are excluded by default.</p>
      </Card>

      <div className="button-row">
        <Button onClick={() => onSaveBuild?.(selectedMatch)} disabled={!onSaveBuild || !canSaveBuild}>
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
    </>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card tone="neutral">
      <h3>{title}</h3>
      <ul className="message-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
