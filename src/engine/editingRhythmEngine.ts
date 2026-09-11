/**
 * ALCO AUTO MOTION V5 — STEP 9.5B
 * Central Meta Ads Editing Rhythm Engine
 *
 * Deterministic, role-aware pacing orchestrator for high-retention performance video ads.
 * Single Source of Truth for:
 * - Scene functional tempo & visual interval planning
 * - Readability protection for proof, demo, and offer assets
 * - Speech-density cadence adaptation
 * - Mid-scene novelty refresh recommendations (without destructive audio/transcript slicing)
 * - Motion budgeting & transition pacing
 * - Strict Step 9.4 Attention Hierarchy & Hook Focal Lock compliance
 */

import {
  SceneEditPlan,
  AdRole,
  ContentType,
  TransitionType,
  PaceLevel,
  MotionBudget,
  SpeechDensityLevel,
  ReadabilityPriority,
  RefreshStrategy,
  EditingRhythmPlan,
} from '../types';
import { SceneCompositionProfile } from './sceneCompositionEngine';

export type {
  PaceLevel,
  MotionBudget,
  SpeechDensityLevel,
  ReadabilityPriority,
  RefreshStrategy,
  EditingRhythmPlan,
};

export interface RhythmEvaluationParams {
  scene: SceneEditPlan;
  index: number;
  totalScenes: number;
  contentType?: ContentType;
  previousScene?: SceneEditPlan;
  nextScene?: SceneEditPlan;
  compositionProfile?: SceneCompositionProfile;
}

/**
 * 1. Speech Density Classifier based on wordsPerSecond
 * - SPARSE: < 2.2 WPS (spacious delivery, allows more frequent visual refresh)
 * - NORMAL: 2.2 - 3.8 WPS (standard conversational cadence)
 * - DENSE:  > 3.8 WPS (rapid speech, requires reduced motion & longer visual hold to prevent cognitive overload)
 */
export function classifySpeechDensity(wordsPerSecond: number): SpeechDensityLevel {
  if (wordsPerSecond < 2.2) {
    return 'SPARSE';
  }
  if (wordsPerSecond > 3.8) {
    return 'DENSE';
  }
  return 'NORMAL';
}

/**
 * Helper to calculate words-per-second safely
 */
export function calculateWordsPerSecond(caption: string, durationSec: number): number {
  if (!caption || durationSec <= 0.1) return 2.8;
  const wordCount = caption.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 2.5;
  return Number((wordCount / durationSec).toFixed(2));
}

/**
 * 2. Deterministic Minimum Readability Calculator
 * Establishes human-comprehension visual duration benchmarks.
 *
 * Benchmarks:
 * - simple metric: 1400–1800ms (base 1600ms)
 * - dashboard / screenshot: 1800–2500ms (base 2200ms)
 * - before / after comparison: 2000–2600ms (base 2400ms)
 * - software demo / screencast: 2000–3000ms (base 2500ms)
 * - offer / value stack: 1800–2600ms (base 2200ms)
 * - CTA action: 1500–2200ms (base 1800ms)
 * - default talking head: 1200ms
 */
export function calculateMinimumReadableDurationMs(
  scene: SceneEditPlan,
  compositionProfile?: SceneCompositionProfile
): number {
  const adRole = scene.adRole || (scene.role as unknown as AdRole);
  const visualEvidence = scene.visual_evidence;
  const evidenceType = visualEvidence?.type;
  const captionWords = (scene.caption || '').trim().split(/\s+/).filter(Boolean).length;
  const textDensityPaddingMs = Math.min(600, Math.max(0, (captionWords - 8) * 40));

  // 1. Software Demo / Product Walkthrough
  if (adRole === 'demo' || scene.visualDecision === 'PRODUCT_DEMO' || evidenceType === 'SCREEN_DEMO') {
    return 2500 + textDensityPaddingMs;
  }

  // 2. Before / After Comparison Split
  if (evidenceType === 'SPLIT_COMPARE' || scene.visualDecision === 'SPLIT_SCREEN') {
    return 2400 + textDensityPaddingMs;
  }

  // 3. Dashboard / Verified Analytics Screenshot
  if (
    adRole === 'proof' &&
    (evidenceType === 'SCREEN_PROOF' ||
      evidenceType === 'CALLOUT_POINTER' ||
      scene.visualDecision === 'SCREENSHOT' ||
      scene.visualDecision === 'GRAPH' ||
      compositionProfile?.primaryAttention === 'EVIDENCE_DASHBOARD')
  ) {
    return 2200 + textDensityPaddingMs;
  }

  // 4. Offer / Value Stack
  if (adRole === 'offer' || evidenceType === 'OFFER_CARD' || compositionProfile?.primaryAttention === 'OFFER_VALUE_STACK') {
    return 2200 + textDensityPaddingMs;
  }

  // 5. CTA Action Frame
  if (adRole === 'cta' || evidenceType === 'CTA_CARD' || compositionProfile?.primaryAttention === 'CTA_ACTION_BADGE') {
    return 1800 + textDensityPaddingMs;
  }

  // 6. Simple metric callout or data card fallback
  if (adRole === 'proof' || (evidenceType && evidenceType !== 'NONE')) {
    return 1600 + textDensityPaddingMs;
  }

  // 7. General talking head scene
  return 1200;
}

/**
 * 3. Central Editing Rhythm Engine — Main Evaluator
 * Translates editorial function, attention hierarchy, and speech physics into an authoritative EditingRhythmPlan.
 */
export function calculateEditingRhythmPlan(params: RhythmEvaluationParams): EditingRhythmPlan {
  const { scene, index, totalScenes, contentType, compositionProfile } = params;

  // Resolve role and editorial identity
  const adRole: AdRole = scene.adRole || (scene.role as unknown as AdRole) || 'solution';
  const isHook = index === 0 || scene.role === 'hook' || adRole === 'hook';
  const isLastScene = index === totalScenes - 1 || scene.role === 'cta' || adRole === 'cta';

  // Duration & Speech metrics
  const durationSec = Math.max(
    0.1,
    scene.speech_duration ||
      (typeof scene.end === 'number' && typeof scene.start === 'number'
        ? scene.end - scene.start
        : 2.5)
  );
  const durationMs = durationSec * 1000;
  const wordsPerSecond = calculateWordsPerSecond(scene.caption || '', durationSec);
  const speechDensityLevel = classifySpeechDensity(wordsPerSecond);

  // Minimum Readability Benchmark
  const minimumReadableDurationMs = calculateMinimumReadableDurationMs(scene, compositionProfile);
  const requiresVisualHold = durationMs < minimumReadableDurationMs;

  // Has visual evidence or asset
  const hasVisualEvidence = Boolean(scene.visual_evidence);
  const hasBroll = Boolean(scene.broll);
  const hasVisualAsset = hasVisualEvidence || hasBroll;

  // Base role-specific pacing defaults
  let paceLevel: PaceLevel = 'MEDIUM';
  let targetVisualIntervalMs = 2200;
  let motionBudget: MotionBudget = 'MEDIUM';
  let noveltyIntervalMs = 2400;
  let preferredTransition: TransitionType = 'cut';
  let transitionDurationMs = 0;
  let allowMidSceneRefresh = false;
  let refreshStrategy: RefreshStrategy = 'NONE';
  let readabilityPriority: ReadabilityPriority = 'NORMAL';
  let preserveSpeechBoundary = true;
  let preserveCompositionFocus = true;
  let reason = '';

  // Step 9.4 Priority Flag
  const isEvidencePrimary =
    compositionProfile?.evidencePriority === 'PRIMARY' ||
    compositionProfile?.primaryAttention === 'EVIDENCE_DASHBOARD' ||
    compositionProfile?.primaryAttention === 'PRODUCT_DEMO';
  const isHookFocalLockActive = Boolean(compositionProfile?.hookFocalLockActive);
  const isCtaPrimary =
    compositionProfile?.primaryAttention === 'CTA_ACTION_BADGE' || isLastScene;

  // =========================================================================
  // ROLE-SPECIFIC PACING PROFILES
  // =========================================================================

  if (isHook) {
    // -----------------------------------------------------------------------
    // HOOK (0-3s Opening Window)
    // -----------------------------------------------------------------------
    paceLevel = 'FAST';
    readabilityPriority = 'NORMAL';
    noveltyIntervalMs = 1200;
    motionBudget = 'HIGH';
    targetVisualIntervalMs = 1000; // Baseline 1000ms

    // Transitions
    const isFastStyle = contentType === 'fast_tiktok' || contentType === 'meta_ads';
    preferredTransition = isFastStyle ? 'flash' : 'cut';
    transitionDurationMs = preferredTransition === 'flash' ? 180 : 0;

    // Step 9.4 Hook Focal Lock Safeguard:
    // No secondary refresh or disruptive cuts during opening focal lock window (1.2s)
    allowMidSceneRefresh = false;
    refreshStrategy = 'NONE';
    preserveCompositionFocus = true;

    reason =
      'Hook 0-3s Window: Fast tempo, high initial kinetic impact with presenter eye-contact lock.';
  } else if (adRole === 'problem' || adRole === 'agitate') {
    // -----------------------------------------------------------------------
    // PROBLEM / AGITATE
    // -----------------------------------------------------------------------
    const isAgitate = adRole === 'agitate';
    paceLevel = isAgitate ? 'MEDIUM_FAST' : 'MEDIUM';
    readabilityPriority = 'NORMAL';
    noveltyIntervalMs = 2400;

    motionBudget = 'MEDIUM';
    targetVisualIntervalMs = isAgitate ? 2000 : 2200;
    preferredTransition = 'cut';
    transitionDurationMs = 0;

    // Allow emotional delivery to register; avoid chaotic cuts.
    // If long scene (>= 4.0s) with talking head, schedule subtle reframe/crop shift
    if (durationSec >= 4.0 && speechDensityLevel !== 'DENSE') {
      allowMidSceneRefresh = true;
      refreshStrategy = 'SUBTLE_REFRAME';
    } else {
      allowMidSceneRefresh = false;
      refreshStrategy = 'NONE';
    }

    reason =
      'Problem/Agitate Cadence: Controlled pacing allowing emotional friction to register without jarring cuts.';
  } else if (adRole === 'insight') {
    // -----------------------------------------------------------------------
    // INSIGHT
    // -----------------------------------------------------------------------
    paceLevel = 'MEDIUM';
    readabilityPriority = 'NORMAL';
    noveltyIntervalMs = 2600;
    motionBudget = 'MEDIUM';
    targetVisualIntervalMs = 2400;
    preferredTransition = 'cut';
    transitionDurationMs = 0;

    if (durationSec >= 4.5 && speechDensityLevel !== 'DENSE') {
      allowMidSceneRefresh = true;
      refreshStrategy = 'CROP_SHIFT';
    }

    reason = 'Insight Cadence: Balanced cognitive tempo allowing revelation to settle.';
  } else if (adRole === 'solution') {
    // -----------------------------------------------------------------------
    // SOLUTION
    // -----------------------------------------------------------------------
    paceLevel = 'MEDIUM';
    noveltyIntervalMs = 2400;
    preferredTransition = 'cut';
    transitionDurationMs = 0;

    if (hasVisualAsset) {
      // Prioritize mechanism comprehension over speed
      motionBudget = 'LOW';
      targetVisualIntervalMs = 2400;
      readabilityPriority = 'HIGH';
      allowMidSceneRefresh = false;
      refreshStrategy = 'EVIDENCE_HOLD';
      reason =
        'Solution with Product Asset: Deliberate tempo prioritizing mechanism comprehension.';
    } else {
      motionBudget = 'MEDIUM';
      targetVisualIntervalMs = 2000;
      readabilityPriority = 'NORMAL';
      if (durationSec >= 4.5 && speechDensityLevel !== 'DENSE') {
        allowMidSceneRefresh = true;
        refreshStrategy = 'SUBTLE_REFRAME';
      }
      reason = 'Solution Cadence: Clear explanatory flow prioritizing comprehension.';
    }
  } else if (adRole === 'demo') {
    // -----------------------------------------------------------------------
    // DEMO
    // -----------------------------------------------------------------------
    paceLevel = 'CONTROLLED';
    readabilityPriority = 'HIGH';
    motionBudget = 'LOW';
    targetVisualIntervalMs = 2500;
    noveltyIntervalMs = 2800;
    preferredTransition = 'cut';
    transitionDurationMs = 0;

    // Avoid visual changes that interrupt UI comprehension
    allowMidSceneRefresh = false;
    refreshStrategy = 'EVIDENCE_HOLD';
    preserveCompositionFocus = true;

    reason = 'Product Demo Cadence: Controlled visual tempo preserving UI comprehension.';
  } else if (adRole === 'proof') {
    // -----------------------------------------------------------------------
    // PROOF
    // -----------------------------------------------------------------------
    paceLevel = 'CONTROLLED';
    readabilityPriority = 'CRITICAL';
    motionBudget = 'MINIMAL';
    targetVisualIntervalMs = 2400;
    noveltyIntervalMs = 2600;
    preferredTransition = 'cut';
    transitionDurationMs = 0;

    // Strict evidence hold — no aggressive cutaways
    allowMidSceneRefresh = false;
    refreshStrategy = 'EVIDENCE_HOLD';
    preserveCompositionFocus = true;

    reason =
      'Evidence Proof Cadence: Grounded framing protecting data card and verified metrics readability.';
  } else if (adRole === 'benefit') {
    // -----------------------------------------------------------------------
    // BENEFIT
    // -----------------------------------------------------------------------
    paceLevel = 'MEDIUM';
    readabilityPriority = 'NORMAL';
    motionBudget = 'MEDIUM';
    targetVisualIntervalMs = 2200;
    noveltyIntervalMs = 2400;
    preferredTransition = 'cut';
    transitionDurationMs = 0;

    if (durationSec >= 4.0 && speechDensityLevel !== 'DENSE') {
      allowMidSceneRefresh = true;
      refreshStrategy = 'CROP_SHIFT';
    }

    reason = 'Benefit Cadence: Positive, dynamic pacing highlighting value proposition.';
  } else if (adRole === 'offer') {
    // -----------------------------------------------------------------------
    // OFFER
    // -----------------------------------------------------------------------
    paceLevel = 'CONTROLLED';
    readabilityPriority = 'HIGH';
    motionBudget = 'LOW';
    targetVisualIntervalMs = 2400;
    noveltyIntervalMs = 2500;
    preferredTransition = 'cut';
    transitionDurationMs = 0;

    // Price / value stack must remain readable
    allowMidSceneRefresh = false;
    refreshStrategy = 'EVIDENCE_HOLD';
    preserveCompositionFocus = true;

    reason = 'Offer Value Stack: Stable presentation allowing user to read price and incentives.';
  } else if (isLastScene || adRole === 'cta') {
    // -----------------------------------------------------------------------
    // CTA
    // -----------------------------------------------------------------------
    paceLevel = 'STABLE';
    readabilityPriority = 'HIGH';
    motionBudget = 'MINIMAL';
    targetVisualIntervalMs = 2000;
    noveltyIntervalMs = 2200;
    preferredTransition = scene.motion === 'punch_zoom' ? 'zoom_cut' : 'cut';
    transitionDurationMs = 0;

    // CTA must remain visually stable
    allowMidSceneRefresh = false;
    refreshStrategy = 'NONE';
    preserveCompositionFocus = true;

    reason = 'Conversion CTA: Stable, focused action frame commanding immediate click-through.';
  }

  // =========================================================================
  // SPEECH DENSITY ADJUSTMENTS
  // =========================================================================
  if (speechDensityLevel === 'DENSE') {
    // Dense speech: throttle motion budget by 1 tier to avoid visual overwhelm
    if (motionBudget === 'HIGH') motionBudget = 'MEDIUM';
    else if (motionBudget === 'MEDIUM') motionBudget = 'LOW';
    else if (motionBudget === 'LOW') motionBudget = 'MINIMAL';

    // Widen visual interval (+300ms) to allow captions to be read
    targetVisualIntervalMs = Math.min(3200, targetVisualIntervalMs + 300);

    // Suppress mid-scene refresh on dense speech
    allowMidSceneRefresh = false;
    if (refreshStrategy !== 'EVIDENCE_HOLD') {
      refreshStrategy = 'NONE';
    }
  } else if (speechDensityLevel === 'SPARSE') {
    // Sparse speech: visual refresh can occur slightly more frequently (-200ms)
    targetVisualIntervalMs = Math.max(900, targetVisualIntervalMs - 200);
  }

  // =========================================================================
  // STEP 9.4 COMPOSITION HIERARCHY OVERRIDE (CRITICAL GUARDRAIL)
  // Rhythm must NEVER override or conflict with Step 9.4 Attention Hierarchy.
  // =========================================================================
  if (isEvidencePrimary) {
    readabilityPriority = adRole === 'demo' ? 'HIGH' : 'CRITICAL';
    motionBudget = adRole === 'demo' ? 'LOW' : 'MINIMAL';
    allowMidSceneRefresh = false;
    refreshStrategy = 'EVIDENCE_HOLD';
    preserveCompositionFocus = true;
  }

  if (isHookFocalLockActive) {
    // During hook focal lock (first 1.2s), lock eye-contact on presenter
    allowMidSceneRefresh = false;
    if (refreshStrategy !== 'EVIDENCE_HOLD') {
      refreshStrategy = 'NONE';
    }
    preserveCompositionFocus = true;
  }

  if (isCtaPrimary) {
    paceLevel = 'STABLE';
    motionBudget = 'MINIMAL';
    readabilityPriority = 'HIGH';
    allowMidSceneRefresh = false;
    refreshStrategy = 'NONE';
    preserveCompositionFocus = true;
  }

  // =========================================================================
  // MID-SCENE NOVELTY REFRESH POINTS CALCULATION
  // Generates non-destructive timing markers for long monologue scenes
  // =========================================================================
  let midSceneRefreshPointsSec: number[] | undefined;
  if (allowMidSceneRefresh && durationSec >= 4.0) {
    if (durationSec >= 6.0) {
      // 6s+ scene: 2 subtle novelty refresh points (e.g. at 2.4s and 4.6s)
      const p1 = Number((durationSec * 0.4).toFixed(1));
      const p2 = Number((durationSec * 0.75).toFixed(1));
      midSceneRefreshPointsSec = [p1, p2];
    } else {
      // 4.0s - 5.9s scene: 1 subtle refresh point at midway (approx 50%)
      const p1 = Number((durationSec * 0.52).toFixed(1));
      midSceneRefreshPointsSec = [p1];
    }
  }

  return {
    paceLevel,
    targetVisualIntervalMs,
    minimumReadableDurationMs,
    motionBudget,
    noveltyIntervalMs,
    preferredTransition,
    transitionDurationMs,
    allowMidSceneRefresh,
    refreshStrategy,
    midSceneRefreshPointsSec,
    preserveSpeechBoundary,
    preserveCompositionFocus,
    speechDensityLevel,
    readabilityPriority,
    requiresVisualHold,
    reason,
  };
}

/**
 * 4. Project-Wide Batch Enriched Rhythm Planner
 * Evaluates and assigns editing_rhythm_plan to all scenes in an edit plan sequentially.
 */
export function calculateProjectEditingRhythmPlans(
  scenes: SceneEditPlan[],
  contentType?: ContentType
): SceneEditPlan[] {
  const totalScenes = scenes.length;
  return scenes.map((scene, idx) => {
    const previousScene = idx > 0 ? scenes[idx - 1] : undefined;
    const nextScene = idx < totalScenes - 1 ? scenes[idx + 1] : undefined;
    const plan = calculateEditingRhythmPlan({
      scene,
      index: idx,
      totalScenes,
      contentType,
      previousScene,
      nextScene,
      compositionProfile: scene.composition_profile,
    });
    return {
      ...scene,
      editing_rhythm_plan: plan,
    };
  });
}
