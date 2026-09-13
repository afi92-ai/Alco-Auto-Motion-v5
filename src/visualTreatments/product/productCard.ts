import { ProductCardParams, RouteTreatmentContext } from '../types';
import { ExtractedProductContent } from '../contentExtractor';

export function buildProductCardParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedProductContent,
  overrides?: Partial<ProductCardParams>
): ProductCardParams {
  const asset = ctx.resolution.resolvedAsset;
  return {
    type: 'PRODUCT_CARD',
    duration: Math.min(ctx.duration, 3.2),
    productName: extracted?.productName || ctx.emphasisTarget || 'PRODUK REKOMENDASI',
    badge: extracted?.badge || 'PENAWARAN',
    offerPrice: extracted?.offerPrice || undefined,
    originalPrice: extracted?.originalPrice || undefined,
    features: extracted?.features || [],
    assetUrl: asset?.url,
    urgencyText: extracted?.urgencyText || undefined,
    accentColor: '#f59e0b',
    ...overrides,
  };
}
