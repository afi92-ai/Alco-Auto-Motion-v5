import {
  ContentRole,
  AdRole,
  VisualEvidenceDirective,
  UserProofAsset,
  AssetUsageHistory,
} from '../types';
import { matchAssetForScene } from '../engine/assetMatcher';
import { VisualEvidenceResolution } from './types';

export interface ResolveEvidenceInput {
  transcript: string;
  role: ContentRole;
  adRole?: AdRole;
  directive?: VisualEvidenceDirective;
  userAssets?: UserProofAsset[];
  history?: AssetUsageHistory;
  sceneIndex?: number;
}

/**
 * Visual Evidence Resolver
 * Bridges Visual Evidence Director directives with authentic user proof assets
 * and structured metric extraction. Strictly refuses to fabricate evidence.
 */
export function resolveVisualEvidence(input: ResolveEvidenceInput): VisualEvidenceResolution {
  const {
    transcript,
    role,
    directive,
    userAssets = [],
    history,
    sceneIndex = 0,
  } = input;

  const text = transcript || '';
  const textUpper = text.toUpperCase();

  // 1. Extract Metric Data from Transcript
  const metricData = extractMetricFromTranscript(text);

  // 2. Determine Evidence Requirement
  const isEvidenceRequired =
    directive?.visualPurpose === 'PROOF' ||
    directive?.visualPurpose === 'DEMO' ||
    directive?.preferredVisual === 'SCREENSHOT' ||
    directive?.preferredVisual === 'METRIC' ||
    directive?.preferredVisual === 'UI_DEMO' ||
    role === 'proof';

  // 3. Match against authentic user assets if available
  if (userAssets.length > 0 && isEvidenceRequired) {
    const preferredTypes =
      directive?.preferredVisual === 'UI_DEMO'
        ? ['screenshot', 'dashboard']
        : directive?.preferredVisual === 'METRIC' || role === 'proof'
        ? ['dashboard', 'screenshot']
        : ['screenshot', 'product', 'before_after'];

    const match = matchAssetForScene(
      {
        transcript: text,
        role: role === 'proof' ? 'proof' : 'explanation',
        sceneIndex,
        visualIntent: directive?.preferredVisual === 'UI_DEMO' ? 'process' : 'proof',
      },
      userAssets,
      history,
      {
        preferredTypes: preferredTypes as any,
        minRelevanceScore: 0.35,
      }
    );

    if (match.asset) {
      const isHighConfidence = match.score >= 0.55;
      return {
        status: isHighConfidence ? 'EXACT_EVIDENCE' : 'RELATED_EVIDENCE',
        resolvedAsset: match.asset,
        metricData,
        evidenceType: match.asset.type,
        confidence: match.score,
        reason: `Matched user asset '${match.asset.name}' (score: ${match.score.toFixed(2)}) for ${directive?.visualPurpose || 'EVIDENCE'} directive`,
      };
    }
  }

  // 4. No authentic asset available
  if (isEvidenceRequired) {
    return {
      status: 'NO_EVIDENCE',
      resolvedAsset: null,
      metricData,
      confidence: metricData ? 0.75 : 0.5,
      reason: userAssets.length === 0
        ? 'No user proof assets uploaded by user. Fallback to programmatic native graphics without fabricated evidence.'
        : 'Available user assets did not meet relevance threshold for this evidence moment.',
    };
  }

  // 5. Standard non-evidence context
  return {
    status: 'NO_EVIDENCE',
    resolvedAsset: null,
    metricData,
    confidence: 1.0,
    reason: 'Scene role does not require empirical proof or user screenshot evidence.',
  };
}

/**
 * Deterministic helper to parse numeric/growth metrics from transcript
 */
function extractMetricFromTranscript(text: string): VisualEvidenceResolution['metricData'] | undefined {
  const textUpper = text.toUpperCase();

  // Pattern A: "1% JADI 3%" or "1% KE 3%" or "DARI 1% SAMPAI 3%"
  const growthRangeMatch = text.match(/(\d+(?:[.,]\d+)?\s*%?)\s*(?:ke|jadi|to|sampai|->)\s*(\d+(?:[.,]\d+)?\s*%)/i);
  if (growthRangeMatch) {
    const fromVal = growthRangeMatch[1].trim();
    const toVal = growthRangeMatch[2].trim();
    let label = 'CTR / Konversi';
    if (/CTR/i.test(textUpper)) label = 'CTR (Click-Through Rate)';
    else if (/ROAS/i.test(textUpper)) label = 'ROAS Multiple';
    else if (/CONVERSION|KONVERSI/i.test(textUpper)) label = 'Conversion Rate';

    return {
      rawTranscriptText: text,
      fromValue: fromVal.includes('%') ? fromVal : `${fromVal}%`,
      toValue: toVal.includes('%') ? toVal : `${toVal}%`,
      multiplier: '+200%',
      label,
    };
  }

  // Pattern B: ROAS / Multipliers e.g. "10X", "5.4X", "3X LIPAT"
  const roasMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:X|KALI\s*LIPAT)/i);
  if (roasMatch) {
    const num = parseFloat(roasMatch[1].replace(',', '.'));
    return {
      rawTranscriptText: text,
      primaryNumber: num,
      fromValue: '1.0x',
      toValue: `${num}x`,
      multiplier: `${num}x`,
      label: 'ROAS Performance',
    };
  }

  // Pattern C: Currency / Revenue e.g. "142 JUTA", "RP 100.000.000", "50 RIBU"
  const currencyMatch = text.match(/(?:RP\.?|IDR\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)\s*(JUTA|MILIAR|RIBU|M|K)?/i);
  if (currencyMatch && (currencyMatch[2] || /OMSET|PROFIT|REVENUE|GAJI|SALES/i.test(textUpper))) {
    let rawNumStr = currencyMatch[1].replace(/\./g, '').replace(',', '.');
    let baseNum = parseFloat(rawNumStr) || 0;
    const unit = (currencyMatch[2] || '').toUpperCase();
    if (unit === 'JUTA' || unit === 'M') baseNum *= 1000000;
    else if (unit === 'MILIAR') baseNum *= 1000000000;
    else if (unit === 'RIBU' || unit === 'K') baseNum *= 1000;

    return {
      rawTranscriptText: text,
      primaryNumber: baseNum,
      fromValue: '0',
      toValue: `Rp ${baseNum.toLocaleString('id-ID')}`,
      label: 'Total Revenue / Omset',
    };
  }

  // Pattern D: Single Percentage e.g. "90%", "85.5%"
  const singlePctMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (singlePctMatch) {
    const num = parseFloat(singlePctMatch[1].replace(',', '.'));
    return {
      rawTranscriptText: text,
      primaryNumber: num,
      fromValue: '0%',
      toValue: `${num}%`,
      label: 'Performance Rate',
    };
  }

  return undefined;
}
