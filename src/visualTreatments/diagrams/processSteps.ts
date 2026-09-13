import { ProcessStepsParams, RouteTreatmentContext, ProcessStepItem } from '../types';
import { ExtractedProcessContent } from '../contentExtractor';

export function buildProcessStepsParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedProcessContent,
  overrides?: Partial<ProcessStepsParams>
): ProcessStepsParams {
  const steps: ProcessStepItem[] = extracted && extracted.steps.length >= 2
    ? extracted.steps.map((s, idx) => ({
        stepNumber: s.stepNumber,
        title: s.title,
        desc: s.desc,
        status: idx === 0 ? 'DONE' : idx === 1 ? 'ACTIVE' : 'UPCOMING',
      }))
    : [
        { stepNumber: 1, title: 'Langkah 1', status: 'DONE' },
        { stepNumber: 2, title: 'Langkah 2', status: 'ACTIVE' },
        { stepNumber: 3, title: 'Langkah 3', status: 'UPCOMING' },
      ];

  return {
    type: 'PROCESS_STEPS',
    duration: Math.min(ctx.duration, 3.2),
    title: extracted?.title || 'LANGKAH SISTEM',
    steps,
    activeStep: 2,
    accentColor: '#10b981',
    ...overrides,
  };
}
