import { ClaimCardParams, RouteTreatmentContext } from '../types';
import { ExtractedClaimContent } from '../contentExtractor';

export function buildClaimCardParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedClaimContent,
  overrides?: Partial<ClaimCardParams>
): ClaimCardParams {
  const shortClaim = extracted?.claim || (
    ctx.transcript.length > 52
      ? `${ctx.transcript.slice(0, 49)}...`
      : ctx.transcript
  );

  const verifiedBadge = ctx.resolution.status === 'EXACT_EVIDENCE'
    ? 'VERIFIED EVIDENCE'
    : 'INSIGHT';

  return {
    type: 'CLAIM_CARD',
    duration: Math.min(ctx.duration, 2.8),
    title: extracted?.title || ctx.emphasisTarget || 'POIN UTAMA',
    claim: shortClaim,
    verifiedBadge,
    authorOrSource: ctx.resolution.resolvedAsset?.label || undefined,
    iconType: 'CHECK',
    accentColor: '#6366f1',
    ...overrides,
  };
}
