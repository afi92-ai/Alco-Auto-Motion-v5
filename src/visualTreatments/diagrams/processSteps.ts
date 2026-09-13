import { ProcessStepsParams, RouteTreatmentContext } from '../types';

export function buildProcessStepsParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<ProcessStepsParams>
): ProcessStepsParams {
  return {
    type: 'PROCESS_STEPS',
    duration: Math.min(ctx.duration, 3.2),
    title: '3 LANGKAH SISTEM',
    steps: [
      { stepNumber: 1, title: 'Hook Attention', desc: 'Tangkap audiens 3 detik', status: 'DONE' },
      { stepNumber: 2, title: 'Deliver Proof', desc: 'Tunjukkan bukti nyata', status: 'ACTIVE' },
      { stepNumber: 3, title: 'Clear CTA', desc: 'Arahkan ke konversi', status: 'UPCOMING' },
    ],
    activeStep: 2,
    accentColor: '#10b981',
    ...overrides,
  };
}
