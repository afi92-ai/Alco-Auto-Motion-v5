import { BeforeAfterParams, RouteTreatmentContext } from '../types';
import { ExtractedBeforeAfterContent } from '../contentExtractor';

export function buildBeforeAfterParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedBeforeAfterContent,
  overrides?: Partial<BeforeAfterParams>
): BeforeAfterParams {
  const asset = ctx.resolution.resolvedAsset;
  return {
    type: 'BEFORE_AFTER',
    duration: Math.min(ctx.duration, 3.0),
    title: 'PERBANDINGAN',
    beforeLabel: extracted?.beforeLabel || 'SEBELUM',
    beforeText: extracted?.beforeText || 'Kondisi Sebelumnya',
    afterLabel: extracted?.afterLabel || 'SESUDAH',
    afterText: extracted?.afterText || 'Hasil Sesudahnya',
    improvementMetric: extracted?.improvementMetric || undefined,
    assetUrl: asset?.url,
    accentColor: '#a855f7',
    ...overrides,
  };
}

