/**
 * Step 9.6 — Creative Quality Gate & Final Editing Validation Engine
 *
 * Final validation and orchestration layer for ALCO Auto Motion.
 * Evaluates scene intelligence, asset matching, composition profile,
 * editing rhythm plan, and runtime directives prior to Preview and Export.
 *
 * Provides deterministic scoring, severity classification, and safe auto-fixes
 * strictly for low-risk visual/motion/rhythm conflicts without altering
 * speech timestamps, transcript text, or audio timing.
 */

import {
  SceneEditPlan,
  UserProofAsset,
  AlcoEditingProject,
  CreativeQualityIssue,
  CreativeQualityReport,
  CreativeQualitySeverity,
  CreativeQualityCategory,
  CreativeQualityStatus,
  CreativeQualityClassification,
  SceneVisualComplexityAnalysis,
  TransitionType,
} from '../types';
import {
  getEvidenceHoldWindow,
} from './editingRhythmRuntime';

// Re-export types for direct module consumption
export type {
  CreativeQualityIssue,
  CreativeQualityReport,
  CreativeQualitySeverity,
  CreativeQualityCategory,
  CreativeQualityStatus,
  CreativeQualityClassification,
  SceneVisualComplexityAnalysis,
};

export interface QualityGateOptions {
  autoFix?: boolean;
  userAssets?: UserProofAsset[];
  project?: Partial<AlcoEditingProject>;
  totalDuration?: number;
}

// ============================================================================
// 1. VISUAL COMPLEXITY & ATTENTION TARGETS
// ============================================================================

/**
 * Calculates per-scene visual complexity score (0-100) and attention target count.
 * Thresholds:
 * - 0–40:   SAFE
 * - 41–65:  MODERATE
 * - 66–80:  HIGH
 * - 81–100: OVERLOADED
 *
 * Proof & Demo scenes have stricter thresholds (capped at 65 before being flagged).
 */
export function calculateSceneVisualComplexity(scene: SceneEditPlan): SceneVisualComplexityAnalysis {
  let score = 10; // Baseline
  const factors: string[] = [];

  // Headline factor
  if (scene.headline && scene.headline.trim().length > 0) {
    score += 15;
    factors.push('headline (+15)');
  }

  // Caption factor
  if (scene.caption && scene.caption.trim().length > 0) {
    score += 10;
    factors.push('caption (+10)');
  }

  // Highlight words factor (up to +15)
  if (scene.highlight_words && scene.highlight_words.length > 0) {
    const highlightScore = Math.min(15, scene.highlight_words.length * 5);
    score += highlightScore;
    factors.push(`highlights (${scene.highlight_words.length} words, +${highlightScore})`);
  }

  // Visual evidence factor
  if (scene.visual_evidence) {
    score += 25;
    factors.push('visual_evidence (+25)');
  }

  // B-roll factor
  if (scene.broll) {
    const brollScore = scene.broll.overlay_style === 'full' ? 20 : 12;
    score += brollScore;
    factors.push(`broll (${scene.broll.overlay_style || 'standard'}, +${brollScore})`);
  }

  // Active SFX or Effects factor
  const hasSfx = Boolean(scene.sound_effect || scene.sfxLayered || (scene.sfxLayers && scene.sfxLayers.length > 0));
  const hasEffects = Boolean(scene.effects_budget?.activeEffects && scene.effects_budget.activeEffects.length > 0);
  if (hasSfx || hasEffects) {
    score += 10;
    factors.push('sfx_or_effects (+10)');
  }

  // High Motion factor
  const motionScale = scene.motion_scale ?? 1.0;
  if (motionScale > 1.1 || scene.motion === 'punch_zoom') {
    score += 10;
    factors.push(`high_motion (${scene.motion || 'scale'}, +10)`);
  }

  // Internal Decorative Layer factor
  if (scene.composition_profile?.internalLayers && scene.composition_profile.internalLayers.length > 0) {
    score += 10;
    factors.push('internal_layer (+10)');
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let category: 'SAFE' | 'MODERATE' | 'HIGH' | 'OVERLOADED' = 'SAFE';
  if (score > 80) category = 'OVERLOADED';
  else if (score > 65) category = 'HIGH';
  else if (score > 40) category = 'MODERATE';

  // Estimate simultaneous competing attention targets
  let attentionTargetCount = 0;
  if (scene.talking_head_framing?.is_talking_head || scene.composition_profile?.primaryAttention === 'HOOK_SPEAKER_FACE') {
    attentionTargetCount += 1;
  }
  if (scene.headline && scene.headline.trim().length > 0 && scene.composition_profile?.headlineTreatment !== 'SUPPRESSED') {
    attentionTargetCount += 1;
  }
  if (scene.caption && scene.caption.trim().length > 0 && scene.composition_profile?.captionTreatment !== 'SUBDUED') {
    attentionTargetCount += 1;
  }
  if (scene.visual_evidence) {
    attentionTargetCount += 1;
  }
  if (scene.broll && scene.composition_profile?.brollLayer !== 'SUPPRESSED') {
    attentionTargetCount += 1;
  }
  if (scene.adRole === 'cta' || scene.role === 'cta' || scene.composition_profile?.primaryAttention === 'CTA_ACTION_BADGE') {
    attentionTargetCount += 1;
  }

  return {
    sceneId: scene.id,
    score,
    category,
    attentionTargetCount,
    factors,
  };
}

// ============================================================================
// 2. DETERMINISTIC QUALITY SCORE CALCULATION
// ============================================================================

/**
 * Calculates a deterministic 0-100 quality score based on detected issues:
 * - Base score: 100
 * - BLOCKING: -25
 * - ERROR:    -12
 * - WARNING:  -4
 * - INFO:      0
 *
 * Classification:
 * - 90–100: READY
 * - 75–89:  READY_WITH_WARNINGS
 * - 60–74:  NEEDS_REVIEW
 * - <60:    NOT_READY
 */
/**
 * Deterministic quality scoring based on final validated state.
 *
 * Penalty Rules:
 * - Unresolved:
 *   - BLOCKING: -25 (blocks preview/export)
 *   - ERROR:    -12
 *   - WARNING:  -4
 *   - INFO:      0
 * - Successfully Resolved Auto-Fix:
 *   - BLOCKING: -5 (retains residual note, no longer blocks)
 *   - ERROR:    -2 (retains small residual penalty for intervention)
 *   - WARNING:   0 (auto-fixed warning incurs no penalty on final score)
 *   - INFO:      0
 *
 * Scoring classification:
 * - 90–100: READY
 * - 75–89:  READY_WITH_WARNINGS
 * - 60–74:  NEEDS_REVIEW
 * - <60:    NOT_READY
 */
export function calculateQualityScore(issues: CreativeQualityIssue[]): {
  score: number;
  status: CreativeQualityStatus;
  classification: CreativeQualityClassification;
  blockingIssueCount: number;
  warningCount: number;
  autoFixCount: number;
  resolvedIssueCount: number;
  resolvedWarningCount: number;
} {
  let score = 100;
  let blockingIssueCount = 0;
  let warningCount = 0;
  let autoFixCount = 0;
  let resolvedIssueCount = 0;
  let resolvedWarningCount = 0;

  for (const issue of issues) {
    const isResolved = Boolean(issue.resolved || issue.autoFixApplied);

    if (issue.autoFixApplied) {
      autoFixCount++;
    }

    if (isResolved) {
      resolvedIssueCount++;
      if (issue.severity === 'WARNING') {
        resolvedWarningCount++;
      }

      // Penalty for successfully resolved auto-fixes
      switch (issue.severity) {
        case 'BLOCKING':
          score -= 5;
          break;
        case 'ERROR':
          score -= 2;
          break;
        case 'WARNING':
          score -= 0;
          break;
        case 'INFO':
          break;
      }
    } else {
      // Penalty for unresolved issues
      switch (issue.severity) {
        case 'BLOCKING':
          score -= 25;
          blockingIssueCount++;
          break;
        case 'ERROR':
          score -= 12;
          break;
        case 'WARNING':
          score -= 4;
          warningCount++;
          break;
        case 'INFO':
          break;
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: CreativeQualityStatus = 'PASS';
  let classification: CreativeQualityClassification = 'READY';

  if (blockingIssueCount > 0 || score < 60) {
    status = 'FAIL';
    classification = 'NOT_READY';
  } else if (score < 75) {
    status = 'PASS_WITH_WARNINGS';
    classification = 'NEEDS_REVIEW';
  } else if (warningCount > 0 || score < 90) {
    status = 'PASS_WITH_WARNINGS';
    classification = 'READY_WITH_WARNINGS';
  } else {
    status = 'PASS';
    classification = 'READY';
  }

  return {
    score,
    status,
    classification,
    blockingIssueCount,
    warningCount,
    autoFixCount,
    resolvedIssueCount,
    resolvedWarningCount,
  };
}

/**
 * Evaluates whether the workflow can safely proceed past Quality Gate to Preview/Export.
 * Returns false if blocking issues exist or status is FAIL.
 * Allows proceeding with WARNINGs or PASS_WITH_WARNINGS.
 */
export function canProceedAfterQualityGate(report?: CreativeQualityReport | null): boolean {
  if (!report) return true;
  if (report.status === 'FAIL') return false;
  if ((report.blockingIssueCount ?? 0) > 0) return false;
  return true;
}

// ============================================================================
// 3. VALIDATION MODULES
// ============================================================================

/**
 * Validates caption vs visual layout, dominance, and speech synchronization.
 */
function validateCaptionVsVisual(
  scene: SceneEditPlan,
  index: number,
  issues: CreativeQualityIssue[],
  autoFix: boolean,
  targetScene: SceneEditPlan
) {
  const adRole = scene.adRole || scene.role;
  const isProof = adRole === 'proof';
  const isCta = adRole === 'cta';
  const isHook = index === 0 || adRole === 'hook';

  // 1. Caption too dominant during Proof
  if (isProof && scene.visual_evidence) {
    const isDominantCaption =
      scene.caption_density_status === 'power_highlight' ||
      scene.composition_profile?.captionTreatment === 'HERO_HIGHLIGHT' ||
      scene.caption_adaptive_position === 'CENTER-LOW' ||
      (scene.caption_adaptive_position as string) === 'UPPER' ||
      (scene.caption_font_size_pt && scene.caption_font_size_pt > 28);

    if (isDominantCaption) {
      const issue: CreativeQualityIssue = {
        code: 'CAPTION_TOO_DOMINANT_IN_PROOF',
        severity: 'WARNING',
        category: 'CAPTION',
        message: `Scene #${scene.id} (Proof): Caption is overly dominant and competes with visual evidence card.`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };

      if (autoFix) {
        targetScene.caption_density_status = 'clean_minimal';
        targetScene.caption_adaptive_position = 'LOWER';
        if (targetScene.composition_profile) {
          targetScene.composition_profile.captionTreatment = 'SUBDUED';
        }
        if (targetScene.caption_font_size_pt && targetScene.caption_font_size_pt > 24) {
          targetScene.caption_font_size_pt = 22;
        }
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'Caption density reduced to clean_minimal, positioned LOWER, and treatment set to SUBDUED.';
      }
      issues.push(issue);
    }
  }

  // 2. Caption colliding with evidence dashboard
  if (scene.visual_evidence && scene.composition_profile?.primaryAttention === 'EVIDENCE_DASHBOARD') {
    const isColliding =
      scene.caption_adaptive_position === 'UPPER-LOW' ||
      scene.caption_adaptive_position === 'CENTER-LOW' ||
      (scene.caption && scene.caption.split(/\s+/).length > 12);

    if (isColliding) {
      const issue: CreativeQualityIssue = {
        code: 'CAPTION_COLLIDES_WITH_EVIDENCE',
        severity: 'WARNING',
        category: 'CAPTION',
        message: `Scene #${scene.id}: Caption layout risks colliding with active evidence dashboard.`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };
      if (autoFix) {
        targetScene.caption_adaptive_position = 'LOWER';
        if (targetScene.composition_profile) {
          targetScene.composition_profile.captionTreatment = 'SUBDUED';
        }
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'Caption repositioned to LOWER and subdued to prevent collision with evidence.';
      }
      issues.push(issue);
    }
  }

  // 3. Excessive highlighted words (> 3 words)
  if (scene.highlight_words && scene.highlight_words.length > 3) {
    const issue: CreativeQualityIssue = {
      code: 'EXCESSIVE_CAPTION_HIGHLIGHTS',
      severity: 'WARNING',
      category: 'CAPTION',
      message: `Scene #${scene.id}: Excessive highlighted words (${scene.highlight_words.length} words). Max recommended is 3.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix) {
      targetScene.highlight_words = scene.highlight_words.slice(0, 3);
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Trimmed highlighted words to 3 priority words.';
    }
    issues.push(issue);
  }

  // 4. Caption outside speech window
  if (
    typeof scene.speech_start === 'number' &&
    typeof scene.speech_end === 'number' &&
    scene.word_timings &&
    scene.word_timings.length > 0
  ) {
    const firstWordStart = scene.start + scene.word_timings[0].startOffset;
    const lastWordEnd = scene.start + scene.word_timings[scene.word_timings.length - 1].endOffset;

    if (firstWordStart < scene.speech_start - 0.6 || lastWordEnd > scene.speech_end + 0.6) {
      issues.push({
        code: 'CAPTION_OUTSIDE_SPEECH_WINDOW',
        severity: 'WARNING',
        category: 'CAPTION',
        message: `Scene #${scene.id}: Caption word timings extend outside verified speech boundaries (${firstWordStart.toFixed(2)}s - ${lastWordEnd.toFixed(2)}s vs speech ${scene.speech_start.toFixed(2)}s - ${scene.speech_end.toFixed(2)}s).`,
        sceneId: scene.id,
        autoFixAvailable: false, // Speech timing changes forbidden
      });
    }
  }

  // 5. Caption present during silence unexpectedly
  if (
    (scene.speech_duration === 0 || (scene.speech_start === 0 && scene.speech_end === 0)) &&
    (scene.end - scene.start) > 1.2 &&
    (!scene.caption || scene.caption.trim().length === 0) &&
    scene.highlight_words &&
    scene.highlight_words.length > 0
  ) {
    issues.push({
      code: 'CAPTION_DURING_SILENCE',
      severity: 'INFO',
      category: 'CAPTION',
      message: `Scene #${scene.id}: Highlight words declared without spoken audio in scene.`,
      sceneId: scene.id,
      autoFixAvailable: false,
    });
  }

  // 6. CTA caption obscuring CTA action
  if (isCta) {
    const isObscuring =
      scene.composition_profile?.captionTreatment === 'HERO_HIGHLIGHT' ||
      (scene.caption && scene.caption.split(/\s+/).length > 9) ||
      scene.caption_adaptive_position === 'CENTER-LOW';

    if (isObscuring) {
      const issue: CreativeQualityIssue = {
        code: 'CTA_CAPTION_OBSCURES_ACTION',
        severity: 'WARNING',
        category: 'CAPTION',
        message: `Scene #${scene.id} (CTA): Lengthy or dominant caption obscures the primary conversion CTA badge.`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };
      if (autoFix) {
        if (targetScene.composition_profile) {
          targetScene.composition_profile.captionTreatment = 'MINIMAL';
        }
        targetScene.caption_adaptive_position = 'LOWER';
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'CTA caption set to minimal treatment and positioned lower to protect conversion CTA.';
      }
      issues.push(issue);
    }
  }

  // 7. Hook headline competing with main focal subject
  if (isHook && scene.composition_profile?.hookFocalLockActive) {
    if (scene.headline && scene.headline.length > 45) {
      issues.push({
        code: 'HOOK_HEADLINE_COMPETING',
        severity: 'WARNING',
        category: 'CAPTION',
        message: `Scene #${scene.id} (Hook): Excessive headline length (${scene.headline.length} chars) competes with presenter focal lock.`,
        sceneId: scene.id,
        autoFixAvailable: false,
      });
    }
  }
}

/**
 * Validates evidence presence, readability benchmarks, and conflict bleed.
 */
function validateEvidenceReadability(
  scene: SceneEditPlan,
  index: number,
  allScenes: SceneEditPlan[],
  totalDuration: number,
  userAssets: UserProofAsset[],
  issues: CreativeQualityIssue[],
  autoFix: boolean,
  targetScene: SceneEditPlan
) {
  const adRole = scene.adRole || scene.role;
  const isProof = adRole === 'proof';

  // 1. Proof without visual evidence when user assets were available
  if (isProof && !scene.visual_evidence && userAssets && userAssets.length > 0) {
    issues.push({
      code: 'MISSING_EXPECTED_EVIDENCE',
      severity: 'WARNING',
      category: 'EVIDENCE',
      message: `Scene #${scene.id} (Proof): Scene lacks verified visual evidence despite available user proof assets.`,
      sceneId: scene.id,
      autoFixAvailable: false,
    });
  }

  // 2. Minimum readable duration respected
  if (scene.visual_evidence) {
    const sourceDurationSec = scene.end - scene.start;
    const minRequiredMs = scene.editing_rhythm_plan?.minimumReadableDurationMs || 2200;
    const minRequiredSec = minRequiredMs / 1000;

    if (sourceDurationSec < minRequiredSec && scene.editing_rhythm_plan?.requiresVisualHold === false) {
      const issue: CreativeQualityIssue = {
        code: 'EVIDENCE_READABILITY_VIOLATION',
        severity: 'WARNING',
        category: 'EVIDENCE',
        message: `Scene #${scene.id}: Visual evidence duration (${sourceDurationSec.toFixed(1)}s) is below readability benchmark (${minRequiredSec.toFixed(1)}s) without requiresVisualHold.`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };
      if (autoFix && targetScene.editing_rhythm_plan) {
        targetScene.editing_rhythm_plan.requiresVisualHold = true;
        targetScene.editing_rhythm_plan.refreshStrategy = 'EVIDENCE_HOLD';
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'Enabled requiresVisualHold and set refresh strategy to EVIDENCE_HOLD.';
      }
      issues.push(issue);
    }
  }

  // 3. CRITICAL: Proof with evidence must NOT be hidden by generic B-roll
  if (isProof && scene.visual_evidence && scene.broll) {
    const isGenericBroll =
      scene.broll.overlay_style === 'full' ||
      ['metaphor', 'contrast', 'process'].includes(scene.broll.visual_intent as string) ||
      (scene.broll as any).type === 'reaction';

    if (isGenericBroll) {
      const issue: CreativeQualityIssue = {
        code: 'PROOF_EVIDENCE_HIDDEN_BY_BROLL',
        severity: 'ERROR',
        category: 'EVIDENCE',
        message: `Scene #${scene.id} (Proof): Generic B-roll layer (${(scene.broll as any).type || scene.broll.visual_intent}) hides primary verified visual evidence.`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };
      if (autoFix) {
        targetScene.broll = null;
        if (targetScene.composition_profile) {
          targetScene.composition_profile.brollLayer = 'SUPPRESSED';
        }
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'Suppressed conflicting generic B-roll to guarantee evidence visibility.';
      }
      issues.push(issue);
    }
  }

  // 4. Evidence hold bleeding into conflicting scene
  if (scene.visual_evidence && index < allScenes.length - 1) {
    const holdWindow = getEvidenceHoldWindow(scene, allScenes, index, totalDuration);
    const nextScene = allScenes[index + 1];

    if (holdWindow.holdRequired && holdWindow.holdUntilSec > scene.end) {
      const isTargetConflict =
        nextScene.adRole === 'cta' ||
        nextScene.role === 'cta' ||
        nextScene.adRole === 'hook' ||
        (Boolean(nextScene.visual_evidence) && nextScene.visual_evidence?.userAssetUrl !== scene.visual_evidence?.userAssetUrl);

      // If hold definition bleeds past nextScene.start into a conflicting scene
      if (isTargetConflict && holdWindow.holdUntilSec > nextScene.start + 0.05) {
        const issue: CreativeQualityIssue = {
          code: 'EVIDENCE_HOLD_BLEEDS_INTO_CONFLICT',
          severity: 'ERROR',
          category: 'EVIDENCE',
          message: `Scene #${scene.id}: Visual evidence hold bleeds past boundary (${holdWindow.holdUntilSec.toFixed(1)}s) into conflicting scene #${nextScene.id} (${nextScene.adRole || nextScene.role}).`,
          sceneId: scene.id,
          autoFixAvailable: true,
        };
        if (autoFix && targetScene.editing_rhythm_plan) {
          // Cap hold window strictly to nextScene.start
          targetScene.editing_rhythm_plan.targetVisualIntervalMs = Math.round((scene.end - scene.start) * 1000);
          issue.autoFixApplied = true;
          issue.resolved = true;
          issue.resolution = 'Clamped evidence hold interval strictly to scene boundary before conflict.';
        }
        issues.push(issue);
      }
    }
  }
}

/**
 * Validates motion scale and dynamics against scene editorial role.
 */
function validateMotionVsRole(
  scene: SceneEditPlan,
  index: number,
  issues: CreativeQualityIssue[],
  autoFix: boolean,
  targetScene: SceneEditPlan
) {
  const adRole = scene.adRole || scene.role;
  const isProof = adRole === 'proof';
  const isCta = adRole === 'cta';
  const isDemo = adRole === 'demo';
  const isHook = index === 0 || adRole === 'hook';

  const motionScale = scene.motion_scale ?? 1.0;

  // 1. Proof + aggressive punch zoom or high motion scale
  if (isProof && (scene.motion === 'punch_zoom' || motionScale > 1.08)) {
    const issue: CreativeQualityIssue = {
      code: 'PROOF_AGGRESSIVE_MOTION',
      severity: 'WARNING',
      category: 'MOTION',
      message: `Scene #${scene.id} (Proof): Aggressive motion (${scene.motion || 'scale'} ${motionScale.toFixed(2)}x) impairs evidence readability.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix) {
      targetScene.motion = 'normal';
      targetScene.motion_scale = 1.02;
      if (targetScene.camera_dynamics) {
        targetScene.camera_dynamics.intensity = 'subtle';
      }
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Motion downgraded to normal and motion_scale capped at 1.02x.';
    }
    issues.push(issue);
  }

  // 2. CTA + aggressive motion
  if (isCta && motionScale > 1.08) {
    const issue: CreativeQualityIssue = {
      code: 'CTA_AGGRESSIVE_MOTION',
      severity: 'WARNING',
      category: 'MOTION',
      message: `Scene #${scene.id} (CTA): Aggressive camera movement distracts from conversion action badge.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix) {
      targetScene.motion = 'normal';
      targetScene.motion_scale = 1.0;
      if (targetScene.camera_dynamics) {
        targetScene.camera_dynamics.intensity = 'subtle';
      }
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Motion downgraded to normal and motion_scale set to 1.0x.';
    }
    issues.push(issue);
  }

  // 3. Demo + HIGH motion
  if (isDemo && scene.editing_rhythm_plan?.motionBudget === 'HIGH') {
    const issue: CreativeQualityIssue = {
      code: 'DEMO_HIGH_MOTION',
      severity: 'WARNING',
      category: 'MOTION',
      message: `Scene #${scene.id} (Demo): HIGH motion budget impairs UI screencast comprehension.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix && targetScene.editing_rhythm_plan) {
      targetScene.editing_rhythm_plan.motionBudget = 'LOW';
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Demo scene motion budget lowered from HIGH to LOW.';
    }
    issues.push(issue);
  }

  // 4. Dense speech + aggressive motion
  const words = (scene.caption || '').trim().split(/\s+/).filter(Boolean).length;
  const durationSec = Math.max(0.1, scene.end - scene.start);
  const wps = words / durationSec;
  const isDenseSpeech = wps > 3.8 || scene.editing_rhythm_plan?.speechDensityLevel === 'DENSE';

  if (isDenseSpeech && (scene.editing_rhythm_plan?.motionBudget === 'HIGH' || motionScale > 1.10)) {
    const issue: CreativeQualityIssue = {
      code: 'DENSE_SPEECH_AGGRESSIVE_MOTION',
      severity: 'WARNING',
      category: 'MOTION',
      message: `Scene #${scene.id}: Rapid speech (${wps.toFixed(1)} WPS) paired with high motion causes viewer cognitive fatigue.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix) {
      targetScene.motion_scale = Math.min(1.05, targetScene.motion_scale || 1.05);
      if (targetScene.editing_rhythm_plan) {
        targetScene.editing_rhythm_plan.motionBudget = 'MEDIUM';
      }
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Motion scale capped at 1.05x and motion budget reduced to MEDIUM for dense speech.';
    }
    issues.push(issue);
  }

  // 5. Hook with completely static frame
  if (isHook && scene.motion === 'normal' && (!motionScale || motionScale <= 1.001) && !scene.camera_dynamics?.focalPoint) {
    issues.push({
      code: 'HOOK_STATIC_FRAME',
      severity: 'INFO',
      category: 'MOTION',
      message: `Scene #${scene.id} (Hook): Completely static frame in opening 3 seconds may reduce initial scroll-stopping power.`,
      sceneId: scene.id,
      autoFixAvailable: false,
    });
  }
}

/**
 * Validates mid-scene refresh markers, Hook focal lock boundaries, and ordering.
 */
function validateMidSceneRefresh(
  scene: SceneEditPlan,
  index: number,
  issues: CreativeQualityIssue[],
  autoFix: boolean,
  targetScene: SceneEditPlan
) {
  const rhythmPlan = scene.editing_rhythm_plan;
  if (!rhythmPlan) return;

  const durationSec = scene.end - scene.start;
  const points = rhythmPlan.midSceneRefreshPointsSec || [];
  const adRole = scene.adRole || scene.role;
  const isCta = adRole === 'cta';
  const isProof = adRole === 'proof';
  const isHook = index === 0 || adRole === 'hook';

  // 1. CTA with mid-scene refresh
  if (isCta && (rhythmPlan.allowMidSceneRefresh || points.length > 0)) {
    const issue: CreativeQualityIssue = {
      code: 'CTA_UNNECESSARY_REFRESH',
      severity: 'WARNING',
      category: 'RHYTHM',
      message: `Scene #${scene.id} (CTA): Mid-scene refresh in CTA destabilizes conversion badge readability.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix && targetScene.editing_rhythm_plan) {
      targetScene.editing_rhythm_plan.allowMidSceneRefresh = false;
      targetScene.editing_rhythm_plan.midSceneRefreshPointsSec = [];
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Disabled mid-scene refresh and cleared refresh points for CTA.';
    }
    issues.push(issue);
  }

  // 2. Refresh points outside scene duration
  const invalidPoints = points.filter((p) => p <= 0 || p >= durationSec);
  if (invalidPoints.length > 0) {
    const issue: CreativeQualityIssue = {
      code: 'REFRESH_POINT_OUTSIDE_DURATION',
      severity: 'ERROR',
      category: 'RHYTHM',
      message: `Scene #${scene.id}: Mid-scene refresh point(s) [${invalidPoints.join(', ')}s] fall outside scene duration (${durationSec.toFixed(1)}s).`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix && targetScene.editing_rhythm_plan) {
      targetScene.editing_rhythm_plan.midSceneRefreshPointsSec = points.filter((p) => p > 0 && p < durationSec);
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Filtered out invalid refresh points outside scene duration.';
    }
    issues.push(issue);
  }

  // 3. Refresh during protected Hook focal lock (0 - 1.2s)
  if (isHook && scene.composition_profile?.hookFocalLockActive) {
    const lockDuration = scene.composition_profile.hookFocalLockDurationSec || 1.2;
    const lockViolations = points.filter((p) => p < lockDuration);

    if (lockViolations.length > 0) {
      const issue: CreativeQualityIssue = {
        code: 'REFRESH_DURING_HOOK_FOCAL_LOCK',
        severity: 'ERROR',
        category: 'RHYTHM',
        message: `Scene #${scene.id} (Hook): Mid-scene refresh point at ${lockViolations.join(', ')}s disrupts protected focal lock window (${lockDuration}s).`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };
      if (autoFix && targetScene.editing_rhythm_plan) {
        targetScene.editing_rhythm_plan.midSceneRefreshPointsSec = points.filter((p) => p >= lockDuration);
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'Removed refresh points during protected hook focal lock window.';
      }
      issues.push(issue);
    }
  }

  // 4. Refresh during Evidence Hold scenes
  if ((isProof || rhythmPlan.refreshStrategy === 'EVIDENCE_HOLD') && (rhythmPlan.allowMidSceneRefresh || points.length > 0)) {
    const issue: CreativeQualityIssue = {
      code: 'REFRESH_DURING_EVIDENCE_HOLD',
      severity: 'WARNING',
      category: 'RHYTHM',
      message: `Scene #${scene.id} (Evidence Hold): Mid-scene refresh enabled during protected evidence hold.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix && targetScene.editing_rhythm_plan) {
      targetScene.editing_rhythm_plan.allowMidSceneRefresh = false;
      targetScene.editing_rhythm_plan.midSceneRefreshPointsSec = [];
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Disabled mid-scene refresh during protected evidence hold.';
    }
    issues.push(issue);
  }

  // 5. Unordered or duplicate refresh points
  if (points.length > 1) {
    let isUnorderedOrDuplicate = false;
    for (let i = 1; i < points.length; i++) {
      if (points[i] <= points[i - 1] || points[i] - points[i - 1] < 0.4) {
        isUnorderedOrDuplicate = true;
        break;
      }
    }

    if (isUnorderedOrDuplicate) {
      const issue: CreativeQualityIssue = {
        code: 'REFRESH_POINTS_UNORDERED_OR_DUPLICATE',
        severity: 'WARNING',
        category: 'RHYTHM',
        message: `Scene #${scene.id}: Mid-scene refresh markers [${points.join(', ')}] are duplicate or clustered < 400ms apart.`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };
      if (autoFix && targetScene.editing_rhythm_plan) {
        const sorted = [...points].sort((a, b) => a - b);
        const deduplicated: number[] = [];
        for (const p of sorted) {
          if (deduplicated.length === 0 || p - deduplicated[deduplicated.length - 1] >= 0.4) {
            deduplicated.push(p);
          }
        }
        targetScene.editing_rhythm_plan.midSceneRefreshPointsSec = deduplicated;
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'Sorted and deduplicated refresh points with minimum 400ms interval.';
      }
      issues.push(issue);
    }
  }
}

/**
 * Validates transition choices and durations.
 */
function validateTransitions(
  scene: SceneEditPlan,
  index: number,
  allScenes: SceneEditPlan[],
  issues: CreativeQualityIssue[],
  autoFix: boolean,
  targetScene: SceneEditPlan
) {
  const adRole = scene.adRole || scene.role;
  const isProof = adRole === 'proof';
  const isCta = adRole === 'cta';

  const effectiveTransition: TransitionType =
    targetScene.editing_rhythm_plan?.preferredTransition || targetScene.transition || 'cut';

  // 1. Flash transition in Proof or CTA
  if ((isProof || isCta) && effectiveTransition === 'flash') {
    const issue: CreativeQualityIssue = {
      code: 'FLASH_TRANSITION_IN_PROOF_OR_CTA',
      severity: 'WARNING',
      category: 'TRANSITION',
      message: `Scene #${scene.id} (${adRole}): Flash transition disrupts ${adRole === 'proof' ? 'evidence readability' : 'final conversion stability'}.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix) {
      targetScene.transition = 'cut';
      if (targetScene.editing_rhythm_plan) {
        targetScene.editing_rhythm_plan.preferredTransition = 'cut';
        targetScene.editing_rhythm_plan.transitionDurationMs = 0;
      }
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Replaced flash transition with cut to preserve stability.';
    }
    issues.push(issue);
  }

  // 2. Excessive consecutive flash transitions
  if (index > 0) {
    const prevScene = allScenes[index - 1];
    const prevTransition = prevScene.editing_rhythm_plan?.preferredTransition || prevScene.transition || 'cut';
    if (effectiveTransition === 'flash' && prevTransition === 'flash') {
      const issue: CreativeQualityIssue = {
        code: 'EXCESSIVE_CONSECUTIVE_FLASH',
        severity: 'WARNING',
        category: 'TRANSITION',
        message: `Scene #${scene.id}: Consecutive flash transition after Scene #${prevScene.id} causes visual flicker.`,
        sceneId: scene.id,
        autoFixAvailable: true,
      };
      if (autoFix) {
        targetScene.transition = 'cut';
        if (targetScene.editing_rhythm_plan) {
          targetScene.editing_rhythm_plan.preferredTransition = 'cut';
        }
        issue.autoFixApplied = true;
        issue.resolved = true;
        issue.resolution = 'Replaced consecutive flash transition with cut.';
      }
      issues.push(issue);
    }
  }

  // 3. Invalid transition duration
  const transDuration = targetScene.editing_rhythm_plan?.transitionDurationMs ?? 150;
  const sceneDurMs = (scene.end - scene.start) * 1000;
  if (transDuration < 0 || transDuration > 800 || transDuration > sceneDurMs * 0.4) {
    const issue: CreativeQualityIssue = {
      code: 'INVALID_TRANSITION_DURATION',
      severity: 'WARNING',
      category: 'TRANSITION',
      message: `Scene #${scene.id}: Transition duration (${transDuration}ms) is invalid or exceeds 40% of scene duration.`,
      sceneId: scene.id,
      autoFixAvailable: true,
    };
    if (autoFix && targetScene.editing_rhythm_plan) {
      targetScene.editing_rhythm_plan.transitionDurationMs = Math.min(250, Math.max(0, Math.round(sceneDurMs * 0.2)));
      issue.autoFixApplied = true;
      issue.resolved = true;
      issue.resolution = 'Adjusted transition duration to safe proportion of scene duration.';
    }
    issues.push(issue);
  }
}

/**
 * Validates asset usage frequency, metadata validity, and presence.
 */
function validateAssetUsage(
  scenes: SceneEditPlan[],
  userAssets: UserProofAsset[],
  issues: CreativeQualityIssue[]
) {
  const assetCounts: Record<string, number> = {};

  for (const scene of scenes) {
    const assetUrl = scene.visual_evidence?.userAssetUrl;
    if (assetUrl) {
      assetCounts[assetUrl] = (assetCounts[assetUrl] || 0) + 1;

      // Check broken asset URL metadata
      if (
        !assetUrl.startsWith('http://') &&
        !assetUrl.startsWith('https://') &&
        !assetUrl.startsWith('blob:') &&
        !assetUrl.startsWith('data:') &&
        !assetUrl.startsWith('/')
      ) {
        issues.push({
          code: 'BROKEN_ASSET_METADATA',
          severity: 'WARNING',
          category: 'ASSET',
          message: `Scene #${scene.id}: Visual evidence references malformed asset URL format "${assetUrl.slice(0, 30)}...".`,
          sceneId: scene.id,
          autoFixAvailable: false,
        });
      }
    }

    // Missing user asset referenced by scene
    if (scene.visual_evidence && !scene.visual_evidence.userAssetUrl && !scene.visual_evidence.metricValue) {
      issues.push({
        code: 'MISSING_REFERENCED_USER_ASSET',
        severity: 'WARNING',
        category: 'ASSET',
        message: `Scene #${scene.id}: Evidence is declared but neither userAssetUrl nor metricValue is present.`,
        sceneId: scene.id,
        autoFixAvailable: false,
      });
    }
  }

  // Check repeated overuse (> 3 times across scenes)
  for (const [url, count] of Object.entries(assetCounts)) {
    if (count > 3) {
      issues.push({
        code: 'ASSET_REPEATED_OVERUSE',
        severity: 'WARNING',
        category: 'ASSET',
        message: `Asset "${url.slice(0, 40)}" is reused in ${count} scenes. Consider diversifying assets for visual fatigue control.`,
        autoFixAvailable: false,
      });
    }
  }
}

/**
 * Validates audio layering safety and SFX density.
 */
function validateAudioSafety(
  scene: SceneEditPlan,
  issues: CreativeQualityIssue[]
) {
  const adRole = scene.adRole || scene.role;
  const isProof = adRole === 'proof';

  // SFX density
  if (scene.sfxLayers && scene.sfxLayers.length > 2) {
    issues.push({
      code: 'SFX_DENSITY_EXCESSIVE',
      severity: 'WARNING',
      category: 'AUDIO',
      message: `Scene #${scene.id}: ${scene.sfxLayers.length} layered SFX cues. Maximum recommended is 2 to prevent muddiness.`,
      sceneId: scene.id,
      autoFixAvailable: false,
    });
  }

  // SFX conflicts with important Proof narration
  if (isProof && scene.sound_effect && ['whoosh', 'impact', 'explosion'].includes(scene.sound_effect as string)) {
    issues.push({
      code: 'SFX_CONFLICTS_WITH_PROOF',
      severity: 'WARNING',
      category: 'AUDIO',
      message: `Scene #${scene.id} (Proof): Aggressive sound effect "${scene.sound_effect}" distracts from credibility metric narration.`,
      sceneId: scene.id,
      autoFixAvailable: false,
    });
  }
}

/**
 * Validates timeline integrity (chronological ordering, positive durations, valid speech ranges).
 */
function validateTimelineIntegrity(
  scenes: SceneEditPlan[],
  issues: CreativeQualityIssue[]
) {
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Inverted scene boundaries or negative duration
    if (scene.start >= scene.end) {
      issues.push({
        code: 'TIMELINE_NEGATIVE_DURATION',
        severity: 'BLOCKING',
        category: 'RHYTHM',
        message: `Scene #${scene.id}: Inverted duration (start ${scene.start}s >= end ${scene.end}s). Technical corruption.`,
        sceneId: scene.id,
        autoFixAvailable: false,
      });
    }

    if (scene.start < 0 || scene.end < 0) {
      issues.push({
        code: 'TIMELINE_NEGATIVE_DURATION',
        severity: 'BLOCKING',
        category: 'RHYTHM',
        message: `Scene #${scene.id}: Negative timestamp (start ${scene.start}s, end ${scene.end}s).`,
        sceneId: scene.id,
        autoFixAvailable: false,
      });
    }

    // Disordered scene timeline
    if (i > 0) {
      const prevScene = scenes[i - 1];
      if (scene.start < prevScene.start) {
        issues.push({
          code: 'TIMELINE_DISORDERED_SCENE',
          severity: 'BLOCKING',
          category: 'RHYTHM',
          message: `Scene #${scene.id} starts (${scene.start}s) before preceding Scene #${prevScene.id} (${prevScene.start}s).`,
          sceneId: scene.id,
          autoFixAvailable: false,
        });
      }
    }

    // Speech timeline validity
    if (typeof scene.speech_start === 'number' && typeof scene.speech_end === 'number') {
      if (scene.speech_start > scene.speech_end) {
        issues.push({
          code: 'SPEECH_TIMELINE_INVALID',
          severity: 'BLOCKING',
          category: 'RHYTHM',
          message: `Scene #${scene.id}: speech_start (${scene.speech_start}s) is greater than speech_end (${scene.speech_end}s).`,
          sceneId: scene.id,
          autoFixAvailable: false,
        });
      } else if (
        scene.speech_start < scene.start - 0.5 ||
        scene.speech_end > scene.end + 0.5
      ) {
        issues.push({
          code: 'SPEECH_TIMELINE_INVALID',
          severity: 'WARNING',
          category: 'RHYTHM',
          message: `Scene #${scene.id}: speech boundary (${scene.speech_start}s - ${scene.speech_end}s) deviates significantly from scene duration (${scene.start}s - ${scene.end}s).`,
          sceneId: scene.id,
          autoFixAvailable: false,
        });
      }
    }
  }
}

/**
 * Validates metadata required for runtime renderer parity (Canvas, PreviewPlayer, MP4).
 */
function validateRendererParity(
  scene: SceneEditPlan,
  issues: CreativeQualityIssue[]
) {
  if (!scene.composition_profile) {
    issues.push({
      code: 'PARITY_MISSING_PROFILE',
      severity: 'WARNING',
      category: 'PARITY',
      message: `Scene #${scene.id}: Missing composition_profile. Multi-renderer parity requires composition profile.`,
      sceneId: scene.id,
      autoFixAvailable: false,
    });
  }

  if (!scene.editing_rhythm_plan) {
    issues.push({
      code: 'PARITY_MISSING_RHYTHM_PLAN',
      severity: 'WARNING',
      category: 'PARITY',
      message: `Scene #${scene.id}: Missing editing_rhythm_plan. Multi-renderer parity requires rhythm plan.`,
      sceneId: scene.id,
      autoFixAvailable: false,
    });
  }
}

// ============================================================================
// 4. MAIN QUALITY GATE ORCHESTRATOR
// ============================================================================

/**
 * Executes the complete Step 9.6 Creative Quality Gate evaluation.
 *
 * Runs all validation passes, applies safe auto-fixes strictly to low-risk
 * properties when requested (default: true), and produces a comprehensive,
 * deterministic CreativeQualityReport.
 */
export function runCreativeQualityGate(
  scenes: SceneEditPlan[],
  options: QualityGateOptions = {}
): {
  report: CreativeQualityReport;
  validatedScenes: SceneEditPlan[];
} {
  const {
    autoFix = true,
    userAssets = [],
    project,
    totalDuration = scenes.length > 0 ? scenes[scenes.length - 1].end : 0,
  } = options;

  // Deep clone scenes to guarantee non-destructive pure validation
  const validatedScenes: SceneEditPlan[] = JSON.parse(JSON.stringify(scenes));
  const issues: CreativeQualityIssue[] = [];
  const sceneComplexityList: SceneVisualComplexityAnalysis[] = [];

  // 1. Timeline Integrity (Project Level)
  validateTimelineIntegrity(scenes, issues);

  // 2. Asset Usage (Project Level)
  validateAssetUsage(scenes, userAssets, issues);

  // 3. Per-Scene Validations
  for (let i = 0; i < scenes.length; i++) {
    const originalScene = scenes[i];
    const targetScene = validatedScenes[i];

    // Complexity & Attention Analysis
    const complexity = calculateSceneVisualComplexity(originalScene);
    sceneComplexityList.push(complexity);

    // Attention Target Count Violations
    const adRole = originalScene.adRole || originalScene.role;
    const isHook = i === 0 || adRole === 'hook';
    const isProof = adRole === 'proof';
    const isCta = adRole === 'cta';

    if (isHook && complexity.attentionTargetCount > 2) {
      issues.push({
        code: 'ATTENTION_TARGETS_EXCEEDED',
        severity: 'WARNING',
        category: 'COMPOSITION',
        message: `Scene #${originalScene.id} (Hook): ${complexity.attentionTargetCount} concurrent attention targets exceed recommended maximum of 2.`,
        sceneId: originalScene.id,
        autoFixAvailable: false,
      });
    } else if (isProof && complexity.attentionTargetCount > 2) {
      issues.push({
        code: 'ATTENTION_TARGETS_EXCEEDED',
        severity: 'WARNING',
        category: 'COMPOSITION',
        message: `Scene #${originalScene.id} (Proof): ${complexity.attentionTargetCount} concurrent attention targets exceed recommended maximum of 2.`,
        sceneId: originalScene.id,
        autoFixAvailable: false,
      });
    } else if (isCta && complexity.attentionTargetCount > 1) {
      issues.push({
        code: 'ATTENTION_TARGETS_EXCEEDED',
        severity: 'WARNING',
        category: 'COMPOSITION',
        message: `Scene #${originalScene.id} (CTA): ${complexity.attentionTargetCount} concurrent attention targets compete with primary conversion badge.`,
        sceneId: originalScene.id,
        autoFixAvailable: false,
      });
    }

    // Visual Complexity Overload Flag
    if (isProof || adRole === 'demo') {
      if (complexity.score > 65) {
        issues.push({
          code: 'VISUAL_COMPLEXITY_OVERLOADED',
          severity: 'WARNING',
          category: 'COMPOSITION',
          message: `Scene #${originalScene.id} (${adRole}): High visual complexity score (${complexity.score}/100) risks obscuring critical evidence.`,
          sceneId: originalScene.id,
          autoFixAvailable: false,
        });
      }
    } else if (complexity.score > 80) {
      issues.push({
        code: 'VISUAL_COMPLEXITY_OVERLOADED',
        severity: 'WARNING',
        category: 'COMPOSITION',
        message: `Scene #${originalScene.id}: Overloaded visual complexity score (${complexity.score}/100).`,
        sceneId: originalScene.id,
        autoFixAvailable: false,
      });
    }

    // Caption vs Visual
    validateCaptionVsVisual(originalScene, i, issues, autoFix, targetScene);

    // Evidence Readability
    validateEvidenceReadability(originalScene, i, scenes, totalDuration, userAssets, issues, autoFix, targetScene);

    // Motion vs Role
    validateMotionVsRole(originalScene, i, issues, autoFix, targetScene);

    // Mid-Scene Refresh
    validateMidSceneRefresh(originalScene, i, issues, autoFix, targetScene);

    // Transitions
    validateTransitions(originalScene, i, scenes, issues, autoFix, targetScene);

    // Audio Safety
    validateAudioSafety(originalScene, issues);

    // Renderer Parity
    validateRendererParity(originalScene, issues);
  }

  // 4. Calculate Final Report Score & Classification
  const {
    score,
    status,
    classification,
    blockingIssueCount,
    warningCount,
    autoFixCount,
  } = calculateQualityScore(issues);

  const report: CreativeQualityReport = {
    status,
    score,
    classification,
    issues,
    blockingIssueCount,
    warningCount,
    autoFixCount,
    sceneComplexity: sceneComplexityList,
  };

  return {
    report,
    validatedScenes,
  };
}
