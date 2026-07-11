import type {
  DetectedFaceLandmarks,
  FaceDetectionCount,
  FaceExpressionEstimate,
  FaceHeadPoseEstimate,
  FaceLandmarkConfidence,
  FaceLandmarkPoint,
  FaceLandmarkProviderMetadata,
  FaceLandmarkReport
} from "@/types/domain";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA } from "./face-landmark-provider";

interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}

interface CategoryScore {
  categoryName?: string;
  score?: number;
}

export interface MediaPipeFaceLandmarkerResultLike {
  faceLandmarks?: NormalizedLandmark[][];
  faceBlendshapes?: Array<{
    categories?: CategoryScore[];
  }>;
  facialTransformationMatrixes?: Array<{
    data?: number[] | Float32Array;
  }>;
}

const coreLandmarkIndexes: Array<{ label: string; index: number }> = [
  { label: "forehead top", index: 10 },
  { label: "nose tip", index: 1 },
  { label: "nose bridge", index: 6 },
  { label: "nose base", index: 2 },
  { label: "left nose wing", index: 98 },
  { label: "right nose wing", index: 327 },
  { label: "chin", index: 152 },
  { label: "left face edge", index: 234 },
  { label: "right face edge", index: 454 },
  { label: "left jaw", index: 172 },
  { label: "right jaw", index: 397 },
  { label: "left chin edge", index: 140 },
  { label: "right chin edge", index: 369 },
  { label: "left eye outer corner", index: 33 },
  { label: "left eye inner corner", index: 133 },
  { label: "right eye inner corner", index: 362 },
  { label: "right eye outer corner", index: 263 },
  { label: "left mouth corner", index: 61 },
  { label: "right mouth corner", index: 291 },
  { label: "upper lip", index: 13 },
  { label: "lower lip", index: 14 },
  { label: "left brow", index: 105 },
  { label: "right brow", index: 334 }
];

export function mapMediaPipeFaceLandmarkerResult(
  result: MediaPipeFaceLandmarkerResultLike,
  provider: FaceLandmarkProviderMetadata = MEDIAPIPE_FACE_LANDMARKER_METADATA,
  createdAt = new Date().toISOString()
): FaceLandmarkReport {
  const landmarkSets = result.faceLandmarks ?? [];
  const detectedFaceCount = landmarkSets.length;
  const faces = landmarkSets.map((landmarks, index) =>
    createDetectedFace(landmarks, result.faceBlendshapes?.[index]?.categories ?? [], result.facialTransformationMatrixes?.[index]?.data)
  );
  const faceCount = toFaceCount(detectedFaceCount);
  const blockingMessages =
    detectedFaceCount === 0
      ? ["No face was detected in this image."]
      : detectedFaceCount > 1
        ? ["Multiple faces were detected. Use an image with one person only."]
        : [];

  return {
    availabilityState: "available",
    faceCount,
    detectedFaceCount,
    faces,
    provider,
    confidence: detectedFaceCount === 1 ? confidence(0.76, "medium", "estimated") : confidence(0.4, "low", "estimated"),
    advisoryMessages: [
      "Landmarks are extracted locally from browser RGB images and are not identity recognition.",
      "Head pose, eye openness, mouth openness, and expression indicators are approximate quality signals."
    ],
    blockingMessages,
    createdAt
  };
}

export function toFaceCount(count: number): FaceDetectionCount {
  if (count === 0) return "zero";
  if (count === 1) return "one";
  return "multiple";
}

function createDetectedFace(
  landmarks: NormalizedLandmark[],
  blendshapes: CategoryScore[],
  transformationMatrix?: number[] | Float32Array
): DetectedFaceLandmarks {
  const boundingBox = createBoundingBox(landmarks);
  const coreLandmarks = coreLandmarkIndexes.flatMap(({ label, index }) => {
    const point = landmarks[index];
    return point ? [createPoint(label, index, point)] : [];
  });
  const expression = estimateExpression(landmarks, blendshapes);
  const approximateHeadPose = estimateHeadPose(transformationMatrix);
  return {
    boundingBox,
    coreLandmarks,
    approximateHeadPose,
    expression,
    confidence: confidence(coreLandmarks.length >= 8 ? 0.76 : 0.5, coreLandmarks.length >= 8 ? "medium" : "low", "estimated")
  };
}

function createBoundingBox(landmarks: NormalizedLandmark[]) {
  if (landmarks.length === 0) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      confidence: confidence(null, "unavailable", "notYetImplemented")
    };
  }
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: round(minX),
    y: round(minY),
    width: round(maxX - minX),
    height: round(maxY - minY),
    confidence: confidence(0.76, "medium", "estimated")
  };
}

function createPoint(label: string, sourceIndex: number, point: NormalizedLandmark): FaceLandmarkPoint {
  return {
    label,
    sourceIndex,
    x: round(point.x),
    y: round(point.y),
    z: Number.isFinite(point.z) ? round(point.z ?? 0) : null,
    confidence: confidence(0.7, "medium", "estimated")
  };
}

function estimateExpression(landmarks: NormalizedLandmark[], blendshapes: CategoryScore[]): FaceExpressionEstimate {
  const leftEye = ratioDistance(landmarks[159], landmarks[145], landmarks[33], landmarks[133]);
  const rightEye = ratioDistance(landmarks[386], landmarks[374], landmarks[362], landmarks[263]);
  const mouth = ratioDistance(landmarks[13], landmarks[14], landmarks[61], landmarks[291]);
  const smileScores = [findBlendshapeScore(blendshapes, "mouthSmileLeft"), findBlendshapeScore(blendshapes, "mouthSmileRight")].filter(
    (score): score is number => score !== null
  );
  const strongExpressionScores = blendshapes
    .map((category) => category.score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  const hasBlendshapeSupport = blendshapes.length > 0;
  return {
    leftEyeOpenness: leftEye,
    rightEyeOpenness: rightEye,
    mouthOpenness: mouth,
    smileLikelihood: smileScores.length > 0 ? round(smileScores.reduce((sum, score) => sum + score, 0) / smileScores.length) : null,
    strongExpressionLikelihood: hasBlendshapeSupport ? round(Math.max(...strongExpressionScores, 0)) : null,
    confidence: confidence(hasBlendshapeSupport ? 0.68 : 0.55, hasBlendshapeSupport ? "medium" : "low", "estimated"),
    availabilityState: leftEye !== null || rightEye !== null || mouth !== null || hasBlendshapeSupport ? "available" : "unavailable"
  };
}

function estimateHeadPose(matrix?: number[] | Float32Array): FaceHeadPoseEstimate {
  if (!matrix || matrix.length < 16) {
    return {
      yawDegrees: null,
      pitchDegrees: null,
      rollDegrees: null,
      confidence: confidence(null, "unavailable", "notYetImplemented"),
      availabilityState: "unavailable"
    };
  }
  const m00 = matrix[0];
  const m01 = matrix[1];
  const m02 = matrix[2];
  const m10 = matrix[4];
  const m11 = matrix[5];
  const m12 = matrix[6];
  const m20 = matrix[8];
  const m21 = matrix[9];
  const m22 = matrix[10];
  const pitch = Math.atan2(-m21, Math.sqrt(m20 * m20 + m22 * m22));
  const yaw = Math.atan2(m20, m22);
  const roll = Math.atan2(m01, m11);
  if (![pitch, yaw, roll, m00, m02, m10, m12].every(Number.isFinite)) {
    return {
      yawDegrees: null,
      pitchDegrees: null,
      rollDegrees: null,
      confidence: confidence(null, "unavailable", "notYetImplemented"),
      availabilityState: "unavailable"
    };
  }
  return {
    yawDegrees: round(toDegrees(yaw)),
    pitchDegrees: round(toDegrees(pitch)),
    rollDegrees: round(toDegrees(roll)),
    confidence: confidence(0.6, "medium", "estimated"),
    availabilityState: "available"
  };
}

function ratioDistance(a?: NormalizedLandmark, b?: NormalizedLandmark, widthA?: NormalizedLandmark, widthB?: NormalizedLandmark) {
  if (!a || !b || !widthA || !widthB) return null;
  const numerator = distance(a, b);
  const denominator = distance(widthA, widthB);
  if (denominator <= 0) return null;
  return round(numerator / denominator);
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findBlendshapeScore(categories: CategoryScore[], categoryName: string) {
  const score = categories.find((category) => category.categoryName === categoryName)?.score;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function confidence(score: number | null, label: FaceLandmarkConfidence["label"], evidence: FaceLandmarkConfidence["evidence"]): FaceLandmarkConfidence {
  return { score, label, evidence };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}
