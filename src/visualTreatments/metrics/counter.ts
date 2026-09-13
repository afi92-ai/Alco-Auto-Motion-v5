import { NumberCounterParams, RouteTreatmentContext } from '../types';

export function buildNumberCounterParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<NumberCounterParams>
): NumberCounterParams {
  const metric = ctx.resolution.metricData;
  const toVal = metric?.primaryNumber ?? 10;
  const targetLabel = metric?.label || ctx.emphasisTarget || 'Metric Achievement';
  const prefix = metric?.toValue?.startsWith('Rp') ? 'Rp ' : '';
  const suffix = metric?.toValue?.endsWith('x') ? 'x' : metric?.toValue?.endsWith('%') ? '%' : '';

  return {
    type: 'NUMBER_COUNTER',
    duration: Math.min(ctx.duration, 2.8),
    label: targetLabel,
    fromValue: 0,
    toValue: toVal,
    prefix,
    suffix,
    formattedTarget: metric?.toValue || `${toVal}${suffix}`,
    emphasis: ctx.emphasisTarget || metric?.toValue || `${toVal}${suffix}`,
    badgeText: 'VERIFIED DATA',
    accentColor: '#34d399',
    ...overrides,
  };
}
