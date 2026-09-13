import { ClaimCardParams, RouteTreatmentContext } from '../types';

export function buildClaimCardParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<ClaimCardParams>
): ClaimCardParams {
  const shortClaim = ctx.transcript.length > 50
    ? `${ctx.transcript.slice(0, 48)}...`
    : ctx.transcript;

  return {
    type: 'CLAIM_CARD',
    duration: Math.min(ctx.duration, 2.8),
    title: 'PRINSIP UTAMA',
    claim: shortClaim,
    verifiedBadge: 'VERIFIED INSIGHT',
    authorOrSource: 'Direct Response Framework',
    iconType: 'CHECK',
    accentColor: '#6366f1',
    ...overrides,
  };
}
