/**
 * ALCO AUTO MOTION V5 — SCENE COMPOSITION & ATTENTION HIERARCHY ENGINE (Step 9.4B)
 *
 * Single source of truth for marketing attention hierarchy in Meta Ads / Vertical Video.
 *
 * Core Principle:
 * In any single video frame, not all elements can be focal points.
 * Every scene is assigned an explicit attention hierarchy:
 *   - Exactly 1 PRIMARY Attention Element (Dominant focus)
 *   - Exactly 1 SECONDARY Attention Element (Supporting visual/claim)
 *   - Exactly 1 SUPPORTING Text/Pacing Element (Subordinated caption or subtle background)
 *
 * Subordinates and suppresses competing elements to eliminate cognitive friction and maximize conversion.
 */

import {
  SceneEditPlan,
  UserProofAsset,
  ContentRole,
  AdRole,
} from '../types';

export type PrimaryAttentionElement =
  | 'TALENT_TALKING_HEAD'
  | 'HOOK_PATTERN_INTERRUPT'
  | 'PROBLEM_EMOTION'
  | 'PROBLEM_VISUAL'
  | 'PRODUCT_DEMO'
  | 'EVIDENCE_DASHBOARD'
  | 'EVIDENCE_SCREENSHOT'
  | 'EVIDENCE_METRIC'
  | 'EVIDENCE_CARD'
  | 'OFFER_VALUE_STACK'
  | 'CTA_ACTION_BADGE'
  | 'RELEVANT_BROLL'
  | 'DATA_CARD_FALLBACK';

export type SecondaryAttentionElement =
  | 'UPPER_HEADLINE'
  | 'PROBLEM_STATEMENT'
  | 'KEY_BENEFIT'
  | 'KEY_METRIC_CLAIM'
  | 'OFFER_REMINDER'
  | 'MAIN_BENEFIT_ANCHOR'
  | 'SOLUTION_HEADLINE'
  | 'NONE';

export type SupportingElement =
  | 'CAPTION_NORMAL'
  | 'CAPTION_COMPACT'
  | 'CAPTION_SUBDUED'
  | 'CAPTION_MINIMAL'
  | 'CAPTION_EMPHASIZED'
  | 'SUBTLE_MOTION'
  | 'BACKGROUND_AROUND_TALENT';

export type SuppressedElement =
  | 'DECORATIVE_MOTION_GRAPHICS'
  | 'GENERIC_BROLL'
  | 'COMPETING_HEADLINE'
  | 'EXCESSIVE_CAPTION_HIGHLIGHTS'
  | 'SECONDARY_CARDS_IN_HOOK_WINDOW'
  | 'DOUBLE_UPPER_TEXT'
  | 'UPPER_HEADLINE';

export type PriorityLevel = 'PRIMARY' | 'SECONDARY' | 'SUPPORT' | 'SUPPRESSED';

export type CaptionTreatment = 'NORMAL' | 'COMPACT' | 'SUBDUED' | 'EMPHASIZED' | 'MINIMAL';

export type HeadlineTreatment = 'SHOW' | 'DELAYED' | 'SUPPRESSED';

export interface SceneCompositionProfile {
  primaryAttention: PrimaryAttentionElement;
  secondaryAttention: SecondaryAttentionElement;
  supportingElements: SupportingElement[];
  suppressedElements: SuppressedElement[];

  captionPriority: PriorityLevel;
  headlinePriority: PriorityLevel;
  evidencePriority: PriorityLevel;
  brollPriority: PriorityLevel;
  talkingHeadPriority: PriorityLevel;

  maxVisualLayers: number;
  compositionDensity: 'MINIMAL' | 'BALANCED' | 'RICH';

  captionTreatment: CaptionTreatment;
  headlineTreatment: HeadlineTreatment;
  hookFocalLockActive: boolean;
  hookFocalLockDurationSec: number;

  reason: string;
}

export interface CompositionEvaluationOptions {
  availableUserAssets?: UserProofAsset[];
  index?: number;
  totalScenes?: number;
}

/**
 * Helper to test if a proof asset is genuine and available in the project or scene
 */
function hasValidProofAssetAvailable(
  scene: Partial<SceneEditPlan>,
  availableUserAssets?: UserProofAsset[]
): boolean {
  if (
    scene.visual_evidence?.type === 'SCREEN_PROOF' ||
    scene.visual_evidence?.type === 'SPLIT_COMPARE'
  ) {
    return true;
  }
  if (scene.asset_match?.asset?.type === 'dashboard' || scene.asset_match?.asset?.type === 'screenshot' || scene.asset_match?.asset?.type === 'before_after') {
    return true;
  }
  if (availableUserAssets && availableUserAssets.length > 0) {
    return availableUserAssets.some(
      (a) => a.type === 'dashboard' || a.type === 'screenshot' || a.type === 'before_after'
    );
  }
  return false;
}

/**
 * Helper to test if a demo/product asset is genuine and available in the project or scene
 */
function hasValidDemoAssetAvailable(
  scene: Partial<SceneEditPlan>,
  availableUserAssets?: UserProofAsset[]
): boolean {
  if (scene.visual_evidence?.type === 'SCREEN_DEMO') {
    return true;
  }
  if (scene.asset_match?.asset?.type === 'product' || scene.asset_match?.asset?.type === 'screen_recording') {
    return true;
  }
  if (availableUserAssets && availableUserAssets.length > 0) {
    return availableUserAssets.some(
      (a) => a.type === 'product' || a.type === 'screen_recording'
    );
  }
  return false;
}

/**
 * Enforces strict Global Attention Budget:
 * Maximum 1 Primary, 1 Secondary, 1 Supporting text/pacing element.
 */
export function applyAttentionBudget(profile: SceneCompositionProfile): SceneCompositionProfile {
  // Ensure maximum 1 primary and 1 secondary attention element
  const supporting = profile.supportingElements.slice(0, 2); // Max 2 supporting items (e.g. caption + subtle motion)
  const maxLayers = Math.min(profile.maxVisualLayers, 3);

  return {
    ...profile,
    supportingElements: supporting,
    maxVisualLayers: maxLayers,
  };
}

/**
 * Evaluates the Meta Ads Scene Attention Hierarchy for a single scene
 * based on role, actual available assets, visual intent, and cognitive clarity.
 */
export function evaluateSceneComposition(
  scene: Partial<SceneEditPlan>,
  options: CompositionEvaluationOptions = {}
): SceneCompositionProfile {
  const { availableUserAssets = [], index = 0, totalScenes = 1 } = options;

  const role: ContentRole = scene.role || 'explanation';
  const adRole: AdRole = scene.adRole || 'insight';
  const caption = (scene.caption || '').trim();
  const captionUpper = caption.toUpperCase();

  const isHook = index === 0 || role === 'hook' || adRole === 'hook';
  const isCta = (totalScenes > 1 && index >= totalScenes - 1) || role === 'cta' || adRole === 'cta';
  const isOffer = adRole === 'offer' || scene.visual_evidence?.type === 'OFFER_CARD';
  const isProof = role === 'proof' || adRole === 'proof' || scene.visual_evidence?.type === 'SCREEN_PROOF';
  const isProblemOrAgitate = role === 'problem' || adRole === 'problem' || adRole === 'agitate';
  const isSolutionOrDemo = role === 'solution' || adRole === 'solution' || adRole === 'demo';

  const hasTalkingHead = Boolean(
    scene.talking_head_framing?.is_talking_head &&
    scene.talking_head_framing.protection_status !== 'SAFE_FALLBACK'
  );
  const hasUpperHeadline = Boolean(scene.hookText || scene.headline);
  const hasBroll = Boolean(scene.broll?.sourceUrl);
  const hasDataCard = scene.brollFormat === 'data_card';

  const proofAssetAvailable = hasValidProofAssetAvailable(scene, availableUserAssets);
  const demoAssetAvailable = hasValidDemoAssetAvailable(scene, availableUserAssets);

  // 1. HOOK SCENE HIERARCHY
  if (isHook) {
    const isCloseUpFace =
      scene.talking_head_framing?.framing_mode === 'close_up_impact' ||
      (scene.talking_head_framing?.eyeline_y_percent !== undefined && scene.talking_head_framing.eyeline_y_percent < 28);

    const primary: PrimaryAttentionElement = isCloseUpFace
      ? 'TALENT_TALKING_HEAD'
      : 'HOOK_PATTERN_INTERRUPT';

    const secondary: SecondaryAttentionElement = hasUpperHeadline ? 'UPPER_HEADLINE' : 'NONE';

    return applyAttentionBudget({
      primaryAttention: primary,
      secondaryAttention: secondary,
      supportingElements: ['CAPTION_NORMAL', 'SUBTLE_MOTION'],
      suppressedElements: [
        'DECORATIVE_MOTION_GRAPHICS',
        'SECONDARY_CARDS_IN_HOOK_WINDOW',
        'GENERIC_BROLL',
      ],
      captionPriority: 'SUPPORT',
      headlinePriority: hasUpperHeadline ? 'SECONDARY' : 'SUPPRESSED',
      evidencePriority: 'SUPPRESSED',
      brollPriority: 'SUPPRESSED',
      talkingHeadPriority: primary === 'TALENT_TALKING_HEAD' ? 'PRIMARY' : 'SECONDARY',
      maxVisualLayers: 2,
      compositionDensity: 'BALANCED',
      captionTreatment: 'NORMAL',
      headlineTreatment: 'DELAYED',
      hookFocalLockActive: true,
      hookFocalLockDurationSec: 1.2,
      reason: 'Hook requires pattern interrupt dominance during the opening 1.2s scroll-stop window without competing clutter.',
    });
  }

  // 2. PROBLEM / AGITATE SCENE HIERARCHY
  if (isProblemOrAgitate) {
    const primary: PrimaryAttentionElement = (!scene.broll?.sourceUrl && !scene.visual_evidence) || hasTalkingHead
      ? 'TALENT_TALKING_HEAD'
      : 'PROBLEM_EMOTION';

    return applyAttentionBudget({
      primaryAttention: primary,
      secondaryAttention: 'PROBLEM_STATEMENT',
      supportingElements: ['CAPTION_NORMAL', 'SUBTLE_MOTION'],
      suppressedElements: [
        'DECORATIVE_MOTION_GRAPHICS',
        'GENERIC_BROLL',
        'DOUBLE_UPPER_TEXT',
      ],
      captionPriority: 'SECONDARY',
      headlinePriority: hasUpperHeadline ? 'SECONDARY' : 'SUPPRESSED',
      evidencePriority: 'SUPPRESSED',
      brollPriority: hasBroll ? 'SUPPORT' : 'SUPPRESSED',
      talkingHeadPriority: 'PRIMARY',
      maxVisualLayers: 2,
      compositionDensity: 'BALANCED',
      captionTreatment: 'NORMAL',
      headlineTreatment: hasUpperHeadline ? 'SHOW' : 'SUPPRESSED',
      hookFocalLockActive: false,
      hookFocalLockDurationSec: 0,
      reason: 'Problem and Agitation scenes prioritize emotional resonance and creator delivery over decorative visual overlays.',
    });
  }

  // 3. PROOF SCENE HIERARCHY
  if (isProof) {
    if (proofAssetAvailable) {
      const proofType: PrimaryAttentionElement =
        scene.visual_evidence?.type === 'SCREEN_PROOF'
          ? 'EVIDENCE_DASHBOARD'
          : scene.visual_evidence?.type === 'SPLIT_COMPARE'
          ? 'EVIDENCE_CARD'
          : 'EVIDENCE_SCREENSHOT';

      return applyAttentionBudget({
        primaryAttention: proofType,
        secondaryAttention: 'KEY_METRIC_CLAIM',
        supportingElements: ['CAPTION_SUBDUED'],
        suppressedElements: [
          'GENERIC_BROLL',
          'DECORATIVE_MOTION_GRAPHICS',
          'EXCESSIVE_CAPTION_HIGHLIGHTS',
          'COMPETING_HEADLINE',
        ],
        captionPriority: 'SUPPORT',
        headlinePriority: 'SUPPRESSED',
        evidencePriority: 'PRIMARY',
        brollPriority: 'SUPPRESSED',
        talkingHeadPriority: 'SUPPORT',
        maxVisualLayers: 2,
        compositionDensity: 'BALANCED',
        captionTreatment: 'SUBDUED',
        headlineTreatment: 'SUPPRESSED',
        hookFocalLockActive: false,
        hookFocalLockDurationSec: 0,
        reason: 'Proof scene with verified evidence: dashboard/metrics gain primary focal attention; captions are subdued to prevent eye fatigue.',
      });
    }

    // Fallback if no uploaded screenshot/asset
    const fallbackPrimary: PrimaryAttentionElement = hasDataCard || (!proofAssetAvailable && !hasTalkingHead)
      ? 'DATA_CARD_FALLBACK'
      : (hasTalkingHead ? 'TALENT_TALKING_HEAD' : 'EVIDENCE_METRIC');

    return applyAttentionBudget({
      primaryAttention: fallbackPrimary,
      secondaryAttention: 'KEY_METRIC_CLAIM',
      supportingElements: ['CAPTION_COMPACT'],
      suppressedElements: [
        'GENERIC_BROLL',
        'DECORATIVE_MOTION_GRAPHICS',
      ],
      captionPriority: 'SUPPORT',
      headlinePriority: hasUpperHeadline ? 'SECONDARY' : 'SUPPRESSED',
      evidencePriority: hasDataCard ? 'PRIMARY' : 'SUPPORT',
      brollPriority: 'SUPPRESSED',
      talkingHeadPriority: fallbackPrimary === 'TALENT_TALKING_HEAD' ? 'PRIMARY' : 'SUPPORT',
      maxVisualLayers: 2,
      compositionDensity: 'BALANCED',
      captionTreatment: 'COMPACT',
      headlineTreatment: hasUpperHeadline ? 'SHOW' : 'SUPPRESSED',
      hookFocalLockActive: false,
      hookFocalLockDurationSec: 0,
      reason: 'Proof scene fallback: structured metric data card or talent delivery serves as verified proof focal point.',
    });
  }

  // 4. SOLUTION / DEMO SCENE HIERARCHY
  if (isSolutionOrDemo) {
    if (demoAssetAvailable) {
      return applyAttentionBudget({
        primaryAttention: 'PRODUCT_DEMO',
        secondaryAttention: 'KEY_BENEFIT',
        supportingElements: ['CAPTION_COMPACT'],
        suppressedElements: [
          'DECORATIVE_MOTION_GRAPHICS',
          'GENERIC_BROLL',
        ],
        captionPriority: 'SUPPORT',
        headlinePriority: 'SUPPRESSED',
        evidencePriority: 'PRIMARY',
        brollPriority: 'SUPPRESSED',
        talkingHeadPriority: 'SUPPORT',
        maxVisualLayers: 2,
        compositionDensity: 'BALANCED',
        captionTreatment: 'COMPACT',
        headlineTreatment: 'SUPPRESSED',
        hookFocalLockActive: false,
        hookFocalLockDurationSec: 0,
        reason: 'Solution scene with valid demo asset: product demonstration receives primary focal priority with compact captions.',
      });
    }

    // Fallback if demo asset is not available
    const solutionPrimary: PrimaryAttentionElement = hasBroll
      ? 'RELEVANT_BROLL'
      : (hasTalkingHead ? 'TALENT_TALKING_HEAD' : 'TALENT_TALKING_HEAD');

    return applyAttentionBudget({
      primaryAttention: solutionPrimary,
      secondaryAttention: 'SOLUTION_HEADLINE',
      supportingElements: ['CAPTION_NORMAL'],
      suppressedElements: [
        'DECORATIVE_MOTION_GRAPHICS',
      ],
      captionPriority: 'SECONDARY',
      headlinePriority: hasUpperHeadline ? 'SECONDARY' : 'SUPPRESSED',
      evidencePriority: 'SUPPORT',
      brollPriority: hasBroll ? 'PRIMARY' : 'SUPPORT',
      talkingHeadPriority: solutionPrimary === 'TALENT_TALKING_HEAD' ? 'PRIMARY' : 'SUPPORT',
      maxVisualLayers: 2,
      compositionDensity: 'BALANCED',
      captionTreatment: 'NORMAL',
      headlineTreatment: hasUpperHeadline ? 'SHOW' : 'SUPPRESSED',
      hookFocalLockActive: false,
      hookFocalLockDurationSec: 0,
      reason: 'Solution scene fallback to authentic presenter delivery and solution caption.',
    });
  }

  // 5. OFFER SCENE HIERARCHY
  if (isOffer) {
    return applyAttentionBudget({
      primaryAttention: 'OFFER_VALUE_STACK',
      secondaryAttention: 'MAIN_BENEFIT_ANCHOR',
      supportingElements: ['CAPTION_MINIMAL'],
      suppressedElements: [
        'GENERIC_BROLL',
        'DECORATIVE_MOTION_GRAPHICS',
        'COMPETING_HEADLINE',
      ],
      captionPriority: 'SUPPORT',
      headlinePriority: 'SUPPRESSED',
      evidencePriority: 'PRIMARY',
      brollPriority: 'SUPPRESSED',
      talkingHeadPriority: 'SUPPORT',
      maxVisualLayers: 2,
      compositionDensity: 'BALANCED',
      captionTreatment: 'MINIMAL',
      headlineTreatment: 'SUPPRESSED',
      hookFocalLockActive: false,
      hookFocalLockDurationSec: 0,
      reason: 'Offer scene: price anchor and value proposition dominate visual attention.',
    });
  }

  // 6. CTA SCENE HIERARCHY
  if (isCta) {
    return applyAttentionBudget({
      primaryAttention: 'CTA_ACTION_BADGE',
      secondaryAttention: 'OFFER_REMINDER',
      supportingElements: ['CAPTION_MINIMAL'],
      suppressedElements: [
        'UPPER_HEADLINE',
        'DECORATIVE_MOTION_GRAPHICS',
        'GENERIC_BROLL',
        'DOUBLE_UPPER_TEXT',
      ],
      captionPriority: 'SUPPORT',
      headlinePriority: 'SUPPRESSED',
      evidencePriority: 'PRIMARY',
      brollPriority: 'SUPPRESSED',
      talkingHeadPriority: 'SUPPORT',
      maxVisualLayers: 2,
      compositionDensity: 'BALANCED',
      captionTreatment: 'MINIMAL',
      headlineTreatment: 'SUPPRESSED',
      hookFocalLockActive: false,
      hookFocalLockDurationSec: 0,
      reason: 'CTA conversion scene: single decisive action command with zero competing upper headlines or graphics.',
    });
  }

  // 7. DEFAULT / EXPLANATION / INSIGHT SCENE HIERARCHY
  const defaultPrimary: PrimaryAttentionElement = hasTalkingHead
    ? 'TALENT_TALKING_HEAD'
    : (hasBroll ? 'RELEVANT_BROLL' : 'TALENT_TALKING_HEAD');

  const defaultSecondary: SecondaryAttentionElement = hasUpperHeadline
    ? 'UPPER_HEADLINE'
    : 'NONE';

  return applyAttentionBudget({
    primaryAttention: defaultPrimary,
    secondaryAttention: defaultSecondary,
    supportingElements: ['CAPTION_NORMAL'],
    suppressedElements: ['DOUBLE_UPPER_TEXT'],
    captionPriority: 'SECONDARY',
    headlinePriority: hasUpperHeadline ? 'SECONDARY' : 'SUPPRESSED',
    evidencePriority: 'SUPPORT',
    brollPriority: hasBroll ? 'SECONDARY' : 'SUPPRESSED',
    talkingHeadPriority: defaultPrimary === 'TALENT_TALKING_HEAD' ? 'PRIMARY' : 'SUPPORT',
    maxVisualLayers: 2,
    compositionDensity: 'BALANCED',
    captionTreatment: 'NORMAL',
    headlineTreatment: hasUpperHeadline ? 'SHOW' : 'SUPPRESSED',
    hookFocalLockActive: false,
    hookFocalLockDurationSec: 0,
    reason: 'Standard contextual pacing with authentic presenter focus and clean captions.',
  });
}

/**
 * Evaluates composition profile for all scenes in a project
 */
export function evaluateProjectComposition(
  scenes: Partial<SceneEditPlan>[],
  availableUserAssets: UserProofAsset[] = []
): SceneCompositionProfile[] {
  return scenes.map((scene, idx) =>
    evaluateSceneComposition(scene, {
      availableUserAssets,
      index: idx,
      totalScenes: scenes.length,
    })
  );
}

/**
 * Helper to check whether Hook Focal Lock is currently active during playback
 * (e.g. within the first 1.2s of the opening scene)
 */
export function isHookFocalLockActive(
  currentTime: number,
  sceneStart: number,
  profile?: SceneCompositionProfile
): boolean {
  if (!profile || !profile.hookFocalLockActive) return false;
  const elapsed = currentTime - sceneStart;
  return elapsed >= 0 && elapsed < (profile.hookFocalLockDurationSec || 1.2);
}

/**
 * Checks if an element type is suppressed by the scene composition profile
 */
export function isElementSuppressed(
  element: SuppressedElement,
  profile?: SceneCompositionProfile
): boolean {
  if (!profile || !profile.suppressedElements) return false;
  return profile.suppressedElements.includes(element);
}

/**
 * Determines whether B-roll overlay should be rendered at the current timestamp
 */
export function shouldRenderBrollLayer(
  scene: Partial<SceneEditPlan> | any,
  currentTime?: number
): boolean {
  if (!scene || !scene.broll) return false;
  const profile = scene.composition_profile as SceneCompositionProfile | undefined;
  if (!profile) return true;

  // 1. Generic B-Roll suppression (suppresses stock/generic broll, preserves user proof assets)
  const isUserBroll = Boolean(scene.broll.isUserUploaded);
  if (!isUserBroll && isElementSuppressed('GENERIC_BROLL', profile)) {
    return false;
  }

  // 2. Hook Focal Lock suppression during opening 1.2s window
  if (
    typeof currentTime === 'number' &&
    profile.hookFocalLockActive &&
    isElementSuppressed('SECONDARY_CARDS_IN_HOOK_WINDOW', profile)
  ) {
    if (isHookFocalLockActive(currentTime, Number(scene.start) || 0, profile)) {
      return false;
    }
  }

  return true;
}

/**
 * Determines whether Visual Evidence overlay should be rendered at the current timestamp
 */
export function shouldRenderEvidenceLayer(
  scene: Partial<SceneEditPlan> | any,
  currentTime?: number
): boolean {
  if (!scene || !scene.visual_evidence) return false;
  const profile = scene.composition_profile as SceneCompositionProfile | undefined;
  if (!profile) return true;

  // Secondary cards suppressed during hook focal lock window
  if (
    typeof currentTime === 'number' &&
    profile.hookFocalLockActive &&
    isElementSuppressed('SECONDARY_CARDS_IN_HOOK_WINDOW', profile)
  ) {
    if (isHookFocalLockActive(currentTime, Number(scene.start) || 0, profile)) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves effective caption treatment ('NORMAL' | 'COMPACT' | 'SUBDUED' | 'EMPHASIZED' | 'MINIMAL')
 */
export function getEffectiveCaptionTreatment(
  scene: Partial<SceneEditPlan> | any
): CaptionTreatment {
  return scene?.composition_profile?.captionTreatment || 'NORMAL';
}

