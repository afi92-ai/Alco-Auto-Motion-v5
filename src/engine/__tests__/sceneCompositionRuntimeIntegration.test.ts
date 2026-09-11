/**
 * ALCO AUTO MOTION V5 — STEP 9.4B.2 INTEGRATION TESTS
 *
 * Validates Runtime Renderer Integration of Scene Composition & Attention Hierarchy
 * Ensures PreviewPlayer, Canvas (renderFrame), and MP4 (ASS/FFmpeg) faithfully
 * consume the single source of truth composition_profile.
 */

import { evaluateSceneComposition, shouldRenderBrollLayer, shouldRenderEvidenceLayer, getEffectiveCaptionTreatment, isHookFocalLockActive } from '../sceneCompositionEngine';
import { shouldRenderUpperHeadline, shouldRenderInternalLayer, formatPublicAssHeadline } from '../../utils/headlineSanitizer';
import { generateAssSubtitles } from '../../server/mp4Renderer';
import { SceneEditPlan } from '../../types';

console.log('=== RUNNING STEP 9.4B.2 RUNTIME RENDERER INTEGRATION TEST SUITE ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
    failed++;
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: PROOF SCENE RUNTIME INTEGRATION
// -------------------------------------------------------------
console.log('--- Test Suite 1: Proof Scene Attention Hierarchy Runtime ---');

const proofScene: Partial<SceneEditPlan> = {
  id: 1,
  start: 4.0,
  end: 8.0,
  role: 'proof',
  adRole: 'proof',
  headline: 'OMSET 5.4X DALAM 30 HARI',
  caption: 'Lihat sendiri hasil dashboard omset naik drastis bulan ini',
  visual_evidence: {
    type: 'SCREEN_PROOF',
    userAssetUrl: 'https://example.com/proof.png',
    title: 'Dashboard Penjualan',
    metricValue: '5.4x ROAS',
    badgeTag: 'VERIFIED REVENUE',
  },
  broll: {
    sourceUrl: 'https://example.com/stock_generic.mp4',
    query: 'office workers typing',
    isUserUploaded: false,
  } as any,
};

// Evaluate composition profile (single source of truth)
proofScene.composition_profile = evaluateSceneComposition(proofScene, {
  index: 1,
  totalScenes: 4,
  availableUserAssets: [
    {
      id: 'asset_proof',
      name: 'Dashboard Penjualan',
      type: 'dashboard',
      url: 'https://example.com/proof.png',
      label: '5.4x ROAS',
    },
  ],
});

// 1. Evidence is Primary Focus
assert(
  proofScene.composition_profile.primaryAttention === 'EVIDENCE_DASHBOARD',
  '1.1 Proof Scene: Primary Attention is EVIDENCE_DASHBOARD',
  `Got ${proofScene.composition_profile.primaryAttention}`
);

// 2. Caption Treatment is SUBDUED (supporting evidence, not distracting from it)
assert(
  getEffectiveCaptionTreatment(proofScene) === 'SUBDUED',
  '1.2 Proof Scene: Caption Treatment is SUBDUED',
  `Got ${getEffectiveCaptionTreatment(proofScene)}`
);

// 3. Generic B-Roll is SUPPRESSED by composition profile
assert(
  proofScene.composition_profile.suppressedElements.includes('GENERIC_BROLL'),
  '1.3 Proof Scene: Suppressed elements contains GENERIC_BROLL'
);

assert(
  shouldRenderBrollLayer(proofScene) === false,
  '1.4 Proof Scene: shouldRenderBrollLayer returns false (blocks competing stock footage)'
);

// 4. Evidence overlay is ALLOWED
assert(
  shouldRenderEvidenceLayer(proofScene, 5.0) === true,
  '1.5 Proof Scene: shouldRenderEvidenceLayer returns true'
);

// 5. ASS Subtitle generation maps to Caption_Subdued style
const assResultProof = generateAssSubtitles([proofScene as SceneEditPlan]);
assert(
  assResultProof.ass.includes('Caption_Subdued'),
  '1.6 Proof Scene: ASS subtitle uses Caption_Subdued style in dialogue events'
);

// -------------------------------------------------------------
// TEST SUITE 2: HOOK SCENE FOCAL LOCK RUNTIME INTEGRATION
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Hook Scene Focal Lock Runtime Integration ---');

const hookScene: Partial<SceneEditPlan> = {
  id: 2,
  start: 0.0,
  end: 3.0,
  role: 'hook',
  adRole: 'hook',
  headline: 'STOP SCROLLING SEBENTAR',
  caption: 'Kamu masih pakai cara lama yang bikin rugi?',
  visual_evidence: {
    type: 'SCREEN_PROOF',
    userAssetUrl: 'https://example.com/secondary_card.png',
    title: 'Secondary Card',
    metricValue: '10x',
  },
  broll: {
    sourceUrl: 'https://example.com/broll_hook.mp4',
    query: 'person shock',
    isUserUploaded: true,
  } as any,
};

hookScene.composition_profile = evaluateSceneComposition(hookScene, {
  index: 0,
  totalScenes: 4,
});

assert(
  hookScene.composition_profile.hookFocalLockActive === true,
  '2.1 Hook Scene: hookFocalLockActive is true'
);

assert(
  hookScene.composition_profile.hookFocalLockDurationSec === 1.2,
  '2.2 Hook Scene: hookFocalLockDurationSec is 1.2s'
);

// Opening 1.2s window (t = 0.5s) -> eye contact locked on presenter, secondary overlays suppressed
assert(
  isHookFocalLockActive(0.5, 0.0, hookScene.composition_profile) === true,
  '2.3 Hook Scene: isHookFocalLockActive is true at t=0.5s'
);

assert(
  shouldRenderBrollLayer(hookScene, 0.5) === false,
  '2.4 Hook Scene: shouldRenderBrollLayer is false at t=0.5s (Hook Focal Lock protects presenter eye contact)'
);

assert(
  shouldRenderEvidenceLayer(hookScene, 0.5) === false,
  '2.5 Hook Scene: shouldRenderEvidenceLayer is false at t=0.5s'
);

// After 1.2s window (t = 1.8s) -> Focal Lock released
assert(
  isHookFocalLockActive(1.8, 0.0, hookScene.composition_profile) === false,
  '2.6 Hook Scene: isHookFocalLockActive is false at t=1.8s'
);

assert(
  shouldRenderBrollLayer(hookScene, 1.8) === true,
  '2.7 Hook Scene: shouldRenderBrollLayer is true at t=1.8s (released after opening window)'
);

assert(
  shouldRenderEvidenceLayer(hookScene, 1.8) === true,
  '2.8 Hook Scene: shouldRenderEvidenceLayer is true at t=1.8s'
);

// -------------------------------------------------------------
// TEST SUITE 3: CTA & OFFER SCENE RUNTIME INTEGRATION
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: CTA & Offer Scene Runtime Integration ---');

const ctaScene: Partial<SceneEditPlan> = {
  id: 3,
  start: 12.0,
  end: 15.0,
  role: 'cta',
  adRole: 'cta',
  headline: 'KLIK LINK DI BIO SEKARANG',
  caption: 'Dapatkan diskon 50 persen khusus hari ini saja',
  visual_evidence: {
    type: 'CTA_CARD',
    userAssetUrl: 'https://example.com/cta.png',
    title: 'KLIK LINK DI BIO',
  },
};

ctaScene.composition_profile = evaluateSceneComposition(ctaScene, {
  index: 3,
  totalScenes: 4,
});

assert(
  ctaScene.composition_profile.primaryAttention === 'CTA_ACTION_BADGE',
  '3.1 CTA Scene: Primary Attention is CTA_ACTION_BADGE'
);

assert(
  ctaScene.composition_profile.headlineTreatment === 'SUPPRESSED',
  '3.2 CTA Scene: Headline treatment is SUPPRESSED'
);

// shouldRenderUpperHeadline respects headlineTreatment === 'SUPPRESSED'
assert(
  shouldRenderUpperHeadline(ctaScene) === false,
  '3.3 CTA Scene: shouldRenderUpperHeadline returns false (prevents headline cluttering CTA)'
);

assert(
  getEffectiveCaptionTreatment(ctaScene) === 'MINIMAL',
  '3.4 CTA Scene: Caption Treatment is MINIMAL'
);

const assResultCta = generateAssSubtitles([ctaScene as SceneEditPlan]);
assert(
  assResultCta.ass.includes('Caption_Minimal'),
  '3.5 CTA Scene: ASS subtitle uses Caption_Minimal style'
);

// -------------------------------------------------------------
// TEST SUITE 4: INTERNAL LAYER & MOTION GRAPHICS SUPPRESSION
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Internal Layer Suppression Rules ---');

const problemScene: Partial<SceneEditPlan> = {
  id: 4,
  start: 2.0,
  end: 5.0,
  role: 'problem',
  adRole: 'problem',
  brollFormat: 'motion_graphic',
  headline: 'MASALAH UTAMA ANDA',
  caption: 'Biaya iklan terus naik tapi konversi nol',
};

problemScene.composition_profile = evaluateSceneComposition(problemScene, {
  index: 1,
  totalScenes: 4,
});

assert(
  problemScene.composition_profile.suppressedElements.includes('DECORATIVE_MOTION_GRAPHICS'),
  '4.1 Problem Scene: DECORATIVE_MOTION_GRAPHICS is in suppressedElements'
);

// shouldRenderInternalLayer blocks motion graphics when suppressed by composition profile
assert(
  shouldRenderInternalLayer('motion_graphic', false, problemScene) === false,
  '4.2 Problem Scene: shouldRenderInternalLayer returns false for decorative motion graphics'
);

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n=== STEP 9.4B.2 INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);

if (failed > 0) {
  process.exit(1);
}
