import { ArrowFlowParams, RouteTreatmentContext, FlowNode } from '../types';
import { ExtractedProcessContent } from '../contentExtractor';

export function buildArrowFlowParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedProcessContent,
  overrides?: Partial<ArrowFlowParams>
): ArrowFlowParams {
  const nodes: FlowNode[] = extracted && extracted.steps.length >= 2
    ? extracted.steps.map((s, idx) => ({
        label: `LANGKAH ${s.stepNumber}`,
        sublabel: s.title,
        highlight: idx === 0,
      }))
    : [
        { label: 'LANGKAH 1', sublabel: 'Persiapan' },
        { label: 'LANGKAH 2', sublabel: 'Eksekusi', highlight: true },
        { label: 'LANGKAH 3', sublabel: 'Hasil' },
      ];

  return {
    type: 'ARROW_FLOW',
    duration: Math.min(ctx.duration, 3.0),
    title: 'ALUR PROSES',
    nodes,
    flowDirection: 'RIGHT',
    activeStepIndex: 1,
    accentColor: '#38bdf8',
    ...overrides,
  };
}
