import { AnimatedListParams, RouteTreatmentContext } from '../types';

export function buildAnimatedListParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<AnimatedListParams>
): AnimatedListParams {
  const headline = ctx.emphasisTarget || '3 Kesalahan Utama';
  return {
    type: 'ANIMATED_LIST',
    duration: Math.min(ctx.duration, 3.2),
    headline,
    items: [
      { text: 'Targeting terlalu luas tanpa diferensiasi', icon: 'ALERT' },
      { text: 'Hook visual membosankan di 3 detik pertama', icon: 'ALERT', highlight: true },
      { text: 'Tidak ada bukti nyata (proof evidence)', icon: 'ALERT' },
    ],
    listType: 'CHECKLIST',
    activeItemIndex: 1,
    accentColor: '#f43f5e',
    ...overrides,
  };
}
