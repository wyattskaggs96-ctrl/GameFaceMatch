import { CATALOG_UNAVAILABLE_MESSAGE, PRODUCT_EXPLANATION } from "@/lib/product-copy";
import type { BuildInstruction, GameAppearanceMatch } from "@/types/domain";

export interface ShareCardInput {
  match?: GameAppearanceMatch;
  buildInstructions: BuildInstruction[];
  includeFaceImage?: boolean;
  faceImageObjectUrl?: string | null;
}

export interface ShareCard {
  title: string;
  text: string;
  includesFaceImage: boolean;
  faceImageObjectUrl?: string;
}

export function createSafeShareCard(input: ShareCardInput): ShareCard {
  const includesFaceImage = Boolean(input.includeFaceImage && input.faceImageObjectUrl);
  const settingsText =
    input.buildInstructions.length > 0
      ? input.buildInstructions.map((instruction) => `${instruction.sequenceNumber}. ${instruction.menuCategory}: ${instruction.verifiedGameLabel}`).join("\n")
      : CATALOG_UNAVAILABLE_MESSAGE;

  return {
    title: input.match ? "GameFace Match build guide" : "GameFace Match catalog status",
    text: [PRODUCT_EXPLANATION, settingsText, "Shared card defaults to text-only settings and does not include a face image unless explicitly enabled."]
      .filter(Boolean)
      .join("\n\n"),
    includesFaceImage,
    faceImageObjectUrl: includesFaceImage ? input.faceImageObjectUrl ?? undefined : undefined
  };
}
