import { CtaActionParams, RouteTreatmentContext } from '../types';
import { ExtractedCtaContent } from '../contentExtractor';

export function buildCtaActionParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedCtaContent,
  overrides?: Partial<CtaActionParams>
): CtaActionParams {
  const headline = extracted?.headline || ctx.emphasisTarget || 'KLIK LINK DI BIO';
  const actionButtonText = extracted?.actionButtonText || 'AMBIL SEKARANG 👉';

  return {
    type: 'CTA_ACTION',
    duration: Math.min(ctx.duration, 2.8),
    headline,
    actionButtonText,
    urgencyNote: extracted?.urgencyNote || undefined,
    directionArrow: true,
    style: 'CARD',
    accentColor: '#4f46e5',
    ...overrides,
  };
}
