import { TreatmentTemplateType, VisualVariant } from './types';

export type PlacementType = 'UPPER_THIRD' | 'CENTER' | 'LOWER_THIRD' | 'FULL_SCREEN';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafeAreaBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
  usableWidth: number;
  usableHeight: number;
}

/**
 * Vertical video safe area margins (standard 9:16 aspect ratio, e.g. 720x1280 or 1080x1920)
 * Protects against TikTok/Reels UI, upper status/notch bars, and bottom subtitle/caption bands.
 */
export const SAFE_AREA_CONFIG = {
  CANVAS_WIDTH: 720,
  CANVAS_HEIGHT: 1280,
  TOP_MARGIN: 80, // Upper notch and status safe boundary
  BOTTOM_MARGIN: 220, // Bottom caption, sound title, and action buttons safe boundary
  SIDE_MARGIN: 32, // Horizontal edge padding for mobile screens
  
  // Placement specific Y coordinates for default 720x1280
  UPPER_THIRD_Y: 90,
  CENTER_Y: 200,
  LOWER_THIRD_Y: 380,
};

/**
 * Returns safe boundaries for the given canvas or preview container dimensions.
 */
export function getSafeArea(
  containerWidth: number = 720,
  containerHeight: number = 1280
): SafeAreaBounds {
  const scaleX = containerWidth / 720;
  const scaleY = containerHeight / 1280;

  const top = SAFE_AREA_CONFIG.TOP_MARGIN * scaleY;
  const bottom = containerHeight - SAFE_AREA_CONFIG.BOTTOM_MARGIN * scaleY;
  const left = SAFE_AREA_CONFIG.SIDE_MARGIN * scaleX;
  const right = containerWidth - SAFE_AREA_CONFIG.SIDE_MARGIN * scaleX;

  return {
    top: Math.round(top),
    bottom: Math.round(bottom),
    left: Math.round(left),
    right: Math.round(right),
    usableWidth: Math.round(right - left),
    usableHeight: Math.round(bottom - top),
  };
}

/**
 * Calculates centered and clamped rectangle for card placement.
 * Ensures the card stays strictly inside the safe area and never collides with bottom captions.
 */
export function getPlacementRect(
  placement: PlacementType,
  cardWidth: number,
  cardHeight: number,
  containerWidth: number = 720,
  containerHeight: number = 1280
): Rect {
  const safe = getSafeArea(containerWidth, containerHeight);
  const scaleY = containerHeight / 1280;

  const clampedW = Math.min(cardWidth, safe.usableWidth);
  const clampedH = Math.min(cardHeight, safe.usableHeight);
  const x = (containerWidth - clampedW) / 2;

  let y: number;
  switch (placement) {
    case 'UPPER_THIRD':
      y = SAFE_AREA_CONFIG.UPPER_THIRD_Y * scaleY;
      break;
    case 'LOWER_THIRD':
      y = SAFE_AREA_CONFIG.LOWER_THIRD_Y * scaleY;
      break;
    case 'FULL_SCREEN':
      y = safe.top;
      break;
    case 'CENTER':
    default:
      y = SAFE_AREA_CONFIG.CENTER_Y * scaleY;
      break;
  }

  // Ensure card does not exceed upper notch / status bar
  if (y < safe.top) {
    y = safe.top;
  }

  // Ensure card does not collide with bottom caption zone
  if (y + clampedH > safe.bottom) {
    y = Math.max(safe.top, safe.bottom - clampedH);
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(clampedW),
    height: Math.round(clampedH),
  };
}

/**
 * Responsive card dimensions based on template, visual variant, and target canvas dimensions.
 * Scales proportionally from standard 720x1280 base and clamps against safe area usable width.
 */
export function getResponsiveCardSize(
  template: TreatmentTemplateType,
  variant: VisualVariant = 'BOLD',
  containerWidth: number = 720
): { width: number; height: number } {
  const isCompact = variant === 'COMPACT';
  const isMinimal = variant === 'MINIMAL';
  const scale = containerWidth / 720;

  let baseW = 440;
  let baseH = 120;

  switch (template) {
    case 'KEYWORD_POP':
      baseW = isCompact ? 320 : isMinimal ? 340 : 380;
      baseH = isCompact ? 70 : isMinimal ? 74 : 84;
      break;

    case 'CLAIM_CARD':
      baseW = isCompact ? 400 : 440;
      baseH = isCompact ? 84 : isMinimal ? 88 : 96;
      break;

    case 'NUMBER_COUNTER':
      baseW = isCompact ? 340 : 380;
      baseH = isCompact ? 88 : 102;
      break;

    case 'PERCENTAGE_GROWTH':
      baseW = isCompact ? 380 : 420;
      baseH = isCompact ? 94 : 108;
      break;

    case 'SIMPLE_BAR_CHART':
      baseW = isCompact ? 380 : 430;
      baseH = isCompact ? 120 : 142;
      break;

    case 'ANIMATED_LIST':
      baseW = isCompact ? 400 : 440;
      baseH = isCompact ? 120 : 140;
      break;

    case 'PROCESS_STEPS':
      baseW = isCompact ? 420 : 450;
      baseH = isCompact ? 100 : 118;
      break;

    case 'ARROW_FLOW':
      baseW = isCompact ? 420 : 460;
      baseH = isCompact ? 86 : 98;
      break;

    case 'TIMELINE':
      baseW = isCompact ? 400 : 440;
      baseH = isCompact ? 90 : 104;
      break;

    case 'ICON_NETWORK':
      baseW = isCompact ? 420 : 460;
      baseH = isCompact ? 105 : 138;
      break;

    case 'BEFORE_AFTER':
      baseW = isCompact ? 420 : 460;
      baseH = isCompact ? 84 : 96;
      break;

    case 'SCREENSHOT_ZOOM':
      baseW = isCompact ? 400 : 440;
      baseH = isCompact ? 120 : 142;
      break;

    case 'HIGHLIGHT_BOX':
      baseW = isCompact ? 400 : 440;
      baseH = isCompact ? 100 : 120;
      break;

    case 'PRODUCT_CARD':
      baseW = isCompact ? 390 : 430;
      baseH = isCompact ? 110 : 128;
      break;

    case 'CTA_ACTION':
      baseW = isCompact ? 380 : 420;
      baseH = isCompact ? 80 : 92;
      break;

    default:
      baseW = 400;
      baseH = 100;
      break;
  }

  // Scale dimensions proportionally with container width
  const scaledW = baseW * scale;
  const scaledH = baseH * scale;

  // Clamp against safe area usable width
  const safe = getSafeArea(containerWidth, containerWidth * (1280 / 720));
  const finalW = Math.min(scaledW, safe.usableWidth);

  return {
    width: Math.round(finalW),
    height: Math.round(scaledH),
  };
}

