import { ProductCardParams, RouteTreatmentContext } from '../types';

export function buildProductCardParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<ProductCardParams>
): ProductCardParams {
  const asset = ctx.resolution.resolvedAsset;
  return {
    type: 'PRODUCT_CARD',
    duration: Math.min(ctx.duration, 3.2),
    productName: ctx.emphasisTarget || 'ALCO AUTO MOTION V5',
    badge: 'PENAWARAN SPESIAL 50%',
    offerPrice: 'Rp 499.000',
    originalPrice: 'Rp 999.000',
    features: [
      'Full Dynamic AI Editing Engine',
      'Instant Subtitle Karaoke Sync',
      'Meta Ads High-Conversion Framework',
    ],
    assetUrl: asset?.url,
    urgencyText: 'Berlaku Khusus Hari Ini',
    accentColor: '#f59e0b',
    ...overrides,
  };
}
