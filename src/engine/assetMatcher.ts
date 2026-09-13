import {
  ContentRole,
  UserProofAsset,
  AssetMatchResult,
  RankedAssetCandidate,
  AssetUsageHistory,
  VisualIntent,
  SceneIntelligenceScore,
  VisualEvidenceDirective,
} from '../types';

/**
 * Default threshold & penalty constants (Configurable)
 */
export const DEFAULT_MIN_RELEVANCE_SCORE = 0.45;
export const DEFAULT_ASSET_REUSE_COOLDOWN_SCENES = 2;
export const DEFAULT_REUSE_PENALTY = 0.20;
export const DEFAULT_USAGE_COUNT_PENALTY_RATE = 0.05;

/**
 * Common Indonesian and English conversational stopwords to exclude from keyword matching.
 */
const STOPWORDS = new Set([
  // Indonesian stopwords
  'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'dan', 'atau', 'ini', 'itu',
  'adalah', 'yaitu', 'yakni', 'saya', 'aku', 'kami', 'kita', 'kamu', 'anda', 'dia', 'mereka',
  'bisa', 'dapat', 'ada', 'akan', 'sudah', 'telah', 'sedang', 'lagi', 'mau', 'harus', 'bukan',
  'tidak', 'tak', 'gak', 'nggak', 'hanya', 'cuma', 'karena', 'sebab', 'jadi', 'maka', 'lalu',
  'kemudian', 'kalau', 'jika', 'bila', 'saat', 'ketika', 'setiap', 'semua', 'banyak', 'lebih',
  'sangat', 'banget', 'amat', 'juga', 'pun', 'saja', 'dong', 'sih', 'kok', 'kan', 'deh', 'yuk',
  'nih', 'tuh', 'nah', 'loh', 'bahkan', 'namun', 'tetapi', 'tapi', 'seperti', 'bagai', 'oleh',
  'tentang', 'atas', 'bawah', 'luar', 'antara', 'tanpa', 'hingga', 'sampai', 'begini', 'begitu',
  'kenapa', 'mengapa', 'bagaimana', 'gimana', 'gitu', 'gini', 'mana', 'siapa', 'apa', 'kapan',
  // English stopwords
  'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'a', 'an',
  'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now',
]);

/**
 * Normalizes text and extracts meaningful alphanumeric tokens (lowercase, punctuation removed, stopwords filtered).
 */
export function extractNormalizedTokens(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s\d]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export interface MatchSceneContext {
  transcript: string;
  role: ContentRole;
  importance?: number;
  emotion?: string;
  visualIntent?: VisualIntent;
  duration?: number;
  sceneIndex: number;
  scores?: SceneIntelligenceScore;
  directive?: VisualEvidenceDirective;
}

export interface AssetMatcherOptions {
  minRelevanceScore?: number;
  reuseCooldownScenes?: number;
  reusePenalty?: number;
  usageCountPenaltyRate?: number;
  preferredTypes?: UserProofAsset['type'][];
  directive?: VisualEvidenceDirective;
}

/**
 * Calculates deterministic relevance score (0.0 to 1.0) for a single asset against scene context.
 */
export function calculateAssetRelevanceScore(
  scene: MatchSceneContext,
  asset: UserProofAsset,
  history: AssetUsageHistory = {},
  options: AssetMatcherOptions = {}
): RankedAssetCandidate {
  const {
    reuseCooldownScenes = DEFAULT_ASSET_REUSE_COOLDOWN_SCENES,
    reusePenalty: maxReusePenalty = DEFAULT_REUSE_PENALTY,
    usageCountPenaltyRate = DEFAULT_USAGE_COUNT_PENALTY_RATE,
    preferredTypes,
  } = options;

  const text = scene.transcript || '';
  const textUpper = text.toUpperCase();
  const sceneTokens = extractNormalizedTokens(text);
  const assetNameTokens = extractNormalizedTokens(asset.name || '');
  const assetLabelTokens = extractNormalizedTokens(asset.label || '');
  const allAssetTokens = Array.from(new Set([...assetNameTokens, ...assetLabelTokens]));

  // --- A. TYPE MATCH SCORE (Max 0.35) ---
  let typeScore = 0.08; // baseline type score

  if (preferredTypes && preferredTypes.includes(asset.type)) {
    typeScore = 0.24;
  } else {
    switch (asset.type) {
      case 'dashboard':
      case 'screenshot':
        if (
          scene.role === 'proof' ||
          (scene.scores && scene.scores.proof_strength >= 6) ||
          /ROAS|CTR|OMSET|PROFIT|METRIC|DATA|BUKTI|HASIL|%|GRAFIK|SALES|REVENUE|DASHBOARD/i.test(textUpper)
        ) {
          typeScore = 0.22;
        } else if (scene.role === 'problem' || scene.role === 'curiosity') {
          typeScore = 0.16;
        } else if (scene.role === 'solution') {
          typeScore = 0.14;
        } else {
          typeScore = 0.08;
        }
        break;

      case 'product':
        if (
          scene.role === 'solution' ||
          /PRODUK|BARANG|FISIK|KOTAK|BUNGKUS|KAPSUL|SERUM|CREAM|DEVICE|ALAT|BENTUK|KUALITAS/i.test(textUpper)
        ) {
          typeScore = 0.22;
        } else if (scene.role === 'cta' || scene.role === 'hook') {
          typeScore = 0.18;
        } else {
          typeScore = 0.08;
        }
        break;

      case 'screen_recording':
        if (
          scene.role === 'solution' ||
          /DEMO|TUTORIAL|CARA|LANGKAH|KLIK|APP|WEBSITE|SOFTWARE|FITUR|SISTEM|WORKFLOW/i.test(textUpper)
        ) {
          typeScore = 0.22;
        } else if (scene.role === 'proof') {
          typeScore = 0.18;
        } else {
          typeScore = 0.08;
        }
        break;

      case 'before_after':
        if (
          scene.role === 'curiosity' ||
          scene.role === 'proof' ||
          /BEFORE|AFTER|DULU|SEKARANG|HASIL|TRANSFORMASI|BEDANYA|CARA LAMA|PERUBAHAN/i.test(textUpper)
        ) {
          typeScore = 0.24;
        } else if (scene.role === 'problem') {
          typeScore = 0.18;
        } else {
          typeScore = 0.08;
        }
        break;

      case 'logo':
        if (scene.role === 'cta' || scene.role === 'hook' || /BRAND|LOGO|PT|OFFICIAL|RESMI|ALCO/i.test(textUpper)) {
          typeScore = 0.22;
        } else {
          typeScore = 0.05;
        }
        break;
    }
  }

  // --- B. KEYWORD MATCH SCORE (Max 0.35) ---
  let keywordScore = 0.0;
  const matchedKeywords: string[] = [];

  if (sceneTokens.length > 0 && allAssetTokens.length > 0) {
    for (const aToken of allAssetTokens) {
      // Exact token match
      if (sceneTokens.includes(aToken)) {
        if (!matchedKeywords.includes(aToken)) matchedKeywords.push(aToken);
      } else {
        // Substring / partial match (e.g. "penjualan" in "penjualanku")
        const partial = sceneTokens.find(
          (sToken) =>
            (sToken.length >= 4 && aToken.includes(sToken)) ||
            (aToken.length >= 4 && sToken.includes(aToken))
        );
        if (partial && !matchedKeywords.includes(partial)) {
          matchedKeywords.push(partial);
        }
      }
    }

    if (matchedKeywords.length >= 3) {
      keywordScore = 0.35;
    } else if (matchedKeywords.length === 2) {
      keywordScore = 0.28;
    } else if (matchedKeywords.length === 1) {
      keywordScore = 0.20;
    }
  }

  // --- C. SCENE ROLE AFFINITY SCORE (Max 0.20) ---
  let roleScore = 0.04;
  switch (scene.role) {
    case 'proof':
      if (asset.type === 'dashboard' || asset.type === 'screenshot') roleScore = 0.16;
      else if (asset.type === 'before_after') roleScore = 0.12;
      else if (asset.type === 'screen_recording') roleScore = 0.10;
      else if (asset.type === 'product') roleScore = 0.08;
      break;

    case 'solution':
      if (asset.type === 'product' || asset.type === 'screen_recording') roleScore = 0.16;
      else if (asset.type === 'dashboard') roleScore = 0.10;
      else if (asset.type === 'screenshot') roleScore = 0.08;
      break;

    case 'problem':
      if (asset.type === 'screenshot' || asset.type === 'before_after') roleScore = 0.14;
      else if (asset.type === 'dashboard') roleScore = 0.10;
      break;

    case 'curiosity':
      if (asset.type === 'before_after') roleScore = 0.16;
      else if (asset.type === 'screenshot' || asset.type === 'dashboard') roleScore = 0.10;
      break;

    case 'cta':
      if (asset.type === 'logo' || asset.type === 'product') roleScore = 0.16;
      else if (asset.type === 'screenshot') roleScore = 0.06;
      break;

    case 'hook':
      if (asset.type === 'logo' || asset.type === 'product') roleScore = 0.14;
      else if (asset.type === 'screenshot' || asset.type === 'dashboard') roleScore = 0.06;
      break;
  }

  // --- D. CONTEXT BONUS (Max 0.10) ---
  let contextScore = 0.0;

  // Numbers, metrics, percentages + dashboard/screenshot
  if (
    /(\d+%|\d+x|\d+\s*juta|\d+\s*ribu|omset|profit|roas|ctr|rupiah|rp)/i.test(textUpper) &&
    (asset.type === 'dashboard' || asset.type === 'screenshot')
  ) {
    contextScore += 0.10;
  }

  // Transformation / comparison terms + before_after
  if (
    /(before|after|dulu|sekarang|transformasi|berubah|cara lama|cara baru)/i.test(textUpper) &&
    asset.type === 'before_after'
  ) {
    contextScore += 0.10;
  }

  // Demo / workflow action + screen_recording
  if (
    /(cara|tutorial|langkah|praktek|software|aplikasi|fitur|tools|klik|buka)/i.test(textUpper) &&
    asset.type === 'screen_recording'
  ) {
    contextScore += 0.08;
  }

  // Product purchase / package terms + product
  if (
    /(beli|dapat|paket|produk|barang|order|checkout|kirim)/i.test(textUpper) &&
    asset.type === 'product'
  ) {
    contextScore += 0.08;
  }

  contextScore = Math.min(0.10, contextScore);

  // --- D2. VISUAL EVIDENCE DIRECTIVE ALIGNMENT ---
  const directive = scene.directive || options.directive;
  let directiveScore = 0.0;
  let genericBrollPenalty = 0.0;

  if (directive) {
    // 1. Preferred Visual Type Affinity
    const pref = directive.preferredVisual;
    let typeMatchesPref = false;
    if (pref === 'METRIC' || pref === 'SCREENSHOT') {
      if (asset.type === 'dashboard' || asset.type === 'screenshot') {
        directiveScore += 0.15;
        typeMatchesPref = true;
      }
    } else if (pref === 'UI_DEMO') {
      if (asset.type === 'screen_recording' || asset.type === 'screenshot') {
        directiveScore += 0.18;
        typeMatchesPref = true;
      }
    } else if (pref === 'PRODUCT') {
      if (asset.type === 'product') {
        directiveScore += 0.15;
        typeMatchesPref = true;
      }
    } else if (pref === 'DIAGRAM') {
      if (asset.type === 'dashboard' || asset.type === 'screenshot') {
        directiveScore += 0.12;
        typeMatchesPref = true;
      }
    }

    // 2. Required Evidence & Emphasis Target Token Matching
    const evidenceText = [directive.requiredEvidence, directive.emphasisTarget].filter(Boolean).join(' ');
    const evidenceTokens = extractNormalizedTokens(evidenceText);
    const matchedEvidenceTokens: string[] = [];
    if (evidenceTokens.length > 0 && allAssetTokens.length > 0) {
      for (const eToken of evidenceTokens) {
        if (allAssetTokens.includes(eToken) || allAssetTokens.some((a) => a.includes(eToken) || eToken.includes(a))) {
          matchedEvidenceTokens.push(eToken);
        }
      }
      if (matchedEvidenceTokens.length > 0) {
        directiveScore += Math.min(0.25, matchedEvidenceTokens.length * 0.15);
      }
    }

    // 3. Strict Generic B-Roll Suppression
    // If genericBrollAllowed is false:
    // Generic B-roll or non-evidence assets must NOT win over evidence-specific assets.
    if (!directive.genericBrollAllowed) {
      const isEvidenceQualified = typeMatchesPref || matchedEvidenceTokens.length > 0 || matchedKeywords.length >= 2;
      if (!isEvidenceQualified) {
        genericBrollPenalty = 0.40;
      }
    }
  }

  // --- E. REUSE & FREQUENCY PENALTY ---
  let reusePenalty = 0.0;
  const usageRecord = history[asset.id];

  if (usageRecord) {
    const sceneDistance = scene.sceneIndex - usageRecord.lastUsedSceneIndex;
    if (sceneDistance <= reuseCooldownScenes) {
      if (sceneDistance === 1) {
        reusePenalty += maxReusePenalty; // e.g. -0.20 for consecutive scene
      } else if (sceneDistance === 2) {
        reusePenalty += maxReusePenalty * 0.5; // e.g. -0.10 for 2-scene distance
      }
    }

    // Small fatigue penalty for repeatedly used assets
    if (usageRecord.usageCount >= 1) {
      reusePenalty += usageRecord.usageCount * usageCountPenaltyRate;
    }
  }

  // Calculate raw final score bounded to 0.0 - 1.0
  const grossScore = typeScore + keywordScore + roleScore + contextScore + directiveScore;
  const netScore = Math.max(0.0, Math.min(1.0, Math.round((grossScore - reusePenalty - genericBrollPenalty) * 100) / 100));

  // Synthesize human-readable reason
  const reasons: string[] = [];
  if (keywordScore > 0 && matchedKeywords.length > 0) {
    reasons.push(`Keywords matched: [${matchedKeywords.join(', ')}] (+${keywordScore.toFixed(2)})`);
  }
  reasons.push(`Type affinity: ${asset.type} for ${scene.role} (+${(typeScore + roleScore).toFixed(2)})`);
  if (contextScore > 0) {
    reasons.push(`Context bonus (+${contextScore.toFixed(2)})`);
  }
  if (directiveScore > 0) {
    reasons.push(`Directive alignment (+${directiveScore.toFixed(2)})`);
  }
  if (genericBrollPenalty > 0) {
    reasons.push(`Generic B-roll rejected (-${genericBrollPenalty.toFixed(2)})`);
  }
  if (reusePenalty > 0) {
    reasons.push(`Reuse penalty applied (-${reusePenalty.toFixed(2)})`);
  }

  return {
    asset,
    score: netScore,
    reason: reasons.join('; '),
    typeScore,
    keywordScore,
    roleScore,
    contextScore,
    reusePenalty,
    matchedKeywords,
  };
}

/**
 * Main Centralized Asset Matcher
 * Evaluates, ranks, and selects the most relevant UserProofAsset for a given scene.
 */
export function matchAssetForScene(
  scene: MatchSceneContext,
  userAssets?: UserProofAsset[],
  history: AssetUsageHistory = {},
  options: AssetMatcherOptions = {}
): AssetMatchResult {
  const minThreshold = options.minRelevanceScore ?? DEFAULT_MIN_RELEVANCE_SCORE;

  // If no assets uploaded, return clean null result immediately
  if (!userAssets || userAssets.length === 0) {
    return {
      asset: null,
      score: 0.0,
      reason: 'No user proof assets attached to project.',
      matchedKeywords: [],
      typeScore: 0.0,
      keywordScore: 0.0,
      roleScore: 0.0,
      contextScore: 0.0,
      reusePenalty: 0.0,
      allRanked: [],
    };
  }

  // 1. Score ALL assets deterministically
  const rankedCandidates: RankedAssetCandidate[] = userAssets.map((asset) =>
    calculateAssetRelevanceScore(scene, asset, history, options)
  );

  // 2. Sort descending by net score
  rankedCandidates.sort((a, b) => b.score - a.score);

  const bestCandidate = rankedCandidates[0];

  // 3. Threshold Evaluation
  const directive = scene.directive || options.directive;

  if (bestCandidate && bestCandidate.score >= minThreshold) {
    // If scene directive strictly prohibits generic B-roll, ensure asset is evidence-qualified
    if (directive && !directive.genericBrollAllowed) {
      const pref = directive.preferredVisual;
      const typeMatchesPref =
        (pref === 'METRIC' || pref === 'SCREENSHOT') && (bestCandidate.asset.type === 'dashboard' || bestCandidate.asset.type === 'screenshot') ||
        (pref === 'UI_DEMO') && (bestCandidate.asset.type === 'screen_recording' || bestCandidate.asset.type === 'screenshot') ||
        (pref === 'PRODUCT') && (bestCandidate.asset.type === 'product') ||
        (pref === 'DIAGRAM') && (bestCandidate.asset.type === 'dashboard' || bestCandidate.asset.type === 'screenshot');

      const hasKeywordMatch = bestCandidate.matchedKeywords.length > 0;
      const evidenceText = [directive.requiredEvidence, directive.emphasisTarget].filter(Boolean).join(' ');
      const evidenceTokens = extractNormalizedTokens(evidenceText);
      const allAssetTokens = extractNormalizedTokens(`${bestCandidate.asset.name} ${bestCandidate.asset.label || ''}`);
      const matchesEvidenceTokens = evidenceTokens.some((e) => allAssetTokens.includes(e));

      if (!typeMatchesPref && !hasKeywordMatch && !matchesEvidenceTokens) {
        return {
          asset: null,
          score: bestCandidate.score,
          reason: `Generic asset #${bestCandidate.asset.name} rejected: scene directive requires specific visual evidence (${directive.requiredEvidence || directive.preferredVisual}). Fallback to clean A-roll/internal visuals.`,
          matchedKeywords: [],
          typeScore: 0,
          keywordScore: 0,
          roleScore: 0,
          contextScore: 0,
          reusePenalty: 0,
          allRanked: rankedCandidates,
        };
      }
    }

    return {
      asset: bestCandidate.asset,
      score: bestCandidate.score,
      reason: `Selected #${bestCandidate.asset.name} with score ${bestCandidate.score.toFixed(2)}: ${bestCandidate.reason}`,
      matchedKeywords: bestCandidate.matchedKeywords,
      typeScore: bestCandidate.typeScore,
      keywordScore: bestCandidate.keywordScore,
      roleScore: bestCandidate.roleScore,
      contextScore: bestCandidate.contextScore,
      reusePenalty: bestCandidate.reusePenalty,
      allRanked: rankedCandidates,
    };
  }

  // 4. Low-Relevance Fallback: Best asset failed threshold
  return {
    asset: null,
    score: bestCandidate ? bestCandidate.score : 0.0,
    reason: bestCandidate
      ? `Highest asset relevance score (${bestCandidate.score.toFixed(2)}) is below threshold (${minThreshold.toFixed(2)}). Fallback to A-roll/internal visuals.`
      : 'No qualified asset candidate found.',
    matchedKeywords: bestCandidate ? bestCandidate.matchedKeywords : [],
    typeScore: bestCandidate ? bestCandidate.typeScore : 0.0,
    keywordScore: bestCandidate ? bestCandidate.keywordScore : 0.0,
    roleScore: bestCandidate ? bestCandidate.roleScore : 0.0,
    contextScore: bestCandidate ? bestCandidate.contextScore : 0.0,
    reusePenalty: bestCandidate ? bestCandidate.reusePenalty : 0.0,
    allRanked: rankedCandidates,
  };
}

/**
 * Helper to record and update an asset's usage history after selection.
 */
export function recordAssetUsage(
  history: AssetUsageHistory,
  assetId: string,
  sceneIndex: number
): AssetUsageHistory {
  const current = history[assetId] || { lastUsedSceneIndex: -1, usageCount: 0 };
  return {
    ...history,
    [assetId]: {
      lastUsedSceneIndex: sceneIndex,
      usageCount: current.usageCount + 1,
    },
  };
}
