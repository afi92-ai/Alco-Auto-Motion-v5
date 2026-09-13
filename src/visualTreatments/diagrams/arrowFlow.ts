import { ArrowFlowParams, RouteTreatmentContext } from '../types';

export function buildArrowFlowParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<ArrowFlowParams>
): ArrowFlowParams {
  return {
    type: 'ARROW_FLOW',
    duration: Math.min(ctx.duration, 3.0),
    title: 'ALUR SISTEM',
    nodes: [
      { label: 'Riset Audiens', sublabel: 'Validasi Masalah' },
      { label: 'Creative Hook', sublabel: '0-3s Retensi', highlight: true },
      { label: 'Scale Profit', sublabel: 'High ROAS' },
    ],
    flowDirection: 'RIGHT',
    activeStepIndex: 1,
    accentColor: '#38bdf8',
    ...overrides,
  };
}
