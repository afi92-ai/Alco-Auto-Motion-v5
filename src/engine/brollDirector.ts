import {
  ContentRole,
  ContentType,
  VisualIntent,
  BRollItem,
  SceneIntelligenceScore,
  UserProofAsset,
  AssetUsageHistory,
  AssetMatchResult,
} from '../types';
import { matchAssetForScene } from './assetMatcher';

/**
 * AI Creative Performance B-Roll Director
 * Determines visual intent, timing offsets, framing, and overlays
 * using the centralized Asset Relevance & Ranking Layer.
 * Prioritizes authentic user assets that meet or exceed the relevance threshold.
 */
export function determineBrollDecision(
  role: ContentRole,
  text: string,
  scores: SceneIntelligenceScore,
  index: number,
  totalScenes: number,
  contentType: ContentType,
  userAssets?: UserProofAsset[],
  history?: AssetUsageHistory,
  options?: { minRelevanceScore?: number }
): {
  intent: VisualIntent;
  broll: BRollItem | null;
  directorNote: string;
  matchResult?: AssetMatchResult;
} {
  // STRICT RULE: If user did NOT upload supporting assets, NO B-roll or external overlays allowed AT ALL!
  if (!userAssets || userAssets.length === 0) {
    return {
      intent: 'none',
      broll: null,
      directorNote: 'No user assets uploaded: B-roll disabled. Scene relies purely on A-roll, camera motion zooms, and caption emphasis.',
    };
  }

  const textUpper = text.toUpperCase();

  // 1. HOOK (0-3s Window): Keep 100% Talking Head unless user specifically uploaded a brand logo/product
  if (index === 0 || role === 'hook') {
    const hookMatch = matchAssetForScene(
      { transcript: text, role, sceneIndex: index, scores, visualIntent: 'product' },
      userAssets,
      history,
      { ...options, preferredTypes: ['logo', 'product'] }
    );

    if (hookMatch.asset && hookMatch.score >= (options?.minRelevanceScore ?? 0.45)) {
      const userHookAsset = hookMatch.asset;
      return {
        intent: 'product',
        broll: {
          query: userHookAsset.label || userHookAsset.name,
          title: userHookAsset.name,
          sourceUrl: userHookAsset.url,
          previewUrl: userHookAsset.url,
          mediaType: userHookAsset.type === 'screen_recording' ? 'video' : 'image',
          visual_intent: 'product',
          overlay_style: 'pip',
          opacity: 0.92,
          startOffset: 0.8,
          duration: 1.8,
          badgeTag: userHookAsset.label || 'USER BRAND ASSET',
          entryTransition: 'zoom_in',
          isUserAsset: true,
        },
        directorNote: `0-3s Hook Strategy with User Asset: ${userHookAsset.name} (Relevance: ${hookMatch.score.toFixed(2)}) as micro PIP overlay.`,
        matchResult: hookMatch,
      };
    }

    return {
      intent: 'none',
      broll: null,
      directorNote: '0-3s Hook Rule: 100% direct speaker eye-contact to establish immediate human rapport before introducing overlays.',
      matchResult: hookMatch,
    };
  }

  // 2. Determine target visual intent & preferred types based on scene role & content
  let targetIntent: VisualIntent = 'none';
  let preferredTypes: UserProofAsset['type'][] | undefined;
  let defaultDuration = 2.5;
  let defaultOffset = 0.2;
  let entryTransition: 'fade' | 'zoom_in' | 'slide_left' = 'zoom_in';
  let overlayTag = 'USER ASSET EVIDENCE';

  if (role === 'problem' || textUpper.includes('SALAH') || textUpper.includes('BAKAR UANG') || textUpper.includes('RUGI') || textUpper.includes('BONCOS')) {
    targetIntent = 'metaphor';
    preferredTypes = ['screenshot', 'dashboard', 'before_after'];
    defaultOffset = 0.3;
    entryTransition = 'fade';
    overlayTag = 'USER PROBLEM EVIDENCE';
  } else if (role === 'curiosity' || textUpper.includes('TERNYATA') || textUpper.includes('KUNCINYA') || textUpper.includes('BUKAN') || textUpper.includes('BEFORE AFTER')) {
    targetIntent = 'contrast';
    preferredTypes = ['before_after', 'screenshot'];
    defaultDuration = 2.8;
    entryTransition = 'slide_left';
    overlayTag = 'USER COMPARE ASSET';
  } else if (role === 'proof' || scores.proof_strength >= 7 || /ROAS|CTR|OMSET|DATA|BUKTI|HASIL|%|X|GRAFIK|TEMBUS/i.test(textUpper)) {
    targetIntent = 'proof';
    preferredTypes = ['dashboard', 'screenshot'];
    defaultOffset = 0.0;
    defaultDuration = 3.2;
    entryTransition = 'zoom_in';
    overlayTag = 'REAL DASHBOARD PROOF';
  } else if (role === 'solution' || textUpper.includes('SOLUSI') || textUpper.includes('MODUL') || textUpper.includes('TEMPLATE') || textUpper.includes('PRODUK') || textUpper.includes('VALIDASI')) {
    targetIntent = 'product';
    preferredTypes = ['product', 'screen_recording', 'dashboard'];
    defaultDuration = 3.0;
    entryTransition = 'zoom_in';
    overlayTag = 'REAL PRODUCT DEMO';
  } else if (role === 'cta' || index === totalScenes - 1) {
    targetIntent = 'urgency';
    preferredTypes = ['logo', 'product', 'screenshot'];
    defaultOffset = 0.3;
    entryTransition = 'zoom_in';
    overlayTag = 'BRAND LOGO PROMPT';
  } else {
    targetIntent = 'process';
    preferredTypes = undefined;
  }

  // Evaluate candidate assets with centralized matcher
  const matchResult = matchAssetForScene(
    {
      transcript: text,
      role,
      importance: scores.importance,
      visualIntent: targetIntent,
      sceneIndex: index,
      scores,
    },
    userAssets,
    history,
    {
      ...options,
      preferredTypes,
    }
  );

  // If a qualified asset matched
  if (matchResult.asset) {
    const matchedAsset = matchResult.asset;
    return {
      intent: targetIntent,
      broll: {
        query: matchedAsset.label || matchedAsset.name,
        title: matchedAsset.name,
        sourceUrl: matchedAsset.url,
        previewUrl: matchedAsset.url,
        mediaType: matchedAsset.type === 'screen_recording' ? 'video' : 'image',
        visual_intent: targetIntent,
        overlay_style: 'pip',
        opacity: 0.95,
        startOffset: defaultOffset,
        duration: defaultDuration,
        badgeTag: matchedAsset.label || overlayTag,
        entryTransition,
        isUserAsset: true,
      },
      directorNote: `Authentic User Asset Selected: ${matchedAsset.name} (Score: ${matchResult.score.toFixed(2)}). ${matchResult.reason}`,
      matchResult,
    };
  }

  // Fallback: Relevance score was below threshold (or no suitable match found) -> keep A-roll clean
  return {
    intent: 'none',
    broll: null,
    directorNote: `No high-relevance user asset for scene #${index + 1} (${matchResult.reason}). Retaining clean A-roll pacing.`,
    matchResult,
  };
}
