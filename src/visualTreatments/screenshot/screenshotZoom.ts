import { ScreenshotZoomParams, RouteTreatmentContext } from '../types';

export function buildScreenshotZoomParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<ScreenshotZoomParams>
): ScreenshotZoomParams {
  const asset = ctx.resolution.resolvedAsset;
  if (!asset) {
    throw new Error('ScreenshotZoom requires an authentic user asset. None resolved.');
  }

  return {
    type: 'SCREENSHOT_ZOOM',
    duration: Math.min(ctx.duration, 2.8),
    assetUrl: asset.url,
    caption: asset.label || asset.name || 'Authentic Dashboard Proof',
    zoomLevel: 1.22,
    focalPoint: { xPercent: 50, yPercent: 45 },
    borderGlow: '#10b981',
    badge: 'VERIFIED USER ASSET',
    accentColor: '#10b981',
    ...overrides,
  };
}
