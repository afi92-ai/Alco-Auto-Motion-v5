/**
 * ALCO AUTO MOTION V5 — STEP 9.5B.2 RUNTIME RENDERER INTEGRATION TESTS
 *
 * Validates Runtime Renderer Integration of Editing Rhythm Plan:
 * - PreviewPlayer parity (camera transform damping & refresh offsets)
 * - Canvas renderer parity (renderFrame getCameraTransform)
 * - MP4 renderer parity (FFmpeg filter expressions & flash transitions)
 * - Evidence hold preservation and composition priority
 */

import {
  getRuntimeRhythmDirective,
  getMotionBudgetMultiplier,
  getRefreshStage,
  getRefreshOffsets,
  isEvidenceHoldActive,
  getRhythmAdjustedTransition,
  getRhythmFilterExpression,
} from '../editingRhythmRuntime';
import { getCameraTransform } from '../renderFrame';
import { SceneEditPlan, EditingRhythmPlan } from '../../types';

console.log('=== RUNNING STEP 9.5B.2 RUNTIME INTEGRATION TEST SUITE ===\n');

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

// Helper to construct mock scenes
const createMockScene = (overrides: Partial<SceneEditPlan> = {}): SceneEditPlan => {
  return {
    id: 1,
    start: 0,
    end: 4,
    role: 'explanation',
    adRole: 'problem',
    motion: 'slow_zoom_in',
    motion_scale: 1.18,
    transition: 'cut',
    caption: 'Ini adalah problem yang kita hadapi sehari-hari.',
    talking_head_framing: {
      is_talking_head: true,
      protection_status: 'SAFE_FRAMED',
      smart_reframe_scale: 1.18,
      crop_shift_offset: { x: 0, y: -3.5 },
      eyeline_zone: 'SAFE',
    } as any,
    ...overrides,
  } as any;
};

// =========================================================================
// TEST 1: Hook 0-1.2s - Focal Lock Preserved, No Mid-Scene Refresh
// =========================================================================
console.log('--- Test 1: Hook 0-1.2s Focal Lock ---');
{
  const hookPlan: EditingRhythmPlan = {
    paceLevel: 'FAST',
    targetVisualIntervalMs: 1400,
    minimumReadableDurationMs: 1200,
    motionBudget: 'HIGH',
    noveltyIntervalMs: 1400,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: true,
    refreshStrategy: 'SUBTLE_REFRAME',
    midSceneRefreshPointsSec: [0.8, 2.0],
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'NORMAL',
    reason: 'Hook test',
  };

  const scene = createMockScene({
    role: 'hook',
    adRole: 'hook',
    end: 3.5,
    editing_rhythm_plan: hookPlan,
    composition_profile: {
      primaryAttention: 'HOOK_SPEAKER_FACE',
      hookFocalLockActive: true,
      hookFocalLockDurationSec: 1.2,
    } as any,
  });

  const d = getRuntimeRhythmDirective(scene, 0.5, 0.5);
  assert(d.refreshActive === false, 'TEST 1.1: Hook 0-1.2s blocks refreshActive');
  assert(d.refreshStage === 0, 'TEST 1.2: Hook 0-1.2s refreshStage is 0');
  assert(d.effectiveMotionScale === 0, 'TEST 1.3: Hook 0-1.2s effectiveMotionScale is 0');
  assert(d.effectiveCropXOffset === 0, 'TEST 1.4: Hook 0-1.2s effectiveCropXOffset is 0');
}

// =========================================================================
// TEST 2: Hook after 1.2s - Safe Motion Allowed, Focal Lock Released
// =========================================================================
console.log('\n--- Test 2: Hook post-1.2s Focal Lock Release ---');
{
  const hookPlan: EditingRhythmPlan = {
    paceLevel: 'FAST',
    targetVisualIntervalMs: 1400,
    minimumReadableDurationMs: 1200,
    motionBudget: 'HIGH',
    noveltyIntervalMs: 1400,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: true,
    refreshStrategy: 'SUBTLE_REFRAME',
    midSceneRefreshPointsSec: [1.8],
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'NORMAL',
    reason: 'Hook post-lock',
  };

  const scene = createMockScene({
    role: 'hook',
    adRole: 'hook',
    end: 3.5,
    editing_rhythm_plan: hookPlan,
    composition_profile: {
      primaryAttention: 'HOOK_SPEAKER_FACE',
      hookFocalLockActive: true,
      hookFocalLockDurationSec: 1.2,
    } as any,
  });

  const d = getRuntimeRhythmDirective(scene, 2.0, 2.0);
  assert(d.refreshActive === true, 'TEST 2.1: Hook after 1.2s allows refreshActive');
  assert(d.refreshStage === 1, 'TEST 2.2: Hook after 1.2s advances to refreshStage 1');
  assert(d.effectiveMotionScale > 0, 'TEST 2.3: Hook after 1.2s applies reframe scale');
}

// =========================================================================
// TEST 3: 7s Problem - Progressive Refresh Stages
// =========================================================================
console.log('\n--- Test 3: 7s Problem Progressive Refresh Stages ---');
{
  const problemPlan: EditingRhythmPlan = {
    paceLevel: 'MEDIUM',
    targetVisualIntervalMs: 2300,
    minimumReadableDurationMs: 1800,
    motionBudget: 'HIGH',
    noveltyIntervalMs: 2300,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: true,
    refreshStrategy: 'SUBTLE_REFRAME',
    midSceneRefreshPointsSec: [2.3, 4.6],
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'NORMAL',
    reason: '7s Problem with 2 refresh points',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'problem',
    start: 0,
    end: 7.0,
    editing_rhythm_plan: problemPlan,
  });

  const d0 = getRuntimeRhythmDirective(scene, 1.5, 1.5);
  assert(d0.refreshStage === 0 && d0.refreshActive === false, 'TEST 3.1: Stage 0 (0-2.3s) is base frame');

  const d1 = getRuntimeRhythmDirective(scene, 3.0, 3.0);
  assert(d1.refreshStage === 1 && d1.refreshActive === true, 'TEST 3.2: Stage 1 (2.3-4.6s) is subtle punch');
  assert(Math.abs(d1.effectiveMotionScale - 0.025) < 0.001, 'TEST 3.3: Stage 1 applies +0.025 scale');
  assert(Math.abs(d1.effectiveCropXOffset - 1.8) < 0.1, 'TEST 3.4: Stage 1 applies +1.8% crop X');

  const d2 = getRuntimeRhythmDirective(scene, 5.5, 5.5);
  assert(d2.refreshStage === 2 && d2.refreshActive === true, 'TEST 3.5: Stage 2 (4.6-7.0s) is subtle pull');
  assert(Math.abs(d2.effectiveMotionScale - (-0.015)) < 0.001, 'TEST 3.6: Stage 2 applies -0.015 scale');
  assert(Math.abs(d2.effectiveCropXOffset - (-1.5)) < 0.1, 'TEST 3.7: Stage 2 applies -1.5% crop X');
}

// =========================================================================
// TEST 4: Dense Speech Problem - Lower Motion Multiplier
// =========================================================================
console.log('\n--- Test 4: Dense Speech Problem ---');
{
  const densePlan: EditingRhythmPlan = {
    paceLevel: 'MEDIUM',
    targetVisualIntervalMs: 2600,
    minimumReadableDurationMs: 2200,
    motionBudget: 'MEDIUM',
    noveltyIntervalMs: 2600,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: true,
    refreshStrategy: 'SUBTLE_REFRAME',
    midSceneRefreshPointsSec: [2.5],
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'DENSE',
    readabilityPriority: 'HIGH',
    reason: 'Dense speech throttled to MEDIUM budget',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'problem',
    editing_rhythm_plan: densePlan,
  });

  const d = getRuntimeRhythmDirective(scene, 1.0, 1.0);
  assert(d.motionMultiplier === 0.80, 'TEST 4.1: Dense speech throttles motionMultiplier to 0.80');
  assert(d.motionMultiplier < 1.0, 'TEST 4.2: Motion multiplier is lower than normal 1.0');
}

// =========================================================================
// TEST 5: Proof Scene - MINIMAL Motion & No Disruptive Refresh
// =========================================================================
console.log('\n--- Test 5: Proof Scene MINIMAL Motion ---');
{
  const proofPlan: EditingRhythmPlan = {
    paceLevel: 'CONTROLLED',
    targetVisualIntervalMs: 3000,
    minimumReadableDurationMs: 2400,
    motionBudget: 'MINIMAL',
    noveltyIntervalMs: 3000,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: false,
    refreshStrategy: 'EVIDENCE_HOLD',
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'HIGH',
    reason: 'Proof scene evidence focus',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'proof',
    motion: 'punch_zoom',
    editing_rhythm_plan: proofPlan,
    composition_profile: {
      primaryAttention: 'EVIDENCE_DASHBOARD',
    } as any,
  });

  const d = getRuntimeRhythmDirective(scene, 1.5, 1.5);
  assert(d.motionMultiplier === 0.25, 'TEST 5.1: Proof motionMultiplier is 0.25 (MINIMAL)');
  assert(d.suppressAggressiveMotion === true, 'TEST 5.2: Proof suppresses aggressive motion');
  assert(d.refreshActive === false, 'TEST 5.3: Proof blocks mid-scene refreshes');
  assert(d.evidenceHoldActive === true, 'TEST 5.4: Proof activates evidenceHoldActive');
}

// =========================================================================
// TEST 6: Short Proof Scene - EVIDENCE_HOLD Directive Active
// =========================================================================
console.log('\n--- Test 6: Short Proof Scene Visual Hold ---');
{
  const shortProofPlan: EditingRhythmPlan = {
    paceLevel: 'CONTROLLED',
    targetVisualIntervalMs: 2400,
    minimumReadableDurationMs: 2400,
    motionBudget: 'MINIMAL',
    noveltyIntervalMs: 2400,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: false,
    refreshStrategy: 'EVIDENCE_HOLD',
    requiresVisualHold: true,
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'CRITICAL',
    reason: 'Short proof requires visual hold',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'proof',
    start: 0,
    end: 2.0,
    visual_evidence: {
      type: 'SCREEN_PROOF',
      title: 'ROAS 5.4x',
      userAssetUrl: 'https://example.com/proof.jpg',
    } as any,
    editing_rhythm_plan: shortProofPlan,
  });

  assert(isEvidenceHoldActive(scene, 1.0, 1.0) === true, 'TEST 6.1: isEvidenceHoldActive returns true for short proof');
  const d = getRuntimeRhythmDirective(scene, 1.0, 1.0);
  assert(d.evidenceHoldActive === true, 'TEST 6.2: Directive evidenceHoldActive is true');
  assert(d.refreshStrategy === 'EVIDENCE_HOLD', 'TEST 6.3: Directive strategy is EVIDENCE_HOLD');
}

// =========================================================================
// TEST 7: Demo Scene - LOW Motion & Stable Evidence
// =========================================================================
console.log('\n--- Test 7: Demo Scene LOW Motion ---');
{
  const demoPlan: EditingRhythmPlan = {
    paceLevel: 'CONTROLLED',
    targetVisualIntervalMs: 2600,
    minimumReadableDurationMs: 2200,
    motionBudget: 'LOW',
    noveltyIntervalMs: 2600,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: false,
    refreshStrategy: 'EVIDENCE_HOLD',
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'HIGH',
    reason: 'Demo screen capture focus',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'demo',
    motion: 'slow_zoom_in',
    editing_rhythm_plan: demoPlan,
    composition_profile: {
      primaryAttention: 'PRODUCT_DEMO',
    } as any,
  });

  const d = getRuntimeRhythmDirective(scene, 1.2, 1.2);
  assert(d.motionMultiplier === 0.55, 'TEST 7.1: Demo motionMultiplier is 0.55 (LOW)');
  assert(d.suppressAggressiveMotion === true, 'TEST 7.2: Demo suppresses aggressive motion');
  assert(d.evidenceHoldActive === true, 'TEST 7.3: Demo preserves evidence hold');
}

// =========================================================================
// TEST 8: Offer Scene - Stable & Readable
// =========================================================================
console.log('\n--- Test 8: Offer Scene Readability ---');
{
  const offerPlan: EditingRhythmPlan = {
    paceLevel: 'CONTROLLED',
    targetVisualIntervalMs: 2800,
    minimumReadableDurationMs: 2200,
    motionBudget: 'MINIMAL',
    noveltyIntervalMs: 2800,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: false,
    refreshStrategy: 'NONE',
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'HIGH',
    reason: 'Offer stack protection',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'offer',
    editing_rhythm_plan: offerPlan,
    composition_profile: {
      primaryAttention: 'OFFER_VALUE_STACK',
    } as any,
  });

  const d = getRuntimeRhythmDirective(scene, 1.0, 1.0);
  assert(d.suppressAggressiveMotion === true, 'TEST 8.1: Offer suppresses aggressive motion');
  assert(d.refreshActive === false, 'TEST 8.2: Offer blocks mid-scene refreshes');
}

// =========================================================================
// TEST 9: CTA Scene - MINIMAL Motion
// =========================================================================
console.log('\n--- Test 9: CTA Scene Stability ---');
{
  const ctaPlan: EditingRhythmPlan = {
    paceLevel: 'STABLE',
    targetVisualIntervalMs: 3000,
    minimumReadableDurationMs: 2200,
    motionBudget: 'MINIMAL',
    noveltyIntervalMs: 3000,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: false,
    refreshStrategy: 'NONE',
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'HIGH',
    reason: 'CTA conversion focus',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'cta',
    motion: 'punch_zoom',
    editing_rhythm_plan: ctaPlan,
    composition_profile: {
      primaryAttention: 'CTA_ACTION_BADGE',
    } as any,
  });

  const d = getRuntimeRhythmDirective(scene, 1.0, 1.0);
  assert(d.motionMultiplier === 0.25, 'TEST 9.1: CTA motionMultiplier is 0.25 (MINIMAL)');
  assert(d.suppressAggressiveMotion === true, 'TEST 9.2: CTA suppresses aggressive motion');
  assert(d.refreshActive === false, 'TEST 9.3: CTA blocks mid-scene refreshes');
}

// =========================================================================
// TEST 10: Legacy Scene Fallback (No editing_rhythm_plan)
// =========================================================================
console.log('\n--- Test 10: Legacy Fallback Without editing_rhythm_plan ---');
{
  const legacyScene = createMockScene({
    editing_rhythm_plan: undefined,
  });

  const d = getRuntimeRhythmDirective(legacyScene, 1.0, 1.0);
  assert(d.motionMultiplier === 1.0, 'TEST 10.1: Fallback motionMultiplier defaults to 1.0');
  assert(d.refreshActive === false, 'TEST 10.2: Fallback refreshActive is false');
  assert(d.refreshStage === 0, 'TEST 10.3: Fallback refreshStage is 0');
  assert(d.effectiveMotionScale === 0, 'TEST 10.4: Fallback effectiveMotionScale is 0');
}

// =========================================================================
// TEST 11: Step 9.4 Conflict Resolution - Composition Hierarchy Wins
// =========================================================================
console.log('\n--- Test 11: Composition Attention Hierarchy Overrides Rhythm Plan ---');
{
  const conflictedPlan: EditingRhythmPlan = {
    paceLevel: 'FAST',
    targetVisualIntervalMs: 1400,
    minimumReadableDurationMs: 1000,
    motionBudget: 'HIGH',
    noveltyIntervalMs: 1400,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: true, // Erroneously allows refresh
    refreshStrategy: 'CROP_SHIFT',
    midSceneRefreshPointsSec: [1.5],
    preserveSpeechBoundary: false,
    preserveCompositionFocus: false,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'NORMAL',
    reason: 'Erroneous refresh on proof',
  };

  const scene = createMockScene({
    role: 'explanation',
    adRole: 'proof',
    editing_rhythm_plan: conflictedPlan,
    composition_profile: {
      primaryAttention: 'EVIDENCE_DASHBOARD',
    } as any,
  });

  const d = getRuntimeRhythmDirective(scene, 2.0, 2.0);
  assert(d.refreshActive === false, 'TEST 11.1: Evidence hierarchy suppresses refreshActive');
  assert(d.refreshStage === 0, 'TEST 11.2: Evidence hierarchy locks refreshStage to 0');
  assert(d.suppressAggressiveMotion === true, 'TEST 11.3: Evidence hierarchy enforces suppressAggressiveMotion');
}

// =========================================================================
// TEST 12: Determinism
// =========================================================================
console.log('\n--- Test 12: Determinism ---');
{
  const plan: EditingRhythmPlan = {
    paceLevel: 'MEDIUM',
    targetVisualIntervalMs: 2300,
    minimumReadableDurationMs: 1800,
    motionBudget: 'MEDIUM',
    noveltyIntervalMs: 2300,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: true,
    refreshStrategy: 'CROP_SHIFT',
    midSceneRefreshPointsSec: [2.3, 4.6],
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'DENSE',
    readabilityPriority: 'HIGH',
    reason: 'Determinism test',
  };

  const scene = createMockScene({
    editing_rhythm_plan: plan,
  });

  const d1 = getRuntimeRhythmDirective(scene, 3.2, 3.2);
  const d2 = getRuntimeRhythmDirective(scene, 3.2, 3.2);

  assert(JSON.stringify(d1) === JSON.stringify(d2), 'TEST 12.1: Identical scene and timestamp produce identical directive');
}

// =========================================================================
// TEST 13: MP4 Filter Expression Parity
// =========================================================================
console.log('\n--- Test 13: MP4 Filter Expression Parity ---');
{
  const problemPlan: EditingRhythmPlan = {
    paceLevel: 'MEDIUM',
    targetVisualIntervalMs: 2300,
    minimumReadableDurationMs: 1800,
    motionBudget: 'HIGH',
    noveltyIntervalMs: 2300,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: true,
    refreshStrategy: 'SUBTLE_REFRAME',
    midSceneRefreshPointsSec: [2.3, 4.6],
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'NORMAL',
    reason: 'MP4 test',
  };

  const scene = createMockScene({
    adRole: 'problem',
    editing_rhythm_plan: problemPlan,
  });

  const filter = getRhythmFilterExpression(scene, 7.0);
  assert(filter.motionMultiplier === 1.0, 'TEST 13.1: Filter preserves motionMultiplier 1.0');
  assert(filter.zExprReframe.includes('gte(t,2.30)'), 'TEST 13.2: Filter includes stage 1 zoom reframe');
  assert(filter.zExprReframe.includes('gte(t,4.60)'), 'TEST 13.3: Filter includes stage 2 zoom reframe');
  assert(filter.xExprReframe.includes('gte(t,2.30)'), 'TEST 13.4: Filter includes stage 1 pan reframe');
}

// =========================================================================
// TEST 14: Canvas getCameraTransform Parity
// =========================================================================
console.log('\n--- Test 14: Canvas getCameraTransform Parity ---');
{
  const ctaPlan: EditingRhythmPlan = {
    paceLevel: 'STABLE',
    targetVisualIntervalMs: 3000,
    minimumReadableDurationMs: 2200,
    motionBudget: 'MINIMAL',
    noveltyIntervalMs: 3000,
    preferredTransition: 'cut',
    transitionDurationMs: 0,
    allowMidSceneRefresh: false,
    refreshStrategy: 'NONE',
    preserveSpeechBoundary: true,
    preserveCompositionFocus: true,
    speechDensityLevel: 'NORMAL',
    readabilityPriority: 'HIGH',
    reason: 'CTA canvas test',
  };

  const scene = createMockScene({
    adRole: 'cta',
    motion: 'punch_zoom',
    editing_rhythm_plan: ctaPlan,
  });

  const transform = getCameraTransform(scene, 1.0);
  assert(transform.scale <= 1.22, 'TEST 14.1: CTA punch zoom does not blow out scale due to rhythm damping');
}

console.log(`\n=== STEP 9.5B.2 RUNTIME INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) {
  process.exit(1);
}
