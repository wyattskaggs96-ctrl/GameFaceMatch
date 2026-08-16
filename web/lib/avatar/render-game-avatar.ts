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
  const skinMid = colorToHex(mixColor(model.skinTone, model.skinShadowTone, 0.16));
  const skinDeep = colorToHex(mixColor(model.skinTone, { r: 31, g: 18, b: 16 }, 0.62));
  const cheek = colorToHex(mixColor(model.skinTone, { r: 235, g: 121, b: 102 }, 0.12));
  const hair = colorToHex(model.hairTone);
  const hairLight = colorToHex(mixColor(model.hairTone, model.skinHighlightTone, 0.18));
  const hairDeep = colorToHex(mixColor(model.hairTone, { r: 4, g: 6, b: 10 }, 0.56));
  const brow = colorToHex(model.browTone);
  const iris = colorToHex(model.eyeIrisTone);
  const irisDark = colorToHex(mixColor(model.eyeIrisTone, { r: 3, g: 6, b: 9 }, 0.62));
  const lip = colorToHex(model.lipTone);
  const lipShadow = colorToHex(mixColor(model.lipTone, model.skinShadowTone, 0.46));
  const facialHair = colorToHex(model.facialHairTone);
  const headWidth = lerp(270, 350, model.faceWidth);
  const headHeight = lerp(348, 430, model.faceHeight);
  const cheekWidth = lerp(headWidth * 0.86, headWidth * 1.02, model.cheekWidth);
  const jawWidth = lerp(headWidth * 0.44, headWidth * 0.66, model.jawWidth);
  const foreheadWidth = lerp(headWidth * 0.76, headWidth * 1.02, model.foreheadWidth);
  const jawRoundness = lerp(28, 68, model.jawRoundness);
  const cx = 384 + model.headTilt * 18;
  const topY = 78;
  const chinY = topY + headHeight;
  const eyeY = topY + lerp(148, 172, model.browHeight);
  const eyeGap = lerp(74, 112, model.eyeSpacing);
  const eyeWidth = lerp(22, 34, model.eyeWidth);
  const eyeHeight = lerp(5.5, 9.5, model.eyeHeight);
  const noseWidth = lerp(36, 64, model.noseWidth);
  const noseLength = lerp(84, 128, model.noseLength);
  const mouthWidth = lerp(42, 76, model.mouthWidth);
  const lipFullness = lerp(4, 9, model.lipFullness);
  const hairDrop = lerp(22, 64, model.hairCoverage);
  const hairAlpha = clamp(0.22 + model.hairPresence * 0.78, 0, 1).toFixed(2);
  const facialHairAlpha = clamp(model.facialHairPresence * 0.28, 0, 0.28).toFixed(2);
  const leftEyePath = almondEyePath(cx - eyeGap, eyeY, eyeWidth, eyeHeight);
  const rightEyePath = almondEyePath(cx + eyeGap, eyeY, eyeWidth, eyeHeight);
  const mouthY = chinY - 88;

  const headPath = [
    `M ${cx - foreheadWidth / 2} ${topY + 92}`,
    `C ${cx - headWidth / 2} ${topY + 112}, ${cx - cheekWidth / 2} ${topY + 210}, ${cx - jawWidth / 2} ${chinY - jawRoundness}`,
    `C ${cx - jawWidth / 2 + 10} ${chinY - 24}, ${cx - 36} ${chinY + 2}, ${cx} ${chinY + 13}`,
    `C ${cx + 36} ${chinY + 2}, ${cx + jawWidth / 2 - 10} ${chinY - 24}, ${cx + jawWidth / 2} ${chinY - jawRoundness}`,
    `C ${cx + cheekWidth / 2} ${topY + 210}, ${cx + headWidth / 2} ${topY + 112}, ${cx + foreheadWidth / 2} ${topY + 86}`,
    `C ${cx + foreheadWidth / 2 - 2} ${topY + 20}, ${cx + 76} ${topY - 2}, ${cx} ${topY - 8}`,
    `C ${cx - 76} ${topY - 2}, ${cx - foreheadWidth / 2 + 2} ${topY + 20}, ${cx - foreheadWidth / 2} ${topY + 92}`,
    "Z"
  ].join(" ");

  const hairPath =
    model.hairPresence < 0.18
      ? `M ${cx - foreheadWidth / 2 + 10} ${topY + 70} C ${cx - 58} ${topY - 18}, ${cx + 62} ${topY - 18}, ${cx + foreheadWidth / 2 - 8} ${topY + 70} C ${cx + 76} ${topY + 48}, ${cx - 76} ${topY + 48}, ${cx - foreheadWidth / 2 + 10} ${topY + 70} Z`
      : `M ${cx - foreheadWidth / 2 - 24} ${topY + 108} C ${cx - foreheadWidth / 2 - 36} ${topY + 16}, ${cx - 88} ${topY - 50}, ${cx + 4} ${topY - 52} C ${cx + 100} ${topY - 50}, ${cx + foreheadWidth / 2 + 34} ${topY + 26}, ${cx + foreheadWidth / 2 + 14} ${topY + 112} C ${cx + 98} ${topY + hairDrop}, ${cx + 42} ${topY + 58}, ${cx - 10} ${topY + 70} C ${cx - 66} ${topY + 84}, ${cx - 100} ${topY + hairDrop}, ${cx - foreheadWidth / 2 - 24} ${topY + 108} Z`;

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
      <stop offset="42%" stop-color="${skin}"/>
      <stop offset="72%" stop-color="${skinMid}"/>
      <stop offset="100%" stop-color="${skinShadow}"/>
    </linearGradient>
    <radialGradient id="faceLight" cx="39%" cy="22%" r="76%">
      <stop offset="0%" stop-color="${skinLight}" stop-opacity="0.66"/>
      <stop offset="48%" stop-color="${skin}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${skinShadow}" stop-opacity="0.24"/>
    </radialGradient>
    <radialGradient id="socketShade" cx="50%" cy="50%" r="62%">
      <stop offset="0%" stop-color="${skinDeep}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${skinDeep}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hairGradient" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${hairLight}" stop-opacity="0.72"/>
      <stop offset="38%" stop-color="${hair}"/>
      <stop offset="100%" stop-color="${hairDeep}"/>
    </linearGradient>
    <linearGradient id="lipGradient" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${lip}" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="${lipShadow}" stop-opacity="0.92"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
    <filter id="softBlur"><feGaussianBlur stdDeviation="7"/></filter>
    <clipPath id="headClip">
      <path d="${headPath}"/>
    </clipPath>
  </defs>
  <rect width="768" height="768" fill="url(#stadiumGlow)"/>
  <path d="M52 96L326 706M160 66L332 706M608 66L436 706M716 96L442 706" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="5" stroke-linecap="round"/>
  <circle cx="112" cy="116" r="10" fill="#ffffff" opacity="0.16"/>
  <circle cx="650" cy="142" r="13" fill="#ffffff" opacity="0.14"/>
  <ellipse cx="384" cy="690" rx="260" ry="70" fill="#000000" opacity="0.3" filter="url(#softBlur)"/>
  <path d="M74 742C108 588 236 500 384 500C532 500 660 588 694 742Z" fill="url(#jerseyGradient)" filter="url(#softShadow)"/>
  <path d="M286 474H482L500 620C462 666 306 666 268 620Z" fill="url(#skinGradient)"/>
  <path d="M154 742C196 618 282 536 384 536C486 536 572 618 614 742Z" fill="#223247"/>
  <path d="M248 604C286 664 318 700 384 710C450 700 482 664 520 604" fill="none" stroke="#0d1625" stroke-opacity="0.48" stroke-width="30" stroke-linecap="round"/>
  <path d="M270 616L204 742M498 616L564 742" fill="none" stroke="#6da6ff" stroke-opacity="0.22" stroke-width="10"/>
  <path d="M296 622C334 654 434 654 472 622" fill="none" stroke="#ffffff" stroke-opacity="0.13" stroke-width="9" stroke-linecap="round"/>
  <path d="${headPath}" fill="url(#skinGradient)" filter="url(#softShadow)"/>
  <path d="${headPath}" fill="url(#faceLight)"/>
  <g clip-path="url(#headClip)">
    <ellipse cx="${cx - 78}" cy="${topY + 206}" rx="52" ry="114" fill="${skinLight}" opacity="0.12" transform="rotate(-10 ${cx - 78} ${topY + 206})"/>
    <ellipse cx="${cx + 92}" cy="${topY + 226}" rx="62" ry="138" fill="${skinDeep}" opacity="0.18" transform="rotate(9 ${cx + 92} ${topY + 226})"/>
    <path d="M${cx - headWidth * 0.26} ${topY + 80}C${cx - 78} ${topY + 104},${cx + 74} ${topY + 104},${cx + headWidth * 0.28} ${topY + 84}" fill="none" stroke="${hairDeep}" stroke-opacity="0.18" stroke-width="18" stroke-linecap="round"/>
    <path d="M${cx - 104} ${eyeY + 88}C${cx - 66} ${eyeY + 126},${cx - 34} ${chinY - 82},${cx - 24} ${chinY - 30}" fill="none" stroke="${skinDeep}" stroke-opacity="0.12" stroke-width="12" stroke-linecap="round"/>
    <path d="M${cx + 104} ${eyeY + 88}C${cx + 66} ${eyeY + 126},${cx + 34} ${chinY - 82},${cx + 24} ${chinY - 30}" fill="none" stroke="${skinDeep}" stroke-opacity="0.14" stroke-width="14" stroke-linecap="round"/>
    <circle cx="${cx - 48}" cy="${eyeY + 118}" r="1.8" fill="${skinDeep}" opacity="0.16"/>
    <circle cx="${cx + 66}" cy="${eyeY + 136}" r="1.5" fill="${skinDeep}" opacity="0.14"/>
    <circle cx="${cx - 86}" cy="${eyeY + 62}" r="1.4" fill="${skinDeep}" opacity="0.12"/>
  </g>
  <path d="M${cx - headWidth / 2 + 6} ${topY + 128}C${cx - headWidth / 2 - 13} ${topY + 194},${cx - jawWidth / 2 - 14} ${chinY - 92},${cx - 38} ${chinY - 8}" fill="none" stroke="${skinDeep}" stroke-opacity="0.09" stroke-width="20" stroke-linecap="round"/>
  <path d="M${cx + headWidth / 2 - 6} ${topY + 128}C${cx + headWidth / 2 + 14} ${topY + 194},${cx + jawWidth / 2 + 14} ${chinY - 92},${cx + 38} ${chinY - 8}" fill="none" stroke="${skinDeep}" stroke-opacity="0.1" stroke-width="20" stroke-linecap="round"/>
  <ellipse cx="${cx - 74}" cy="${eyeY + 4}" rx="${eyeWidth + 34}" ry="32" fill="url(#socketShade)" opacity="0.62"/>
  <ellipse cx="${cx + 74}" cy="${eyeY + 4}" rx="${eyeWidth + 34}" ry="32" fill="url(#socketShade)" opacity="0.54"/>
  <path d="M${cx - headWidth / 2 - 8} ${topY + 174}C${cx - headWidth / 2 - 38} ${topY + 190},${cx - headWidth / 2 - 32} ${topY + 246},${cx - headWidth / 2 + 2} ${topY + 252}" fill="url(#skinGradient)" opacity="0.78"/>
  <path d="M${cx + headWidth / 2 + 8} ${topY + 174}C${cx + headWidth / 2 + 38} ${topY + 190},${cx + headWidth / 2 + 32} ${topY + 246},${cx + headWidth / 2 - 2} ${topY + 252}" fill="url(#skinGradient)" opacity="0.78"/>
  <path d="${hairPath}" fill="url(#hairGradient)" opacity="${hairAlpha}"/>
  <path d="M${cx - 108} ${topY + 48}C${cx - 70} ${topY + 10},${cx - 12} ${topY - 2},${cx + 38} ${topY + 10}" fill="none" stroke="${hairLight}" stroke-width="8" stroke-opacity="0.22" stroke-linecap="round"/>
  <path d="M${cx - 112} ${topY + 82}C${cx - 52} ${topY + 42},${cx + 26} ${topY + 28},${cx + 116} ${topY + 78}" fill="none" stroke="${hairDeep}" stroke-width="11" stroke-opacity="0.34" stroke-linecap="round"/>
  <path d="M${cx - 96} ${topY + 28}C${cx - 34} ${topY - 28},${cx + 64} ${topY - 20},${cx + 108} ${topY + 52}" fill="none" stroke="${hair}" stroke-width="5" stroke-opacity="0.24" stroke-linecap="round"/>
  <path d="M${cx - 122} ${topY + 92}C${cx - 62} ${topY + 64},${cx + 44} ${topY + 56},${cx + 124} ${topY + 96}" fill="none" stroke="${hairDeep}" stroke-opacity="0.3" stroke-width="9" stroke-linecap="round"/>
  <path d="M${cx - 92} ${topY + 72}C${cx - 48} ${topY + 58},${cx + 22} ${topY + 48},${cx + 88} ${topY + 76}" fill="none" stroke="${hairLight}" stroke-opacity="0.12" stroke-width="4" stroke-linecap="round"/>
  <path d="M${cx - 88} ${eyeY - 29}C${cx - 60} ${eyeY - 41},${cx - 34} ${eyeY - 39},${cx - 12} ${eyeY - 26}L${cx - 14} ${eyeY - 17}C${cx - 40} ${eyeY - 28},${cx - 64} ${eyeY - 29},${cx - 90} ${eyeY - 18}Z" fill="${brow}" opacity="0.88"/>
  <path d="M${cx + 12} ${eyeY - 26}C${cx + 36} ${eyeY - 39},${cx + 62} ${eyeY - 41},${cx + 88} ${eyeY - 29}L${cx + 90} ${eyeY - 18}C${cx + 64} ${eyeY - 29},${cx + 40} ${eyeY - 28},${cx + 14} ${eyeY - 17}Z" fill="${brow}" opacity="0.88"/>
  <g>
    <path d="${leftEyePath}" fill="#cfc2b9" opacity="0.74"/>
    <path d="${rightEyePath}" fill="#cfc2b9" opacity="0.74"/>
    <circle cx="${cx - eyeGap + 1}" cy="${eyeY + 1}" r="${Math.max(4.4, eyeHeight * 0.52)}" fill="${iris}"/>
    <circle cx="${cx + eyeGap + 1}" cy="${eyeY + 1}" r="${Math.max(4.4, eyeHeight * 0.52)}" fill="${iris}"/>
    <circle cx="${cx - eyeGap + 1}" cy="${eyeY + 1}" r="${Math.max(2.5, eyeHeight * 0.24)}" fill="${irisDark}"/>
    <circle cx="${cx + eyeGap + 1}" cy="${eyeY + 1}" r="${Math.max(2.5, eyeHeight * 0.24)}" fill="${irisDark}"/>
    <circle cx="${cx - eyeGap + 3}" cy="${eyeY - 2}" r="2" fill="#ffffff" opacity="0.58"/>
    <circle cx="${cx + eyeGap + 3}" cy="${eyeY - 2}" r="2" fill="#ffffff" opacity="0.58"/>
    <path d="M${cx - eyeGap - eyeWidth - 10} ${eyeY - 1}C${cx - eyeGap - 22} ${eyeY + 11},${cx - eyeGap + 24} ${eyeY + 11},${cx - eyeGap + eyeWidth + 10} ${eyeY - 1}" fill="none" stroke="${skinShadow}" stroke-opacity="0.2" stroke-width="4"/>
    <path d="M${cx + eyeGap - eyeWidth - 10} ${eyeY - 1}C${cx + eyeGap - 22} ${eyeY + 11},${cx + eyeGap + 24} ${eyeY + 11},${cx + eyeGap + eyeWidth + 10} ${eyeY - 1}" fill="none" stroke="${skinShadow}" stroke-opacity="0.2" stroke-width="4"/>
    <path d="M${cx - eyeGap - eyeWidth - 8} ${eyeY - 7}C${cx - eyeGap - 20} ${eyeY - 15},${cx - eyeGap + 22} ${eyeY - 15},${cx - eyeGap + eyeWidth + 8} ${eyeY - 7}" fill="none" stroke="${skinDeep}" stroke-opacity="0.2" stroke-width="6"/>
    <path d="M${cx + eyeGap - eyeWidth - 8} ${eyeY - 7}C${cx + eyeGap - 20} ${eyeY - 15},${cx + eyeGap + 22} ${eyeY - 15},${cx + eyeGap + eyeWidth + 8} ${eyeY - 7}" fill="none" stroke="${skinDeep}" stroke-opacity="0.2" stroke-width="6"/>
  </g>
  <path d="M${cx - noseWidth / 2} ${eyeY + 34}C${cx - noseWidth * 0.42} ${eyeY + 78},${cx - noseWidth * 0.34} ${eyeY + noseLength},${cx - noseWidth / 2 - 7} ${eyeY + noseLength + 14}" fill="none" stroke="${skinDeep}" stroke-opacity="0.26" stroke-width="10" stroke-linecap="round"/>
  <path d="M${cx + noseWidth / 2} ${eyeY + 34}C${cx + noseWidth * 0.42} ${eyeY + 78},${cx + noseWidth * 0.34} ${eyeY + noseLength},${cx + noseWidth / 2 + 7} ${eyeY + noseLength + 14}" fill="none" stroke="${skinDeep}" stroke-opacity="0.19" stroke-width="8" stroke-linecap="round"/>
  <path d="M${cx - 7} ${eyeY + 32}C${cx - 11} ${eyeY + 76},${cx - 11} ${eyeY + 106},${cx - 2} ${eyeY + noseLength + 4}" fill="none" stroke="${skinLight}" stroke-opacity="0.28" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="${cx}" cy="${eyeY + noseLength + 18}" rx="${noseWidth * 0.5}" ry="16" fill="${skinMid}" opacity="0.48"/>
  <ellipse cx="${cx - noseWidth * 0.34}" cy="${eyeY + noseLength + 22}" rx="7" ry="4" fill="${skinDeep}" opacity="0.5"/>
  <ellipse cx="${cx + noseWidth * 0.34}" cy="${eyeY + noseLength + 22}" rx="7" ry="4" fill="${skinDeep}" opacity="0.45"/>
  <ellipse cx="${cx - 74}" cy="${eyeY + 94}" rx="50" ry="22" fill="${cheek}" opacity="0.14"/>
  <ellipse cx="${cx + 74}" cy="${eyeY + 94}" rx="50" ry="22" fill="${cheek}" opacity="0.11"/>
  <path d="M${cx - mouthWidth / 2 + 8} ${mouthY - 1}C${cx - 18} ${mouthY - lipFullness * 0.16},${cx + 18} ${mouthY - lipFullness * 0.16},${cx + mouthWidth / 2 - 8} ${mouthY - 1}" fill="none" stroke="${lip}" stroke-opacity="0.24" stroke-width="${Math.max(2, lipFullness * 0.5)}" stroke-linecap="round"/>
  <path d="M${cx - mouthWidth / 2 + 10} ${mouthY + 2}C${cx - 16} ${mouthY + 3},${cx + 16} ${mouthY + 3},${cx + mouthWidth / 2 - 10} ${mouthY + 2}" fill="none" stroke="${skinDeep}" stroke-opacity="0.28" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M${cx - jawWidth / 2 + 10} ${chinY - 104}C${cx - 50} ${chinY - 58},${cx + 50} ${chinY - 58},${cx + jawWidth / 2 - 10} ${chinY - 104}C${cx + 38} ${chinY - 30},${cx - 38} ${chinY - 30},${cx - jawWidth / 2 + 10} ${chinY - 104}Z" fill="${facialHair}" opacity="${facialHairAlpha}"/>
  <path d="M${cx - jawWidth / 2 + 18} ${chinY - 36}C${cx - 24} ${chinY + 10},${cx + 24} ${chinY + 10},${cx + jawWidth / 2 - 18} ${chinY - 36}" fill="none" stroke="${skinDeep}" stroke-opacity="0.28" stroke-width="8" stroke-linecap="round"/>
  <path d="M${cx - 52} ${chinY - 8}C${cx - 30} ${chinY + 20},${cx + 30} ${chinY + 20},${cx + 52} ${chinY - 8}" fill="${skinLight}" opacity="0.08"/>
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
