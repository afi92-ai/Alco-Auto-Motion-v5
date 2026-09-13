import { CtaActionParams, RouteTreatmentContext } from '../types';

export function buildCtaActionParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<CtaActionParams>
): CtaActionParams {
  const textUpper = ctx.transcript.toUpperCase();
  let actionText = 'AMBIL SEKARANG 👉';
  if (/BIO|LINK/i.test(textUpper)) actionText = 'KLIK LINK DI BIO 👉';
  else if (/DAFTAR|REGISTER/i.test(textUpper)) actionText = 'DAFTAR SEKARANG 👉';
  else if (/DOWNLOAD|UNDUH/i.test(textUpper)) actionText = 'DOWNLOAD AKSES 👉';
  else if (/DM|CHAT|WHATSAPP/i.test(textUpper)) actionText = 'CHAT SEKARANG 👉';

  return {
    type: 'CTA_ACTION',
    duration: Math.min(ctx.duration, 2.8),
    headline: ctx.emphasisTarget || 'KLIK LINK DI BIO',
    actionButtonText: actionText,
    urgencyNote: 'Slot Terbatas Hari Ini',
    directionArrow: true,
    style: 'CARD',
    accentColor: '#4f46e5',
    ...overrides,
  };
}
