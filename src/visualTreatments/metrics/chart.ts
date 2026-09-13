import { SimpleBarChartParams, RouteTreatmentContext } from '../types';

export function buildSimpleBarChartParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<SimpleBarChartParams>
): SimpleBarChartParams {
  const metric = ctx.resolution.metricData;
  const isRoas = /ROAS/i.test(ctx.transcript);

  return {
    type: 'SIMPLE_BAR_CHART',
    duration: Math.min(ctx.duration, 3.0),
    title: isRoas ? 'ROAS Comparison' : 'Conversion Lift',
    bars: [
      { label: 'Industry Avg', value: 1.8, displayValue: '1.8x', color: '#64748b' },
      { label: 'Standard Ad', value: 2.5, displayValue: '2.5x', color: '#94a3b8' },
      { label: 'Alco Engine', value: 7.2, displayValue: metric?.toValue || '7.2x', highlight: true, color: '#10b981' },
    ],
    highlightIndex: 2,
    comparisonNote: '4x Higher Performance',
    accentColor: '#10b981',
    ...overrides,
  };
}
