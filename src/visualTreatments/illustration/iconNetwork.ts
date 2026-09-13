import { IconNetworkParams, RouteTreatmentContext, NetworkNode } from '../types';
import { ExtractedNetworkContent } from '../contentExtractor';

/**
 * Deterministic icon mapping based on extracted node label.
 */
export function mapLabelToIcon(label: string): string {
  const l = (label || '').toUpperCase();
  if (/RISET|RESEARCH|SURVEY|ANALIS|AUDIEN/i.test(l)) return 'SEARCH';
  if (/KONTEN|CONTENT|COPY|MATERI|VIDEO|NASKAH|TEXT|POST/i.test(l)) return 'FILE_TEXT';
  if (/IKLAN|ADS|ADVERTISING|TARGET|CAMPAIGN/i.test(l)) return 'TARGET';
  if (/ANALYTIC|ANALITIK|METRIK|STAT|CHART|REPORT|PERFORMA/i.test(l)) return 'CHART';
  if (/DATABASE|DATA|STORAGE|SERVER|CLOUD/i.test(l)) return 'DATABASE';
  if (/WEBSITE|WEB|LANDING|PAGE|DOMAIN|URL/i.test(l)) return 'GLOBE';
  if (/USER|AUDIENCE|PELANGGAN|CUSTOMER|MEMBER/i.test(l)) return 'USERS';
  if (/AI|OTOMASI|AUTO|BOT|ENGINE|INTELLIGENCE/i.test(l)) return 'SPARKLES';
  if (/WHATSAPP|WA\b|CHAT|MESSAGE|DM|CS|TELEGRAM/i.test(l)) return 'MESSAGE';
  if (/CRM|SALES|LEAD|PIPELINE/i.test(l)) return 'LAYERS';
  if (/PAYMENT|BAYAR|INVOICE|GATEWAY/i.test(l)) return 'CREDIT_CARD';
  if (/SECURITY|AMAN|PROTECT/i.test(l)) return 'SHIELD';
  return 'CIRCLE';
}

export function buildIconNetworkParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedNetworkContent,
  overrides?: Partial<IconNetworkParams>
): IconNetworkParams {
  const centerLabel = (extracted?.centerLabel || ctx.emphasisTarget || 'SISTEM').toUpperCase();

  const orbitNodes: NetworkNode[] =
    extracted && extracted.nodes.length >= 3
      ? extracted.nodes.slice(0, 6).map((node, index) => ({
          label: node.label.toUpperCase(),
          icon: mapLabelToIcon(node.label),
          highlight: index === 0 || index === extracted.nodes.length - 1,
        }))
      : [];

  return {
    type: 'ICON_NETWORK',
    duration: Math.min(ctx.duration, 3.2),
    centerNode: {
      label: centerLabel,
      icon: /AI|ALCO|SPARK/i.test(centerLabel) ? 'SPARKLES' : 'LAYERS',
    },
    orbitNodes,
    accentColor: '#6366f1',
    ...overrides,
  };
}

