import type { CapturedAngle, CapturedAngleID, TemporaryImageReference } from "@/types/domain";
import type { ActiveCaptureSession } from "@/lib/capture/capture-session";

export type PostScanAvatarPreviewSource = "scan" | "fallback";

export interface PostScanAvatarPreviewState {
  source: PostScanAvatarPreviewSource;
  imageUrl: string | null;
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
    const imageUrl = renderGameAvatarPortrait(image);
    return {
      source: "scan",
      imageUrl,
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

function renderGameAvatarPortrait(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const size = 768;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawSportsBackdrop(context, size);
  drawScannedFace(context, image, size);
  drawPlayerBust(context, size);
  drawPortraitFinish(context, size);

  return canvas.toDataURL("image/png");
}

function drawSportsBackdrop(context: CanvasRenderingContext2D, size: number) {
  const background = context.createLinearGradient(0, 0, size, size);
  background.addColorStop(0, "#111827");
  background.addColorStop(0.48, "#070a12");
  background.addColorStop(1, "#101723");
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);

  const light = context.createRadialGradient(size * 0.5, size * 0.16, 0, size * 0.5, size * 0.16, size * 0.56);
  light.addColorStop(0, "rgba(255,255,255,0.22)");
  light.addColorStop(0.32, "rgba(63,151,255,0.12)");
  light.addColorStop(1, "rgba(63,151,255,0)");
  context.fillStyle = light;
  context.fillRect(0, 0, size, size);

  context.save();
  context.globalAlpha = 0.24;
  context.strokeStyle = "rgba(255,255,255,0.22)";
  context.lineWidth = 2;
  for (let index = 0; index < 7; index += 1) {
    const x = size * (0.14 + index * 0.12);
    context.beginPath();
    context.moveTo(x, size * 0.03);
    context.lineTo(size * 0.5 + (x - size * 0.5) * 0.2, size * 0.45);
    context.stroke();
  }
  context.restore();
}

function drawScannedFace(context: CanvasRenderingContext2D, image: HTMLImageElement, size: number) {
  const portrait = {
    x: size * 0.18,
    y: size * 0.045,
    width: size * 0.64,
    height: size * 0.72
  };

  context.save();
  context.beginPath();
  context.ellipse(size * 0.5, size * 0.38, portrait.width * 0.43, portrait.height * 0.48, 0, 0, Math.PI * 2);
  context.clip();
  drawImageCover(context, image, portrait.x, portrait.y, portrait.width, portrait.height);
  context.globalCompositeOperation = "screen";
  const grade = context.createLinearGradient(portrait.x, portrait.y, portrait.x + portrait.width, portrait.y + portrait.height);
  grade.addColorStop(0, "rgba(112,185,255,0.16)");
  grade.addColorStop(0.52, "rgba(255,255,255,0.04)");
  grade.addColorStop(1, "rgba(48,209,88,0.08)");
  context.fillStyle = grade;
  context.fillRect(portrait.x, portrait.y, portrait.width, portrait.height);
  context.restore();

  context.save();
  context.beginPath();
  context.ellipse(size * 0.5, size * 0.38, portrait.width * 0.44, portrait.height * 0.49, 0, 0, Math.PI * 2);
  context.lineWidth = 8;
  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.stroke();
  context.lineWidth = 3;
  context.strokeStyle = "rgba(84,173,255,0.28)";
  context.stroke();
  context.restore();
}

function drawPlayerBust(context: CanvasRenderingContext2D, size: number) {
  context.save();
  const shoulderGradient = context.createLinearGradient(size * 0.5, size * 0.48, size * 0.5, size);
  shoulderGradient.addColorStop(0, "rgba(43,74,103,0.82)");
  shoulderGradient.addColorStop(1, "rgba(13,19,30,0.98)");
  context.fillStyle = shoulderGradient;
  context.beginPath();
  context.moveTo(size * 0.5, size * 0.54);
  context.bezierCurveTo(size * 0.72, size * 0.57, size * 0.9, size * 0.75, size * 0.94, size * 0.98);
  context.lineTo(size * 0.06, size * 0.98);
  context.bezierCurveTo(size * 0.1, size * 0.75, size * 0.28, size * 0.57, size * 0.5, size * 0.54);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(size * 0.34, size * 0.68);
  context.quadraticCurveTo(size * 0.5, size * 0.77, size * 0.66, size * 0.68);
  context.stroke();

  context.strokeStyle = "rgba(84,173,255,0.22)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(size * 0.24, size * 0.88);
  context.lineTo(size * 0.42, size * 0.66);
  context.moveTo(size * 0.76, size * 0.88);
  context.lineTo(size * 0.58, size * 0.66);
  context.stroke();
  context.restore();
}

function drawPortraitFinish(context: CanvasRenderingContext2D, size: number) {
  const vignette = context.createRadialGradient(size * 0.5, size * 0.44, size * 0.1, size * 0.5, size * 0.44, size * 0.56);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(0,0,0,0.08)");
  vignette.addColorStop(1, "rgba(0,0,0,0.44)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, size, size);

  context.strokeStyle = "rgba(48,209,88,0.34)";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(size * 0.5, size * 0.5, size * 0.49, 0, Math.PI * 2);
  context.stroke();
}

function drawImageCover(context: CanvasRenderingContext2D, image: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const sourceRatio = imageWidth / imageHeight;
  const targetRatio = dw / dh;

  let sx = 0;
  let sy = 0;
  let sw = imageWidth;
  let sh = imageHeight;

  if (sourceRatio > targetRatio) {
    sw = imageHeight * targetRatio;
    sx = (imageWidth - sw) / 2;
  } else {
    sh = imageWidth / targetRatio;
    sy = (imageHeight - sh) * 0.22;
  }

  context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}
