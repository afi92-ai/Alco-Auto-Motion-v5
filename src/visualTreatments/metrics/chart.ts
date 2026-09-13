import { SimpleBarChartParams, RouteTreatmentContext, BarChartItem } from '../types';
import { ExtractedMetricContent } from '../contentExtractor';

export function buildSimpleBarChartParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedMetricContent,
  overrides?: Partial<SimpleBarChartParams>
): SimpleBarChartParams {
  const metric = ctx.resolution.metricData;
  const toValStr = extracted?.toValue || metric?.toValue || extracted?.singleValue || '0';
  const toValNum = extracted?.numericValue ?? metric?.primaryNumber ?? 1;

  const bars: BarChartItem[] = [];

  if (extracted?.fromValue) {
    const fromNum = parseFloat(extracted.fromValue.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    bars.push({
      label: 'SEBELUM',
      value: fromNum,
      displayValue: extracted.fromValue,
      color: '#64748b',
    });
    bars.push({
      label: 'SESUDAH',
      value: toValNum,
      displayValue: toValStr,
      highlight: true,
      color: '#10b981',
    });
  } else {
    bars.push({
      label: extracted?.label || 'METRIK',
      value: toValNum,
      displayValue: toValStr,
      highlight: true,
      color: '#10b981',
    });
  }

  return {
    type: 'SIMPLE_BAR_CHART',
    duration: Math.min(ctx.duration, 3.0),
    title: extracted?.label ? `HASIL ${extracted.label.toUpperCase()}` : 'METRIK PENCAPAIAN',
    bars,
    highlightIndex: bars.length - 1,
    comparisonNote: extracted?.multiplier || undefined,
    accentColor: '#10b981',
    ...overrides,
  };
}
