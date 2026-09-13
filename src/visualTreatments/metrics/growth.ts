import { PercentageGrowthParams, RouteTreatmentContext } from '../types';

export function buildPercentageGrowthParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<PercentageGrowthParams>
): PercentageGrowthParams {
  const metric = ctx.resolution.metricData;
  const primaryText = metric?.label || 'CTR Scale';
  const fromVal = metric?.fromValue || '1.0%';
  const toVal = metric?.toValue || '3.2%';
  const mult = metric?.multiplier || '+220%';

  return {
    type: 'PERCENTAGE_GROWTH',
    duration: Math.min(ctx.duration, 2.8),
    primaryText,
    fromValue: fromVal,
    toValue: toVal,
    growthMultiplier: mult,
    emphasis: toVal,
    direction: 'UP',
    subtext: 'Optimal Creative Conversion',
    accentColor: '#38bdf8',
    ...overrides,
  };
}
