/**
 * ALCO Auto Motion V5 — Editing Rhythm Plan Runtime Integration
 * Step 9.5B.2: Central Shared Runtime Interpretation Layer
 *
 * Translates EditingRhythmPlan metadata into concrete, renderer-agnostic
 * RuntimeRhythmDirectives consumed identically across:
 * - PreviewPlayer (React DOM / CSS)
 * - Canvas Renderer (renderFrame.ts)
 * - MP4 Server Renderer (mp4Renderer.ts / FFmpeg filter graph)
 *
 * Core Principles:
 * 1. Single source of truth for runtime rhythm behavior.
 * 2. Step 9.4 Scene Composition & Attention Hierarchy always takes priority over rhythm.
 * 3. Non-destructive: No transcript splits, audio splits, or timeline mutations.
 * 4. Full backward-compatibility: gracefully handles scenes without editing_rhythm_plan.
 */

import {
  SceneEditPlan,
  EditingRhythmPlan,
  RuntimeRhythmDirective,
  MotionBudget,
  RefreshStrategy,
  TransitionType,
  EvidenceHoldWindow,
  EvidenceResolution,
} from '../types';
import { clampScale } from '../config/talkingHeadMotionConfig';
import { isHookFocalLockActive, SceneCompositionProfile } from './sceneCompositionEngine';

/**
 * Maps MotionBudget to numeric multiplier.
 * Damps zoom deltas, crop shifts, pan distances, and punch intensities.
 *
 * HIGH    ≈ 1.00
 * MEDIUM  ≈ 0.80
 * LOW     ≈ 0.55
 * MINIMAL ≈ 0.25
 */
export function getMotionBudgetMultiplier(motionBudget?: MotionBudget): number {
  switch (motionBudget) {
    case 'HIGH':
      return 1.0;
    case 'MEDIUM':
      return 0.8;
    case 'LOW':
      return 0.55;
    case 'MINIMAL':
      return 0.25;
    default:
      return 1.0;
  }
}

/**
 * Evaluates the current mid-scene refresh stage based on scene-relative time
 * and scheduled refresh points.
 *
 * Enforces Step 9.4 Priority:
 * - Hook focal lock (0-1.2s): strictly blocks mid-scene refreshes.
 * - Proof / Demo / Offer / CTA: blocks disruptive camera refreshes to protect readability.
 */
export function getRefreshStage(
  scene: Partial<SceneEditPlan>,
  currentTime: number,
  sceneRelativeTime?: number
): { stage: number; refreshActive: boolean; timeSinceRefresh: number } {
  const plan = scene.editing_rhythm_plan;
  const t =
    sceneRelativeTime !== undefined
      ? sceneRelativeTime
      : Math.max(0, currentTime - (scene.start || 0));

  if (!plan || !plan.allowMidSceneRefresh) {
    return { stage: 0, refreshActive: false, timeSinceRefresh: t };
  }

  // Step 9.4 Priority Check: Hook Focal Lock active window (0-1.2s)
  const isHookRole = scene.role === 'hook' || scene.adRole === 'hook';
  if (
    isHookRole &&
    (t < 1.2 || isHookFocalLockActive(currentTime, scene.start || 0, scene.composition_profile))
  ) {
    return { stage: 0, refreshActive: false, timeSinceRefresh: t };
  }

  // Step 9.4 Priority Check: High-priority evidence or conversion anchors
  const compProfile = scene.composition_profile as SceneCompositionProfile | undefined;
  const isEvidenceOrCta =
    scene.adRole === 'proof' ||
    scene.adRole === 'demo' ||
    scene.adRole === 'offer' ||
    scene.adRole === 'cta' ||
    compProfile?.primaryAttention === 'EVIDENCE_DASHBOARD' ||
    compProfile?.primaryAttention === 'PRODUCT_DEMO' ||
    compProfile?.primaryAttention === 'CTA_ACTION_BADGE' ||
    compProfile?.primaryAttention === 'OFFER_VALUE_STACK';

  if (isEvidenceOrCta) {
    return { stage: 0, refreshActive: false, timeSinceRefresh: t };
  }

  const points = plan.midSceneRefreshPointsSec;
  if (!points || points.length === 0) {
    return { stage: 0, refreshActive: false, timeSinceRefresh: t };
  }

  // Count how many refresh points have been passed
  let stage = 0;
  let lastRefreshPoint = 0;

  for (let i = 0; i < points.length; i++) {
    if (t >= points[i]) {
      stage = i + 1;
      lastRefreshPoint = points[i];
    } else {
      break;
    }
  }

  const refreshActive = stage > 0;
  const timeSinceRefresh = refreshActive ? t - lastRefreshPoint : t;

  return { stage, refreshActive, timeSinceRefresh };
}

/**
 * Calculates controlled spatial offsets (scale delta, crop X %, crop Y %) for a given refresh stage.
 * Protects talking-head eyeline and subject safe area boundaries.
 */
export function getRefreshOffsets(
  strategy: RefreshStrategy,
  stage: number,
  motionMultiplier: number,
  timeSinceRefresh: number,
  isTalkingHead: boolean = true
): { scaleDelta: number; cropX: number; cropY: number } {
  if (stage === 0) {
    return { scaleDelta: 0, cropX: 0, cropY: 0 };
  }

  let scaleDelta = 0;
  let cropX = 0;
  let cropY = 0;

  switch (strategy) {
    case 'SUBTLE_REFRAME':
      // Safe ranges: scale delta 0.015-0.035, cropX 1.0-2.5%, cropY 0.5-1.5%
      if (stage === 1) {
        scaleDelta = 0.025 * motionMultiplier;
        cropX = 1.8 * motionMultiplier;
        cropY = (isTalkingHead ? -0.8 : -1.2) * motionMultiplier;
      } else if (stage === 2) {
        scaleDelta = -0.015 * motionMultiplier;
        cropX = -1.5 * motionMultiplier;
        cropY = (isTalkingHead ? 0.6 : 0.8) * motionMultiplier;
      } else {
        const isOdd = stage % 2 === 1;
        scaleDelta = (isOdd ? 0.02 : -0.012) * motionMultiplier;
        cropX = (isOdd ? 1.4 : -1.2) * motionMultiplier;
        cropY = (isOdd ? -0.6 : 0.5) * motionMultiplier;
      }
      break;

    case 'CROP_SHIFT':
      // Alternating subtle horizontal shift, zero vertical eyeline displacement
      if (stage === 1) {
        cropX = 1.8 * motionMultiplier;
      } else if (stage === 2) {
        cropX = -1.8 * motionMultiplier;
      } else {
        cropX = (stage % 2 === 1 ? 1.5 : -1.5) * motionMultiplier;
      }
      scaleDelta = 0;
      cropY = 0;
      break;

    case 'PUNCH_REFRESH':
      // Only active if motion multiplier allows (HIGH/MEDIUM)
      if (motionMultiplier >= 0.75) {
        const decay = Math.max(0, 1 - timeSinceRefresh / 0.25);
        scaleDelta = (0.035 * decay + 0.015) * motionMultiplier;
        cropX = 0;
        cropY = 0;
      }
      break;

    case 'NONE':
    case 'EVIDENCE_HOLD':
    default:
      scaleDelta = 0;
      cropX = 0;
      cropY = 0;
      break;
  }

  // Eyeline Safeguard: Never push vertical crop beyond safe boundary
  const maxSafeCropY = isTalkingHead ? 1.5 : 2.5;
  const maxSafeCropX = isTalkingHead ? 2.5 : 3.5;

  return {
    scaleDelta: Math.max(-0.04, Math.min(0.05, scaleDelta)),
    cropX: Math.max(-maxSafeCropX, Math.min(maxSafeCropX, cropX)),
    cropY: Math.max(-maxSafeCropY, Math.min(maxSafeCropY, cropY)),
  };
}

/**
 * Checks if Evidence Hold is currently active to safeguard proof/demo readability.
 */
export function isEvidenceHoldActive(
  scene: Partial<SceneEditPlan>,
  currentTime: number,
  sceneRelativeTime?: number
): boolean {
  const plan = scene.editing_rhythm_plan;
  const role = scene.adRole || scene.role;

  // Explicit evidence hold or requiresVisualHold in plan
  if (plan?.refreshStrategy === 'EVIDENCE_HOLD' || plan?.requiresVisualHold) {
    return true;
  }

  // Role-based evidence hold protection
  if (role === 'proof' || role === 'demo') {
    return true;
  }

  // Attention hierarchy check
  const comp = scene.composition_profile as SceneCompositionProfile | undefined;
  if (
    comp?.primaryAttention === 'EVIDENCE_DASHBOARD' ||
    comp?.primaryAttention === 'PRODUCT_DEMO'
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves authoritative transition according to hierarchy:
 * 1. Explicit plan preferredTransition
 * 2. Legacy scene.transition
 * 3. Default 'cut'
 */
export function getRhythmAdjustedTransition(
  scene: Partial<SceneEditPlan>
): { transition: TransitionType; durationMs: number } {
  const plan = scene.editing_rhythm_plan;

  if (plan?.preferredTransition) {
    return {
      transition: plan.preferredTransition,
      durationMs: plan.transitionDurationMs || (plan.preferredTransition === 'cut' ? 0 : 180),
    };
  }

  if (scene.transition) {
    return {
      transition: scene.transition,
      durationMs: scene.transition === 'cut' ? 0 : 180,
    };
  }

  return { transition: 'cut', durationMs: 0 };
}

/**
 * Central Shared Runtime Helper:
 * Evaluates scene, currentTime, and scene-relative time to produce a
 * deterministic, renderer-agnostic RuntimeRhythmDirective.
 */
export function getRuntimeRhythmDirective(
  scene: Partial<SceneEditPlan>,
  currentTime: number,
  sceneRelativeTime?: number,
  context?: any
): RuntimeRhythmDirective {
  const plan = scene.editing_rhythm_plan;
  const t =
    sceneRelativeTime !== undefined
      ? sceneRelativeTime
      : Math.max(0, currentTime - (scene.start || 0));

  const compProfile = scene.composition_profile as SceneCompositionProfile | undefined;
  const adRole = scene.adRole || scene.role;
  const thFraming = scene.talking_head_framing;
  const isTH = thFraming?.is_talking_head !== false && thFraming?.protection_status !== 'SAFE_FALLBACK';

  // 1. Motion Budget Multiplier
  const motionBudget = plan?.motionBudget || 'HIGH';
  const motionMultiplier = getMotionBudgetMultiplier(motionBudget);

  // 2. Step 9.4 Composition & Attention Hierarchy Safeguards
  const isHookRole = scene.role === 'hook' || adRole === 'hook';
  const isHookFocalLocked =
    isHookRole &&
    (t < 1.2 || isHookFocalLockActive(currentTime, scene.start || 0, compProfile));

  const isEvidencePrimary =
    adRole === 'proof' ||
    adRole === 'demo' ||
    compProfile?.primaryAttention === 'EVIDENCE_DASHBOARD' ||
    compProfile?.primaryAttention === 'PRODUCT_DEMO';

  const isCtaStable =
    adRole === 'cta' ||
    adRole === 'offer' ||
    compProfile?.primaryAttention === 'CTA_ACTION_BADGE' ||
    compProfile?.primaryAttention === 'OFFER_VALUE_STACK';

  // 3. Suppress Aggressive Motion Flag
  const suppressAggressiveMotion =
    motionBudget === 'MINIMAL' ||
    isEvidencePrimary ||
    isCtaStable ||
    (motionBudget === 'LOW' && adRole !== 'hook');

  // 4. Preserve Composition Focus Flag
  const preserveCompositionFocus =
    plan?.preserveCompositionFocus !== false ||
    isHookFocalLocked ||
    isEvidencePrimary ||
    isCtaStable;

  // 5. Mid-scene refresh evaluation
  const { stage, refreshActive, timeSinceRefresh } = getRefreshStage(
    scene,
    currentTime,
    t
  );

  const effectiveStrategy = plan?.refreshStrategy || (isEvidencePrimary ? 'EVIDENCE_HOLD' : 'NONE');
  const offsets = getRefreshOffsets(
    effectiveStrategy,
    stage,
    motionMultiplier,
    timeSinceRefresh,
    isTH
  );

  // 6. Evidence Hold Evaluation
  const evidenceHoldActive = isEvidenceHoldActive(scene, currentTime, t);

  // 7. Transition Resolution
  const { transition: effectiveTransition, durationMs: effectiveTransitionDurationMs } =
    getRhythmAdjustedTransition(scene);

  // 8. Reason diagnostics
  let reason = plan?.reason || 'Baseline playback';
  if (isHookFocalLocked) {
    reason = 'Hook Focal Lock active (0-1.2s): suppressed refresh, protected eye contact';
  } else if (isEvidencePrimary) {
    reason = `Evidence primary (${adRole}): camera stabilized, evidence hold active`;
  } else if (isCtaStable) {
    reason = `Conversion anchor (${adRole}): stable action frame, minimal motion`;
  } else if (refreshActive) {
    reason = `Mid-scene refresh stage ${stage} (${effectiveStrategy}) applied at ${t.toFixed(2)}s`;
  }

  return {
    effectiveMotionScale: offsets.scaleDelta,
    effectiveCropXOffset: offsets.cropX,
    effectiveCropYOffset: offsets.cropY,
    motionMultiplier,
    refreshActive,
    refreshStage: stage,
    refreshStrategy: effectiveStrategy,
    effectiveTransition,
    effectiveTransitionDurationMs,
    evidenceHoldActive,
    suppressAggressiveMotion,
    preserveCompositionFocus,
    reason,
  };
}

/**
 * Generates deterministic FFmpeg arithmetic expressions for the MP4 renderer
 * to execute mid-scene reframing without splitting audio or video segments.
 */
export function getRhythmFilterExpression(
  scene: Partial<SceneEditPlan>,
  segDuration: number
): {
  zExprReframe: string;
  xExprReframe: string;
  yExprReframe: string;
  motionMultiplier: number;
  suppressAggressiveMotion: boolean;
} {
  const plan = scene.editing_rhythm_plan;
  const directive = getRuntimeRhythmDirective(scene, scene.start || 0, 0);
  const motionMult = directive.motionMultiplier;

  if (!plan?.allowMidSceneRefresh || !plan?.midSceneRefreshPointsSec || plan.midSceneRefreshPointsSec.length === 0) {
    return {
      zExprReframe: '0',
      xExprReframe: '0',
      yExprReframe: '0',
      motionMultiplier: motionMult,
      suppressAggressiveMotion: directive.suppressAggressiveMotion,
    };
  }

  const points = plan.midSceneRefreshPointsSec.filter((p) => p < segDuration);
  if (points.length === 0 || directive.suppressAggressiveMotion) {
    return {
      zExprReframe: '0',
      xExprReframe: '0',
      yExprReframe: '0',
      motionMultiplier: motionMult,
      suppressAggressiveMotion: directive.suppressAggressiveMotion,
    };
  }

  // Pre-calculate offsets for each stage
  const thFraming = scene.talking_head_framing;
  const isTH = thFraming?.is_talking_head !== false && thFraming?.protection_status !== 'SAFE_FALLBACK';

  const offsetsStage1 = getRefreshOffsets(plan.refreshStrategy, 1, motionMult, 1.0, isTH);
  const offsetsStage2 = getRefreshOffsets(plan.refreshStrategy, 2, motionMult, 1.0, isTH);

  if (points.length === 1) {
    const p1 = points[0].toFixed(2);
    return {
      zExprReframe: `if(gte(t,${p1}), ${offsetsStage1.scaleDelta.toFixed(4)}, 0)`,
      xExprReframe: `if(gte(t,${p1}), ${offsetsStage1.cropX.toFixed(2)}, 0)`,
      yExprReframe: `if(gte(t,${p1}), ${offsetsStage1.cropY.toFixed(2)}, 0)`,
      motionMultiplier: motionMult,
      suppressAggressiveMotion: directive.suppressAggressiveMotion,
    };
  }

  // 2 or more points
  const p1 = points[0].toFixed(2);
  const p2 = points[1].toFixed(2);

  return {
    zExprReframe: `if(gte(t,${p2}), ${offsetsStage2.scaleDelta.toFixed(4)}, if(gte(t,${p1}), ${offsetsStage1.scaleDelta.toFixed(4)}, 0))`,
    xExprReframe: `if(gte(t,${p2}), ${offsetsStage2.cropX.toFixed(2)}, if(gte(t,${p1}), ${offsetsStage1.cropX.toFixed(2)}, 0))`,
    yExprReframe: `if(gte(t,${p2}), ${offsetsStage2.cropY.toFixed(2)}, if(gte(t,${p1}), ${offsetsStage1.cropY.toFixed(2)}, 0))`,
    motionMultiplier: motionMult,
    suppressAggressiveMotion: directive.suppressAggressiveMotion,
  };
}

// =========================================================================
// STEP 9.5B.3: MINIMUM READABLE VISUAL HOLD & CONFLICT RESOLUTION
// =========================================================================

/**
 * Maximum additional hold extension permitted beyond the source scene's end.
 * Safety ceiling to prevent unbounded visual carry-overs if duration metadata is malformed.
 */
export const MAX_EXTRA_HOLD_SEC = 2.5;

/**
 * Shared Conflict Resolution for Evidence Hold (Step 9.5B.3):
 * Determines whether visual evidence from a source scene can safely carry over
 * into a subsequent target scene without colliding with primary visual anchors.
 *
 * Rules:
 * - NEVER bleed into: hook, proof, demo, offer, cta.
 * - NEVER bleed into scenes where primary attention is:
 *   HOOK_SPEAKER_FACE, EVIDENCE_DASHBOARD, PRODUCT_DEMO, OFFER_VALUE_STACK, CTA_ACTION_BADGE.
 * - NEVER bleed into scenes with Hook Focal Lock active.
 * - NEVER bleed into scenes that already have their own visual evidence or primary visual asset.
 * - NEVER bleed into scenes with full-screen overlay (broll overlay_style === 'full').
 * - Compatible with: problem, agitate, insight, solution, benefit, generic explanation.
 */
export function canCarryEvidenceHoldIntoScene(
  sourceScene: Partial<SceneEditPlan>,
  targetScene: Partial<SceneEditPlan>
): boolean {
  if (!targetScene) return false;

  const targetRole = String(targetScene.adRole || targetScene.role || '').toLowerCase();
  const blockedRoles = ['hook', 'proof', 'demo', 'offer', 'cta'];
  if (blockedRoles.includes(targetRole)) {
    return false;
  }

  const compProfile = targetScene.composition_profile as SceneCompositionProfile | undefined;
  const primaryAttn = compProfile?.primaryAttention;
  const blockedAttentions = [
    'HOOK_SPEAKER_FACE',
    'EVIDENCE_DASHBOARD',
    'PRODUCT_DEMO',
    'OFFER_VALUE_STACK',
    'CTA_ACTION_BADGE',
  ];
  if (primaryAttn && blockedAttentions.includes(primaryAttn)) {
    return false;
  }

  // Hook focal lock protection
  if (compProfile?.hookFocalLockActive) {
    return false;
  }

  // Target scene already has its own visual evidence
  if (
    targetScene.visual_evidence &&
    (targetScene.visual_evidence.userAssetUrl || targetScene.visual_evidence.title)
  ) {
    return false;
  }

  // Full-screen B-roll would collide with or obscure evidence card
  if (targetScene.broll?.overlay_style === 'full') {
    return false;
  }

  return true;
}

/**
 * Resolves the deterministic hold window for a scene's visual evidence (Step 9.5B.3).
 * Ensures proof and demo assets remain visible for minimumReadableDurationMs
 * when the timeline and scene compatibility allow, capped by MAX_EXTRA_HOLD_SEC (2.5s).
 *
 * Strict Rule: Audio timeline, speech narration, and scene boundaries remain completely untouched.
 */
export function getEvidenceHoldWindow(
  scene: Partial<SceneEditPlan>,
  allScenes?: SceneEditPlan[],
  sceneIndex?: number,
  totalDuration?: number
): EvidenceHoldWindow {
  const holdStartSec = scene.start || 0;
  const sourceSceneEndSec = scene.end !== undefined ? scene.end : holdStartSec;
  const sourceDurationSec = Math.max(0, sourceSceneEndSec - holdStartSec);

  // 1. Evidence Existence Check
  const hasVisualEvidence = Boolean(
    scene.visual_evidence &&
      (scene.visual_evidence.userAssetUrl || scene.visual_evidence.title)
  );

  if (!hasVisualEvidence) {
    return {
      holdRequired: false,
      holdStartSec,
      holdUntilSec: sourceSceneEndSec,
      minimumReadableDurationMs: 0,
      sourceSceneEndSec,
      canExtendWithinTimeline: false,
      reason: 'No visual evidence attached to scene',
    };
  }

  const plan = scene.editing_rhythm_plan;

  // 2. Explicit requiresVisualHold check
  if (plan && plan.requiresVisualHold === false) {
    return {
      holdRequired: false,
      holdStartSec,
      holdUntilSec: sourceSceneEndSec,
      minimumReadableDurationMs:
        plan.minimumReadableDurationMs || Math.round(sourceDurationSec * 1000),
      sourceSceneEndSec,
      canExtendWithinTimeline: false,
      reason: 'requiresVisualHold is false in editing rhythm plan',
    };
  }

  // 3. Minimum readable benchmark calculation
  const isProofOrDemo = scene.adRole === 'proof' || scene.adRole === 'demo';
  const minimumReadableDurationMs =
    plan?.minimumReadableDurationMs || (isProofOrDemo ? 2200 : 1800);
  const minimumHoldSec = minimumReadableDurationMs / 1000;

  const holdRequired =
    plan?.requiresVisualHold !== undefined
      ? Boolean(plan.requiresVisualHold)
      : sourceDurationSec < minimumHoldSec;

  if (!holdRequired) {
    return {
      holdRequired: false,
      holdStartSec,
      holdUntilSec: sourceSceneEndSec,
      minimumReadableDurationMs,
      sourceSceneEndSec,
      canExtendWithinTimeline: false,
      reason: 'Visual hold not required (duration meets readability benchmark)',
    };
  }

  // 4. If scene duration already >= minimumHoldSec, no extension needed
  if (sourceDurationSec >= minimumHoldSec) {
    return {
      holdRequired: true,
      holdStartSec,
      holdUntilSec: sourceSceneEndSec,
      minimumReadableDurationMs,
      sourceSceneEndSec,
      canExtendWithinTimeline: false,
      reason: 'Scene duration already covers minimum readable hold',
    };
  }

  // 5. Calculate hold extension with safety cap (MAX_EXTRA_HOLD_SEC)
  const desiredHoldUntilSec = holdStartSec + minimumHoldSec;
  const maxAllowedHoldUntilSec = sourceSceneEndSec + MAX_EXTRA_HOLD_SEC;
  let cappedHoldUntilSec = Math.min(desiredHoldUntilSec, maxAllowedHoldUntilSec);

  if (totalDuration !== undefined) {
    cappedHoldUntilSec = Math.min(cappedHoldUntilSec, totalDuration);
  }

  // 6. Check timeline boundaries & conflicting target scenes
  let interruptedByConflict = false;
  const resolvedIdx =
    sceneIndex !== undefined
      ? sceneIndex
      : allScenes?.findIndex((s) => s.id === scene.id);

  if (allScenes && resolvedIdx !== undefined && resolvedIdx >= 0) {
    for (let i = resolvedIdx + 1; i < allScenes.length; i++) {
      const targetScene = allScenes[i];
      if (targetScene.start >= cappedHoldUntilSec) {
        break;
      }
      if (!canCarryEvidenceHoldIntoScene(scene, targetScene)) {
        cappedHoldUntilSec = Math.min(cappedHoldUntilSec, targetScene.start);
        interruptedByConflict = true;
        break;
      }
      if (cappedHoldUntilSec <= targetScene.end) {
        break;
      }
    }
  }

  const canExtend = cappedHoldUntilSec > sourceSceneEndSec;
  const finalHoldUntil = canExtend ? cappedHoldUntilSec : sourceSceneEndSec;

  let reason = `Evidence hold active: target ${minimumReadableDurationMs}ms (${finalHoldUntil.toFixed(2)}s)`;
  if (desiredHoldUntilSec > maxAllowedHoldUntilSec) {
    reason += ` (capped by MAX_EXTRA_HOLD_SEC ${MAX_EXTRA_HOLD_SEC}s)`;
  } else if (interruptedByConflict) {
    reason += ` (interrupted by conflicting target scene)`;
  }

  return {
    holdRequired: true,
    holdStartSec,
    holdUntilSec: finalHoldUntil,
    minimumReadableDurationMs,
    sourceSceneEndSec,
    canExtendWithinTimeline: canExtend,
    reason,
  };
}

/**
 * Shared Multi-Renderer Evidence Resolver (PreviewPlayer & Canvas):
 * Identifies which scene's visual evidence should be displayed at currentTime.
 *
 * Checks:
 * 1. Current scene's own visual evidence (primary priority).
 * 2. Preceding scene's visual evidence if currently within an active, compatible hold window.
 */
export function resolveEvidenceSceneForTime(
  scenes: SceneEditPlan[],
  activeSceneIndex: number,
  currentTime: number
): EvidenceResolution {
  if (!scenes || scenes.length === 0) {
    return { scene: null, isCarriedOver: false, holdWindow: null };
  }

  const resolvedIdx =
    activeSceneIndex >= 0 && activeSceneIndex < scenes.length
      ? activeSceneIndex
      : scenes.findIndex((s) => currentTime >= s.start && currentTime < s.end);

  const currentScene = scenes[resolvedIdx] || scenes[0];
  if (!currentScene) {
    return { scene: null, isCarriedOver: false, holdWindow: null };
  }

  // 1. Current scene visual evidence takes top priority
  if (
    currentScene.visual_evidence &&
    (currentScene.visual_evidence.userAssetUrl || currentScene.visual_evidence.title)
  ) {
    const currentWindow = getEvidenceHoldWindow(currentScene, scenes, resolvedIdx);
    return {
      scene: currentScene,
      isCarriedOver: false,
      holdWindow: currentWindow,
    };
  }

  // 2. Look backward to immediately previous scene(s) for active evidence hold
  if (resolvedIdx > 0) {
    for (let prevIdx = resolvedIdx - 1; prevIdx >= Math.max(0, resolvedIdx - 2); prevIdx--) {
      const candidateScene = scenes[prevIdx];
      if (
        candidateScene?.visual_evidence &&
        (candidateScene.visual_evidence.userAssetUrl || candidateScene.visual_evidence.title)
      ) {
        const holdWindow = getEvidenceHoldWindow(candidateScene, scenes, prevIdx);
        if (
          holdWindow.holdRequired &&
          holdWindow.canExtendWithinTimeline &&
          currentTime >= holdWindow.sourceSceneEndSec &&
          currentTime < holdWindow.holdUntilSec &&
          canCarryEvidenceHoldIntoScene(candidateScene, currentScene)
        ) {
          return {
            scene: candidateScene,
            isCarriedOver: true,
            holdWindow,
          };
        }
        // If the immediate predecessor has evidence but cannot carry over, do not search further back
        break;
      }
    }
  }

  return { scene: null, isCarriedOver: false, holdWindow: null };
}
