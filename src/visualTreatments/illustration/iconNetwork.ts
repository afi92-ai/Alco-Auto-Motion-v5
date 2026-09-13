import { IconNetworkParams, RouteTreatmentContext } from '../types';

export function buildIconNetworkParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<IconNetworkParams>
): IconNetworkParams {
  return {
    type: 'ICON_NETWORK',
    duration: Math.min(ctx.duration, 3.0),
    centerNode: { label: 'ALCO ENGINE', icon: 'SPARKLES' },
    orbitNodes: [
      { label: 'Auto Cut', icon: 'SCISSORS', highlight: true },
      { label: 'Karaoke Sub', icon: 'MIC' },
      { label: 'Motion Graph', icon: 'ZAP' },
      { label: 'High ROAS', icon: 'TRENDING_UP', highlight: true },
    ],
    accentColor: '#6366f1',
    ...overrides,
  };
}
