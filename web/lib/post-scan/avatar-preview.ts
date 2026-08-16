import type { CapturedAngle, CapturedAngleID, TemporaryImageReference } from "@/types/domain";
import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import { extractAvatarFeatureModelFromImage } from "@/lib/avatar/extract-avatar-features";
import { createGameFace3DAvatarConfig, isGameFace3DAvatarEnabled, type GameFace3DAvatarConfig } from "@/lib/avatar/gameface-3d-model";
import { renderGameAvatar } from "@/lib/avatar/render-game-avatar";

export type PostScanAvatarPreviewSource = "scan" | "fallback";

export interface PostScanAvatarPreviewState {
  source: PostScanAvatarPreviewSource;
  imageUrl: string | null;
  threeDConfig: GameFace3DAvatarConfig | null;
  selectedAngleID: CapturedAngleID | null;
  alt: string;
  fallbackReason?: "no-image" | "canvas-render-failed";
}

export interface PostScanAvatarSourceSelection {
  angleID: CapturedAngleID | null;
  image: TemporaryImageReference | null;
  reason: "front-capture" | "near-front-capture" | "fallback-no-image";
}

const NEAR_FRONT_ORDER: CapturedAngleID[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];

export function selectPostScanAvatarSourceImage(session: ActiveCaptureSession): PostScanAvatarSourceSelection {
  const completedWithImages = NEAR_FRONT_ORDER.map((angleID) => findCompletedImage(session, angleID)).filter(
    (entry): entry is { angleID: CapturedAngleID; image: TemporaryImageReference } => Boolean(entry?.image?.objectUrl)
  );

  const front = completedWithImages.find((entry) => entry.angleID === "straightOn");
  if (front) {
    return {
      angleID: front.angleID,
      image: front.image,
      reason: "front-capture"
    };
  }

  const nearFront = completedWithImages[0];
  if (nearFront) {
    return {
      angleID: nearFront.angleID,
      image: nearFront.image,
      reason: "near-front-capture"
    };
  }

  return {
    angleID: null,
    image: null,
    reason: "fallback-no-image"
  };
}

export async function createPostScanGameAvatarPreview(session: ActiveCaptureSession): Promise<PostScanAvatarPreviewState> {
  const selection = selectPostScanAvatarSourceImage(session);
  if (!selection.image?.objectUrl || typeof document === "undefined") {
    return createFallbackPostScanAvatarPreview("no-image");
  }

  try {
    const image = await loadImage(selection.image.objectUrl);
    const featureModel = await extractAvatarFeatureModelFromImage(image);
    const imageUrl = renderGameAvatar(featureModel).dataUrl;
    return {
      source: "scan",
      imageUrl,
      threeDConfig: isGameFace3DAvatarEnabled() ? createGameFace3DAvatarConfig(featureModel) : null,
      selectedAngleID: selection.angleID,
      alt: "GameFace player portrait generated locally from the completed scan"
    };
  } catch {
    return createFallbackPostScanAvatarPreview("canvas-render-failed");
  }
}

export function createFallbackPostScanAvatarPreview(fallbackReason: PostScanAvatarPreviewState["fallbackReason"] = "no-image"): PostScanAvatarPreviewState {
  return {
    source: "fallback",
    imageUrl: null,
    threeDConfig: null,
    selectedAngleID: null,
    alt: "Generic GameFace player silhouette",
    fallbackReason
  };
}

function findCompletedImage(session: ActiveCaptureSession, angleID: CapturedAngleID) {
  const angle = session.angles.find((candidate): candidate is CapturedAngle => candidate.id === angleID);
  if (!angle || angle.status !== "complete" || !angle.image) return null;
  return {
    angleID,
    image: angle.image
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Post-scan avatar source image could not be loaded."));
    image.decoding = "async";
    image.src = src;
  });
}
