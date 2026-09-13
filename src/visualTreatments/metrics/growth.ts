import { PercentageGrowthParams, RouteTreatmentContext } from '../types';
import { ExtractedMetricContent } from '../contentExtractor';

export function buildPercentageGrowthParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedMetricContent,
  overrides?: Partial<PercentageGrowthParams>
): PercentageGrowthParams {
  const metric = ctx.resolution.metricData;
  const primaryText = extracted?.label || metric?.label || ctx.emphasisTarget || 'Pertumbuhan';
  const fromVal = extracted?.fromValue || metric?.fromValue || '';
  const toVal = extracted?.toValue || metric?.toValue || '';
  const mult = extracted?.multiplier || metric?.multiplier || undefined;

  return {
    type: 'PERCENTAGE_GROWTH',
    duration: Math.min(ctx.duration, 2.8),
    primaryText,
    fromValue: fromVal,
    toValue: toVal,
    growthMultiplier: mult,
    emphasis: toVal,
    direction: 'UP',
    subtext: ctx.emphasisTarget ? `Target: ${ctx.emphasisTarget}` : undefined,
    accentColor: '#38bdf8',
    ...overrides,
  };
}
