import { HighlightBoxParams, RouteTreatmentContext } from '../types';

export function buildHighlightBoxParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<HighlightBoxParams>
): HighlightBoxParams {
  const asset = ctx.resolution.resolvedAsset;
  return {
    type: 'HIGHLIGHT_BOX',
    duration: Math.min(ctx.duration, 2.6),
    targetLabel: ctx.emphasisTarget || 'Metric Focal Point',
    highlightArea: {
      xPercent: 30,
      yPercent: 40,
      widthPercent: 40,
      heightPercent: 20,
    },
    calloutText: ctx.emphasisTarget ? `Fokus: ${ctx.emphasisTarget}` : 'Perhatikan Angka Ini',
    highlightColor: '#22d3ee',
    assetUrl: asset?.url,
    ...overrides,
  };
}
