import { clamp, clampUnit, colorToHex, mixColor, type AvatarFeatureModel } from "@/lib/avatar/avatar-feature-model";

export interface RenderedGameAvatar {
  svg: string;
  dataUrl: string;
}

export function renderGameAvatar(model: AvatarFeatureModel): RenderedGameAvatar {
  const svg = renderGameAvatarSvg(model);
  return {
    svg,
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  };
}

export function renderGameAvatarSvg(model: AvatarFeatureModel) {
  const skin = colorToHex(model.skinTone);
  const skinLight = colorToHex(model.skinHighlightTone);
  const skinShadow = colorToHex(model.skinShadowTone);
  const cheek = colorToHex(mixColor(model.skinTone, { r: 233, g: 111, b: 112 }, 0.16));
  const hair = colorToHex(model.hairTone);
  const brow = colorToHex(model.browTone);
  const iris = colorToHex(model.eyeIrisTone);
  const lip = colorToHex(model.lipTone);
  const facialHair = colorToHex(model.facialHairTone);
  const headWidth = lerp(232, 312, model.faceWidth);
  const headHeight = lerp(304, 386, model.faceHeight);
  const cheekWidth = lerp(headWidth * 0.84, headWidth * 1.08, model.cheekWidth);
  const jawWidth = lerp(headWidth * 0.44, headWidth * 0.76, model.jawWidth);
  const foreheadWidth = lerp(headWidth * 0.72, headWidth * 1.02, model.foreheadWidth);
  const jawRoundness = lerp(34, 76, model.jawRoundness);
  const cx = 384 + model.headTilt * 18;
  const topY = 130;
  const chinY = topY + headHeight;
  const eyeY = topY + lerp(126, 150, model.browHeight);
  const eyeGap = lerp(74, 112, model.eyeSpacing);
  const eyeWidth = lerp(28, 43, model.eyeWidth);
  const eyeHeight = lerp(8, 14, model.eyeHeight);
  const browThickness = lerp(8, 16, model.browThickness);
  const noseWidth = lerp(34, 60, model.noseWidth);
  const noseLength = lerp(78, 122, model.noseLength);
  const mouthWidth = lerp(70, 112, model.mouthWidth);
  const lipFullness = lerp(6, 14, model.lipFullness);
  const hairDrop = lerp(18, 58, model.hairCoverage);
  const hairAlpha = clamp(0.22 + model.hairPresence * 0.78, 0, 1).toFixed(2);
  const facialHairAlpha = clamp(model.facialHairPresence * 0.72, 0, 0.72).toFixed(2);
  const leftEyePath = almondEyePath(cx - eyeGap, eyeY, eyeWidth, eyeHeight);
  const rightEyePath = almondEyePath(cx + eyeGap, eyeY, eyeWidth, eyeHeight);

  const headPath = [
    `M ${cx - foreheadWidth / 2} ${topY + 70}`,
    `C ${cx - headWidth / 2} ${topY + 96}, ${cx - cheekWidth / 2} ${topY + 198}, ${cx - jawWidth / 2} ${chinY - jawRoundness}`,
    `C ${cx - jawWidth / 2 + 12} ${chinY - 28}, ${cx - 42} ${chinY}, ${cx} ${chinY + 10}`,
    `C ${cx + 42} ${chinY}, ${cx + jawWidth / 2 - 12} ${chinY - 28}, ${cx + jawWidth / 2} ${chinY - jawRoundness}`,
    `C ${cx + cheekWidth / 2} ${topY + 198}, ${cx + headWidth / 2} ${topY + 96}, ${cx + foreheadWidth / 2} ${topY + 70}`,
    `C ${cx + foreheadWidth / 2 - 8} ${topY + 18}, ${cx + 70} ${topY - 6}, ${cx} ${topY - 8}`,
    `C ${cx - 70} ${topY - 6}, ${cx - foreheadWidth / 2 + 8} ${topY + 18}, ${cx - foreheadWidth / 2} ${topY + 70}`,
    "Z"
  ].join(" ");

  const hairPath =
    model.hairPresence < 0.18
      ? `M ${cx - foreheadWidth / 2 + 18} ${topY + 42} C ${cx - 54} ${topY - 18}, ${cx + 58} ${topY - 18}, ${cx + foreheadWidth / 2 - 18} ${topY + 42} C ${cx + 80} ${topY + 20}, ${cx - 80} ${topY + 20}, ${cx - foreheadWidth / 2 + 18} ${topY + 42} Z`
      : `M ${cx - foreheadWidth / 2 - 12} ${topY + 82} C ${cx - foreheadWidth / 2 - 22} ${topY + 22}, ${cx - 74} ${topY - 34}, ${cx + 8} ${topY - 36} C ${cx + 86} ${topY - 34}, ${cx + foreheadWidth / 2 + 18} ${topY + 30}, ${cx + foreheadWidth / 2 + 8} ${topY + 92} C ${cx + 88} ${topY + hairDrop}, ${cx + 34} ${topY + 40}, ${cx - 18} ${topY + 54} C ${cx - 58} ${topY + 65}, ${cx - 88} ${topY + hairDrop}, ${cx - foreheadWidth / 2 - 12} ${topY + 82} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768" role="img" aria-label="Synthetic GameFace player portrait">
  <defs>
    <radialGradient id="stadiumGlow" cx="50%" cy="16%" r="72%">
      <stop offset="0%" stop-color="#5b8dff" stop-opacity="0.36"/>
      <stop offset="42%" stop-color="#0d1424" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#05070d" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="jerseyGradient" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#314a65"/>
      <stop offset="48%" stop-color="#172436"/>
      <stop offset="100%" stop-color="#070b12"/>
    </linearGradient>
    <linearGradient id="skinGradient" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${skinLight}"/>
      <stop offset="50%" stop-color="${skin}"/>
      <stop offset="100%" stop-color="${skinShadow}"/>
    </linearGradient>
    <radialGradient id="faceLight" cx="42%" cy="26%" r="72%">
      <stop offset="0%" stop-color="${skinLight}" stop-opacity="0.58"/>
      <stop offset="64%" stop-color="${skin}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${skinShadow}" stop-opacity="0.18"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="768" height="768" fill="url(#stadiumGlow)"/>
  <path d="M52 96L326 706M160 66L332 706M608 66L436 706M716 96L442 706" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="5" stroke-linecap="round"/>
  <circle cx="116" cy="118" r="10" fill="#ffffff" opacity="0.18"/>
  <circle cx="652" cy="140" r="13" fill="#ffffff" opacity="0.14"/>
  <path d="M92 742C116 592 246 502 384 502C522 502 652 592 676 742Z" fill="url(#jerseyGradient)" filter="url(#softShadow)"/>
  <path d="M292 496H476L498 634C462 674 306 674 270 634Z" fill="url(#skinGradient)"/>
  <path d="M168 742C206 624 286 544 384 544C482 544 562 624 600 742Z" fill="#23364d"/>
  <path d="M270 612L206 742M498 612L562 742" fill="none" stroke="#6da6ff" stroke-opacity="0.28" stroke-width="10"/>
  <path d="M298 616C334 650 434 650 470 616" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="10" stroke-linecap="round"/>
  <path d="${headPath}" fill="url(#skinGradient)" filter="url(#softShadow)"/>
  <path d="${headPath}" fill="url(#faceLight)"/>
  <path d="M${cx - headWidth / 2 - 8} ${topY + 160}C${cx - headWidth / 2 - 40} ${topY + 176},${cx - headWidth / 2 - 34} ${topY + 232},${cx - headWidth / 2} ${topY + 240}" fill="${skin}" opacity="0.72"/>
  <path d="M${cx + headWidth / 2 + 8} ${topY + 160}C${cx + headWidth / 2 + 40} ${topY + 176},${cx + headWidth / 2 + 34} ${topY + 232},${cx + headWidth / 2} ${topY + 240}" fill="${skin}" opacity="0.72"/>
  <path d="${hairPath}" fill="${hair}" opacity="${hairAlpha}"/>
  <path d="M${cx - 88} ${eyeY - 28}C${cx - 60} ${eyeY - 40},${cx - 34} ${eyeY - 38},${cx - 12} ${eyeY - 25}" fill="none" stroke="${brow}" stroke-width="${browThickness}" stroke-linecap="round" opacity="0.86"/>
  <path d="M${cx + 12} ${eyeY - 25}C${cx + 36} ${eyeY - 38},${cx + 62} ${eyeY - 40},${cx + 88} ${eyeY - 28}" fill="none" stroke="${brow}" stroke-width="${browThickness}" stroke-linecap="round" opacity="0.86"/>
  <g>
    <path d="${leftEyePath}" fill="#efe8df" opacity="0.9"/>
    <path d="${rightEyePath}" fill="#efe8df" opacity="0.9"/>
    <circle cx="${cx - eyeGap + 1}" cy="${eyeY + 1}" r="${Math.max(5, eyeHeight * 0.48)}" fill="${iris}"/>
    <circle cx="${cx + eyeGap + 1}" cy="${eyeY + 1}" r="${Math.max(5, eyeHeight * 0.48)}" fill="${iris}"/>
    <circle cx="${cx - eyeGap + 3}" cy="${eyeY - 2}" r="2.2" fill="#ffffff" opacity="0.66"/>
    <circle cx="${cx + eyeGap + 3}" cy="${eyeY - 2}" r="2.2" fill="#ffffff" opacity="0.66"/>
    <path d="M${cx - eyeGap - eyeWidth - 8} ${eyeY + 2}C${cx - eyeGap - 22} ${eyeY + 14},${cx - eyeGap + 24} ${eyeY + 14},${cx - eyeGap + eyeWidth + 8} ${eyeY + 2}" fill="none" stroke="${skinShadow}" stroke-opacity="0.24" stroke-width="4"/>
    <path d="M${cx + eyeGap - eyeWidth - 8} ${eyeY + 2}C${cx + eyeGap - 22} ${eyeY + 14},${cx + eyeGap + 24} ${eyeY + 14},${cx + eyeGap + eyeWidth + 8} ${eyeY + 2}" fill="none" stroke="${skinShadow}" stroke-opacity="0.24" stroke-width="4"/>
  </g>
  <path d="M${cx - noseWidth / 2} ${eyeY + 34}C${cx - noseWidth * 0.42} ${eyeY + 74},${cx - noseWidth * 0.34} ${eyeY + noseLength},${cx - noseWidth / 2 - 6} ${eyeY + noseLength + 14}" fill="none" stroke="${skinShadow}" stroke-opacity="0.36" stroke-width="6" stroke-linecap="round"/>
  <path d="M${cx + noseWidth / 2} ${eyeY + 34}C${cx + noseWidth * 0.42} ${eyeY + 74},${cx + noseWidth * 0.34} ${eyeY + noseLength},${cx + noseWidth / 2 + 6} ${eyeY + noseLength + 14}" fill="none" stroke="${skinShadow}" stroke-opacity="0.24" stroke-width="5" stroke-linecap="round"/>
  <path d="M${cx - noseWidth / 2 - 10} ${eyeY + noseLength + 18}C${cx - 14} ${eyeY + noseLength + 26},${cx + 14} ${eyeY + noseLength + 26},${cx + noseWidth / 2 + 10} ${eyeY + noseLength + 18}" fill="none" stroke="${skinShadow}" stroke-opacity="0.42" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="${cx - 74}" cy="${eyeY + 92}" rx="42" ry="20" fill="${cheek}" opacity="0.18"/>
  <ellipse cx="${cx + 74}" cy="${eyeY + 92}" rx="42" ry="20" fill="${cheek}" opacity="0.14"/>
  <path d="M${cx - mouthWidth / 2} ${chinY - 74}C${cx - 22} ${chinY - 66},${cx + 22} ${chinY - 66},${cx + mouthWidth / 2} ${chinY - 74}" fill="none" stroke="${lip}" stroke-width="${lipFullness}" stroke-linecap="round"/>
  <path d="M${cx - mouthWidth / 2 + 12} ${chinY - 58}C${cx - 14} ${chinY - 51},${cx + 14} ${chinY - 51},${cx + mouthWidth / 2 - 12} ${chinY - 58}" fill="none" stroke="${skinShadow}" stroke-opacity="0.2" stroke-width="4" stroke-linecap="round"/>
  <path d="M${cx - jawWidth / 2 + 4} ${chinY - 128}C${cx - 56} ${chinY - 68},${cx + 56} ${chinY - 68},${cx + jawWidth / 2 - 4} ${chinY - 128}C${cx + 42} ${chinY - 34},${cx - 42} ${chinY - 34},${cx - jawWidth / 2 + 4} ${chinY - 128}Z" fill="${facialHair}" opacity="${facialHairAlpha}"/>
  <path d="M${cx - jawWidth / 2 + 18} ${chinY - 36}C${cx - 24} ${chinY + 12},${cx + 24} ${chinY + 12},${cx + jawWidth / 2 - 18} ${chinY - 36}" fill="none" stroke="${skinShadow}" stroke-opacity="0.28" stroke-width="8" stroke-linecap="round"/>
  <circle cx="384" cy="384" r="372" fill="none" stroke="#30d158" stroke-opacity="0.34" stroke-width="8"/>
  <circle cx="384" cy="384" r="356" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
</svg>`;
}

function lerp(min: number, max: number, amount: number) {
  return min + (max - min) * clampUnit(amount);
}

function almondEyePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx} ${cy}C${cx - rx * 0.52} ${cy - ry},${cx + rx * 0.52} ${cy - ry},${cx + rx} ${cy}C${cx + rx * 0.45} ${cy + ry * 0.9},${cx - rx * 0.45} ${cy + ry * 0.9},${cx - rx} ${cy}Z`;
}
