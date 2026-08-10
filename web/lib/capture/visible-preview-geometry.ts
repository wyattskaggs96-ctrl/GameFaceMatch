import type { FaceBoundingBox } from "@/types/domain";

export interface VisiblePreviewGeometry {
  sourceWidth: number;
  sourceHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  objectFit: "cover";
  mirrored: boolean;
}

export interface VisiblePreviewCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectedVisibleFaceBox {
  boundingBox: FaceBoundingBox;
  crop: VisiblePreviewCrop;
}

export function createObjectFitCoverVisiblePreview(input: {
  sourceWidth: number;
  sourceHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  mirrored?: boolean;
}): VisiblePreviewGeometry | null {
  if (![input.sourceWidth, input.sourceHeight, input.renderedWidth, input.renderedHeight].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }
  return {
    sourceWidth: input.sourceWidth,
    sourceHeight: input.sourceHeight,
    renderedWidth: input.renderedWidth,
    renderedHeight: input.renderedHeight,
    objectFit: "cover",
    mirrored: Boolean(input.mirrored)
  };
}

export function getObjectFitCoverVisibleCrop(geometry: VisiblePreviewGeometry): VisiblePreviewCrop {
  const sourceAspect = geometry.sourceWidth / geometry.sourceHeight;
  const renderedAspect = geometry.renderedWidth / geometry.renderedHeight;

  if (sourceAspect > renderedAspect) {
    const visibleWidth = renderedAspect / sourceAspect;
    return {
      x: (1 - visibleWidth) / 2,
      y: 0,
      width: visibleWidth,
      height: 1
    };
  }

  const visibleHeight = sourceAspect / renderedAspect;
  return {
    x: 0,
    y: (1 - visibleHeight) / 2,
    width: 1,
    height: visibleHeight
  };
}

export function projectFaceBoxToVisiblePreview(box: FaceBoundingBox, geometry?: VisiblePreviewGeometry | null): ProjectedVisibleFaceBox {
  if (!geometry) {
    return {
      boundingBox: box,
      crop: { x: 0, y: 0, width: 1, height: 1 }
    };
  }

  const crop = getObjectFitCoverVisibleCrop(geometry);
  const projectedX = (box.x - crop.x) / crop.width;
  const projectedY = (box.y - crop.y) / crop.height;
  const projectedWidth = box.width / crop.width;
  const projectedHeight = box.height / crop.height;
  const mirroredX = geometry.mirrored ? 1 - (projectedX + projectedWidth) : projectedX;

  return {
    crop,
    boundingBox: {
      ...box,
      x: round(mirroredX),
      y: round(projectedY),
      width: round(projectedWidth),
      height: round(projectedHeight)
    }
  };
}

export function faceBoxCenter(box: FaceBoundingBox) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
