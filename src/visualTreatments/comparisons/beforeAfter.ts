import { BeforeAfterParams, RouteTreatmentContext } from '../types';

export function buildBeforeAfterParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<BeforeAfterParams>
): BeforeAfterParams {
  const asset = ctx.resolution.resolvedAsset;
  return {
    type: 'BEFORE_AFTER',
    duration: Math.min(ctx.duration, 3.0),
    title: 'PERBANDINGAN HASIL',
    beforeLabel: 'CARA LAMA',
    beforeText: 'Macet di 1% CTR & Budget Terbakar',
    afterLabel: 'ALCO AUTO MOTION',
    afterText: 'Tembus 3.5x ROAS & Stabil',
    improvementMetric: '+250% Growth',
    assetUrl: asset?.url,
    accentColor: '#a855f7',
    ...overrides,
  };
}
