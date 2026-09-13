import { IconNetworkParams, RouteTreatmentContext } from '../types';

export function buildIconNetworkParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<IconNetworkParams>
): IconNetworkParams {
  const centerLabel = ctx.emphasisTarget || 'SISTEM';

  return {
    type: 'ICON_NETWORK',
    duration: Math.min(ctx.duration, 3.0),
    centerNode: { label: centerLabel.toUpperCase(), icon: 'SPARKLES' },
    orbitNodes: [
      { label: 'ANALISIS', icon: 'ACTIVITY', highlight: true },
      { label: 'PROSES', icon: 'ZAP' },
      { label: 'EKSEKUSI', icon: 'CHECK' },
      { label: 'HASIL', icon: 'TRENDING_UP', highlight: true },
    ],
    accentColor: '#6366f1',
    ...overrides,
  };
}
