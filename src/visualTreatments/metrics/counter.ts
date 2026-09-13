import { NumberCounterParams, RouteTreatmentContext } from '../types';
import { ExtractedMetricContent } from '../contentExtractor';

export function buildNumberCounterParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedMetricContent,
  overrides?: Partial<NumberCounterParams>
): NumberCounterParams {
  const metric = ctx.resolution.metricData;
  const toVal = extracted?.numericValue ?? metric?.primaryNumber ?? 0;
  const targetLabel = extracted?.label || metric?.label || ctx.emphasisTarget || 'Metric';
  const prefix = extracted?.toValue?.startsWith('Rp') || metric?.toValue?.startsWith('Rp') ? 'Rp ' : '';
  const suffix = extracted?.toValue?.endsWith('x') || metric?.toValue?.endsWith('x')
    ? 'x'
    : extracted?.toValue?.endsWith('%') || metric?.toValue?.endsWith('%')
    ? '%'
    : '';

  const badgeText = ctx.resolution.status === 'EXACT_EVIDENCE' ? 'VERIFIED EVIDENCE' : 'METRIC';

  return {
    type: 'NUMBER_COUNTER',
    duration: Math.min(ctx.duration, 2.8),
    label: targetLabel,
    fromValue: 0,
    toValue: toVal,
    prefix,
    suffix,
    formattedTarget: extracted?.singleValue || metric?.toValue || `${toVal}${suffix}`,
    emphasis: ctx.emphasisTarget || extracted?.singleValue || metric?.toValue || `${toVal}${suffix}`,
    badgeText,
    accentColor: '#34d399',
    ...overrides,
  };
}
