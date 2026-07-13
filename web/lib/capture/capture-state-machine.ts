import type { CapturedAngleID, CaptureSource, ImageQualityReport } from "@/types/domain";

export type GuidedCaptureViewID =
  | "front"
  | "leftThreeQuarter"
  | "rightThreeQuarter"
  | "leftProfile"
  | "rightProfile"
  | "elevatedFront"
  | "loweredFront"
  | "hairlineDetail"
  | "facialHairDetail";

export type GuidedCaptureViewRequirement = "required" | "optional";
export type GuidedCaptureViewStatus = "pending" | "active" | "captured" | "qualityFailed" | "retakeRequested" | "skipped" | "abandoned";
export type GuidedCaptureSessionStatus = "active" | "requiredComplete" | "complete" | "abandoned";

export interface GuidedCaptureViewDefinition {
  id: GuidedCaptureViewID;
  label: string;
  requirement: GuidedCaptureViewRequirement;
  instruction: string;
}

export interface GuidedCaptureAttempt {
  id: string;
  source: CaptureSource;
  capturedAt: string;
  qualityState: ImageQualityReport["overallState"];
  blockingIssueCount: number;
  advisoryIssueCount: number;
  notes: string[];
}

export interface GuidedCaptureViewState {
  definition: GuidedCaptureViewDefinition;
  status: GuidedCaptureViewStatus;
  attempts: GuidedCaptureAttempt[];
  currentAttemptID?: string;
  retakeCount: number;
  abandonedAt?: string;
  abandonmentReason?: string;
  recoveredAt?: string;
  recoveryReason?: string;
}

export interface GuidedCaptureStateMachine {
  version: "web-rgb-multiview-state-1.0.0";
  createdAt: string;
  updatedAt: string;
  status: GuidedCaptureSessionStatus;
  currentViewID: GuidedCaptureViewID;
  views: Record<GuidedCaptureViewID, GuidedCaptureViewState>;
  completedRequiredCount: number;
  totalRequiredCount: number;
  completedOptionalCount: number;
  canContinueToReview: boolean;
  abandonedViewCount: number;
}

export interface GuidedCaptureSummary {
  status: GuidedCaptureSessionStatus;
  currentViewID: GuidedCaptureViewID;
  completedRequiredCount: number;
  totalRequiredCount: number;
  completedOptionalCount: number;
  failedViewIDs: GuidedCaptureViewID[];
  retakeRequestedViewIDs: GuidedCaptureViewID[];
  abandonedViewIDs: GuidedCaptureViewID[];
  canContinueToReview: boolean;
}

export const guidedCaptureViewDefinitions: readonly GuidedCaptureViewDefinition[] = [
  {
    id: "front",
    label: "Front",
    requirement: "required",
    instruction: "Front RGB view with one face centered, neutral expression, and even front lighting."
  },
  {
    id: "leftThreeQuarter",
    label: "Left three-quarter",
    requirement: "required",
    instruction: "Turn about 45 degrees left while keeping the full face visible and still."
  },
  {
    id: "rightThreeQuarter",
    label: "Right three-quarter",
    requirement: "required",
    instruction: "Turn about 45 degrees right while keeping the full face visible and still."
  },
  {
    id: "leftProfile",
    label: "Left profile",
    requirement: "required",
    instruction: "Show the left side profile with forehead, nose, lips, chin, and jaw visible."
  },
  {
    id: "rightProfile",
    label: "Right profile",
    requirement: "required",
    instruction: "Show the right side profile with forehead, nose, lips, chin, and jaw visible."
  },
  {
    id: "elevatedFront",
    label: "Slightly elevated front",
    requirement: "optional",
    instruction: "Optional front RGB detail from slightly above eye level when practical."
  },
  {
    id: "loweredFront",
    label: "Slightly lowered front",
    requirement: "optional",
    instruction: "Optional front RGB detail from slightly below eye level when practical."
  },
  {
    id: "hairlineDetail",
    label: "Hairline detail",
    requirement: "optional",
    instruction: "Optional RGB detail for hairline visibility when hair does not cover the face."
  },
  {
    id: "facialHairDetail",
    label: "Facial-hair detail",
    requirement: "optional",
    instruction: "Optional RGB detail for facial-hair visibility when present."
  }
];

export const capturedAngleToGuidedView: Record<CapturedAngleID, GuidedCaptureViewID> = {
  straightOn: "front",
  left45: "leftThreeQuarter",
  right45: "rightThreeQuarter",
  leftProfile: "leftProfile",
  rightProfile: "rightProfile"
};

export function createGuidedCaptureStateMachine(now = new Date()): GuidedCaptureStateMachine {
  const timestamp = now.toISOString();
  const views = guidedCaptureViewDefinitions.reduce(
    (record, definition, index) => ({
      ...record,
      [definition.id]: {
        definition,
        status: index === 0 ? "active" : "pending",
        attempts: [],
        retakeCount: 0
      } satisfies GuidedCaptureViewState
    }),
    {} as Record<GuidedCaptureViewID, GuidedCaptureViewState>
  );
  return recalculateStateMachine({
    version: "web-rgb-multiview-state-1.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "active",
    currentViewID: "front",
    views,
    completedRequiredCount: 0,
    totalRequiredCount: getRequiredViewIDs().length,
    completedOptionalCount: 0,
    canContinueToReview: false,
    abandonedViewCount: 0
  }, timestamp);
}

export function getRequiredViewIDs(): GuidedCaptureViewID[] {
  return guidedCaptureViewDefinitions.filter((definition) => definition.requirement === "required").map((definition) => definition.id);
}

export function getOptionalViewIDs(): GuidedCaptureViewID[] {
  return guidedCaptureViewDefinitions.filter((definition) => definition.requirement === "optional").map((definition) => definition.id);
}

export function selectGuidedCaptureView(
  machine: GuidedCaptureStateMachine,
  viewID: GuidedCaptureViewID,
  now = new Date()
): GuidedCaptureStateMachine {
  const timestamp = now.toISOString();
  return recalculateStateMachine(
    {
      ...machine,
      currentViewID: viewID,
      views: activateView(machine.views, viewID)
    },
    timestamp
  );
}

export function recordGuidedCaptureResult(
  machine: GuidedCaptureStateMachine,
  viewID: GuidedCaptureViewID,
  input: {
    source: CaptureSource;
    qualityReport?: Pick<ImageQualityReport, "overallState" | "blockingMessages" | "advisoryMessages">;
    notes?: string[];
    capturedAt?: Date;
  }
): GuidedCaptureStateMachine {
  const timestamp = (input.capturedAt ?? new Date()).toISOString();
  const qualityState = input.qualityReport?.overallState ?? "needsReview";
  const attempt: GuidedCaptureAttempt = {
    id: `${viewID}-${timestamp}-${machine.views[viewID].attempts.length + 1}`,
    source: input.source,
    capturedAt: timestamp,
    qualityState,
    blockingIssueCount: input.qualityReport?.blockingMessages.length ?? 0,
    advisoryIssueCount: input.qualityReport?.advisoryMessages.length ?? 0,
    notes: input.notes ?? []
  };
  const nextStatus: GuidedCaptureViewStatus = qualityState === "blocked" ? "qualityFailed" : "captured";
  const nextViewID = chooseNextViewID(machine, viewID);
  const updatedViews = mapViews(machine, viewID, (view) => ({
    ...view,
    status: nextStatus,
    attempts: [...view.attempts, attempt],
    currentAttemptID: attempt.id,
    abandonedAt: undefined,
    abandonmentReason: undefined,
    recoveredAt: view.status === "abandoned" ? timestamp : view.recoveredAt,
    recoveryReason: view.status === "abandoned" ? "Captured after recovery." : view.recoveryReason
  }));
  return recalculateStateMachine(
    {
      ...machine,
      currentViewID: nextViewID,
      views: nextStatus === "captured" ? activateView(updatedViews, nextViewID) : updatedViews
    },
    timestamp
  );
}

export function markGuidedCaptureQualityFailure(
  machine: GuidedCaptureStateMachine,
  viewID: GuidedCaptureViewID,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  const timestamp = now.toISOString();
  return recalculateStateMachine(
    {
      ...machine,
      currentViewID: viewID,
      views: mapViews(machine, viewID, (view) => ({
        ...view,
        status: "qualityFailed",
        attempts: view.attempts.length > 0 ? view.attempts.map((attempt, index) => (index === view.attempts.length - 1 ? { ...attempt, notes: [...attempt.notes, reason] } : attempt)) : view.attempts
      }))
    },
    timestamp
  );
}

export function requestGuidedCaptureRetake(
  machine: GuidedCaptureStateMachine,
  viewID: GuidedCaptureViewID,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  const timestamp = now.toISOString();
  return recalculateStateMachine(
    {
      ...machine,
      currentViewID: viewID,
      views: mapViews(machine, viewID, (view) => ({
        ...view,
        status: "retakeRequested",
        retakeCount: view.retakeCount + 1,
        attempts: view.attempts.map((attempt, index) => (index === view.attempts.length - 1 ? { ...attempt, notes: [...attempt.notes, reason] } : attempt))
      }))
    },
    timestamp
  );
}

export function abandonGuidedCaptureView(
  machine: GuidedCaptureStateMachine,
  viewID: GuidedCaptureViewID,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  const timestamp = now.toISOString();
  const nextViewID = chooseNextViewID(machine, viewID);
  const updatedViews = mapViews(machine, viewID, (view) => ({
    ...view,
    status: "abandoned",
    abandonedAt: timestamp,
    abandonmentReason: reason
  }));
  return recalculateStateMachine(
    {
      ...machine,
      currentViewID: nextViewID,
      views: activateView(updatedViews, nextViewID)
    },
    timestamp
  );
}

export function recoverGuidedCaptureView(
  machine: GuidedCaptureStateMachine,
  viewID: GuidedCaptureViewID,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  const timestamp = now.toISOString();
  return recalculateStateMachine(
    {
      ...machine,
      currentViewID: viewID,
      views: activateView(
        mapViews(machine, viewID, (view) => ({
          ...view,
          recoveredAt: timestamp,
          recoveryReason: reason
        })),
        viewID
      )
    },
    timestamp
  );
}

export function skipOptionalGuidedCaptureView(
  machine: GuidedCaptureStateMachine,
  viewID: GuidedCaptureViewID,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  const view = machine.views[viewID];
  if (view.definition.requirement === "required") {
    throw new Error(`Cannot skip required capture view: ${viewID}`);
  }
  const timestamp = now.toISOString();
  const nextViewID = chooseNextViewID(machine, viewID);
  const updatedViews = mapViews(machine, viewID, (candidate) => ({
    ...candidate,
    status: "skipped",
    abandonmentReason: reason
  }));
  return recalculateStateMachine(
    {
      ...machine,
      currentViewID: nextViewID,
      views: activateView(updatedViews, nextViewID)
    },
    timestamp
  );
}

export function abandonGuidedCaptureSession(
  machine: GuidedCaptureStateMachine,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  const timestamp = now.toISOString();
  const views = Object.fromEntries(
    Object.entries(machine.views).map(([viewID, view]) => [
      viewID,
      view.status === "captured" || view.status === "skipped"
        ? view
        : {
            ...view,
            status: "abandoned" as const,
            abandonedAt: timestamp,
            abandonmentReason: reason
          }
    ])
  ) as GuidedCaptureStateMachine["views"];
  return recalculateStateMachine({ ...machine, status: "abandoned", views }, timestamp, "abandoned");
}

export function recordCapturedAngleInStateMachine(
  machine: GuidedCaptureStateMachine,
  angleID: CapturedAngleID,
  input: Parameters<typeof recordGuidedCaptureResult>[2]
): GuidedCaptureStateMachine {
  return recordGuidedCaptureResult(machine, capturedAngleToGuidedView[angleID], input);
}

export function requestCapturedAngleRetakeInStateMachine(
  machine: GuidedCaptureStateMachine,
  angleID: CapturedAngleID,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  return requestGuidedCaptureRetake(machine, capturedAngleToGuidedView[angleID], reason, now);
}

export function markCapturedAngleFailureInStateMachine(
  machine: GuidedCaptureStateMachine,
  angleID: CapturedAngleID,
  reason: string,
  now = new Date()
): GuidedCaptureStateMachine {
  return markGuidedCaptureQualityFailure(machine, capturedAngleToGuidedView[angleID], reason, now);
}

export function summarizeGuidedCapture(machine: GuidedCaptureStateMachine): GuidedCaptureSummary {
  const views = Object.values(machine.views);
  return {
    status: machine.status,
    currentViewID: machine.currentViewID,
    completedRequiredCount: machine.completedRequiredCount,
    totalRequiredCount: machine.totalRequiredCount,
    completedOptionalCount: machine.completedOptionalCount,
    failedViewIDs: views.filter((view) => view.status === "qualityFailed").map((view) => view.definition.id),
    retakeRequestedViewIDs: views.filter((view) => view.status === "retakeRequested").map((view) => view.definition.id),
    abandonedViewIDs: views.filter((view) => view.status === "abandoned").map((view) => view.definition.id),
    canContinueToReview: machine.canContinueToReview
  };
}

function recalculateStateMachine(
  machine: GuidedCaptureStateMachine,
  updatedAt: string,
  forcedStatus?: GuidedCaptureSessionStatus
): GuidedCaptureStateMachine {
  const views = Object.values(machine.views);
  const requiredViews = views.filter((view) => view.definition.requirement === "required");
  const completedRequiredCount = requiredViews.filter((view) => view.status === "captured").length;
  const completedOptionalCount = views.filter((view) => view.definition.requirement === "optional" && view.status === "captured").length;
  const abandonedRequiredCount = requiredViews.filter((view) => view.status === "abandoned").length;
  const canContinueToReview = completedRequiredCount === requiredViews.length;
  const status =
    forcedStatus ??
    (abandonedRequiredCount > 0
      ? "active"
      : canContinueToReview && completedOptionalCount === getOptionalViewIDs().length
        ? "complete"
        : canContinueToReview
          ? "requiredComplete"
          : "active");
  return {
    ...machine,
    updatedAt,
    status,
    completedRequiredCount,
    totalRequiredCount: requiredViews.length,
    completedOptionalCount,
    canContinueToReview,
    abandonedViewCount: views.filter((view) => view.status === "abandoned").length
  };
}

function mapViews(
  machine: GuidedCaptureStateMachine,
  targetViewID: GuidedCaptureViewID,
  update: (view: GuidedCaptureViewState) => GuidedCaptureViewState
): GuidedCaptureStateMachine["views"] {
  return Object.fromEntries(
    Object.entries(machine.views).map(([viewID, view]) => [viewID, viewID === targetViewID ? update(view) : view])
  ) as GuidedCaptureStateMachine["views"];
}

function activateView(
  views: GuidedCaptureStateMachine["views"],
  targetViewID: GuidedCaptureViewID
): GuidedCaptureStateMachine["views"] {
  return Object.fromEntries(
    Object.entries(views).map(([viewID, view]) => {
      if (viewID === targetViewID && (view.status === "pending" || view.status === "qualityFailed" || view.status === "retakeRequested" || view.status === "abandoned" || view.status === "active")) {
        return [viewID, { ...view, status: "active" as const }];
      }
      if (view.status === "active") {
        return [viewID, { ...view, status: "pending" as const }];
      }
      return [viewID, view];
    })
  ) as GuidedCaptureStateMachine["views"];
}

function chooseNextViewID(machine: GuidedCaptureStateMachine, currentViewID: GuidedCaptureViewID): GuidedCaptureViewID {
  const definitions = guidedCaptureViewDefinitions;
  const startIndex = Math.max(definitions.findIndex((definition) => definition.id === currentViewID), 0);
  const afterCurrent = definitions.slice(startIndex + 1).find((definition) => {
    const view = machine.views[definition.id];
    return view.status === "pending" || view.status === "qualityFailed" || view.status === "retakeRequested";
  });
  if (afterCurrent) return afterCurrent.id;
  const unresolved = definitions.find((definition) => {
    const view = machine.views[definition.id];
    return definition.requirement === "required" && view.status !== "captured";
  });
  return unresolved?.id ?? currentViewID;
}
