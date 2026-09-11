/**
 * ALCO Auto Motion V5 — Production Render Certification & Renderer Parity Layer
 * Step 9.7: Final Multi-Renderer Certification Engine
 *
 * Certifies that all editorial and intelligence decisions from:
 * - Caption Intelligence
 * - Asset Intelligence
 * - Scene Composition & Attention Hierarchy
 * - Editing Rhythm Plan
 * - Visual Evidence Hold
 * - Creative Quality Gate
 *
 * are accurately, consistently, and deterministically executed across:
 * 1. PreviewPlayer (DOM / CSS / React runtime)
 * 2. Canvas / WebM renderer (renderFrame.ts)
 * 3. Server MP4 renderer (mp4Renderer.ts / FFmpeg filter graph)
 *
 * Strict Principles:
 * - Validates behavioral and architectural contracts (no pixel diffing).
 * - Non-destructive: Does not mutate scenes, audio timestamps, or transcript boundaries.
 * - Deterministic: Pure validation logic producing 100% reproducible reports.
 */

import {
  AlcoEditingProject,
  SceneEditPlan,
  RenderCertificationIssue,
  RenderCertificationReport,
  RenderCertificationSeverity,
  RenderCertificationCategory,
  RenderCertificationRenderer,
  RenderCertificationStatus,
  RenderCertificationClassification,
  Mp4RuntimeVerification,
  ExpectedRenderState,
  RendererCapabilityMatrix,
} from '../types';
import {
  getRuntimeRhythmDirective,
  getRhythmAdjustedTransition,
  getRefreshStage,
  resolveEvidenceSceneForTime,
  getEvidenceHoldWindow,
} from './editingRhythmRuntime';
import {
  SceneCompositionProfile,
  getEffectiveCaptionTreatment,
  shouldRenderBrollLayer,
  shouldRenderEvidenceLayer,
} from './sceneCompositionEngine';

export type { Mp4RuntimeVerification };

export interface RendererCapabilityOverrides {
  previewSupported?: Partial<Record<keyof RendererCapabilityMatrix, boolean>>;
  canvasSupported?: Partial<Record<keyof RendererCapabilityMatrix, boolean>>;
  mp4Supported?: Partial<Record<keyof RendererCapabilityMatrix, boolean>>;
  ffmpegAvailable?: boolean;
  isNativeFfmpegPlaceholder?: boolean;
  strictParityMode?: boolean;
}

export interface RenderCertificationOptions {
  rendererOverrides?: RendererCapabilityOverrides;
  strictParityMode?: boolean;
  targetDuration?: number;
  mp4RuntimeVerification?: Mp4RuntimeVerification;
  generatedAt?: string;
}

/**
 * Standard Multi-Renderer Capability Baseline Matrix.
 * All three renderers (Preview, Canvas, MP4) natively implement the Step 9.4 - 9.6 directives.
 */
export const DEFAULT_RENDERER_CAPABILITY_MATRIX: RendererCapabilityMatrix = {
  hookFocalLock: { preview: true, canvas: true, mp4: true },
  motionBudget: { preview: true, canvas: true, mp4: true },
  midSceneRefresh: { preview: true, canvas: true, mp4: true },
  evidenceHold: { preview: true, canvas: true, mp4: true },
  proofStability: { preview: true, canvas: true, mp4: true },
  ctaStability: { preview: true, canvas: true, mp4: true },
  captionTreatment: { preview: true, canvas: true, mp4: true },
  transition: { preview: true, canvas: true, mp4: true },
  brollSuppression: { preview: true, canvas: true, mp4: true },
};

/**
 * Builds the normalized expected runtime render state for a scene at a given timestamp.
 * Reuses central runtime helpers for single-source-of-truth consistency.
 */
export function getExpectedRenderState(
  scene: Partial<SceneEditPlan>,
  currentTime: number,
  allScenes?: SceneEditPlan[]
): ExpectedRenderState {
  const sceneId = scene.id ?? 0;
  const start = scene.start || 0;
  const sceneRelativeTime = Math.max(0, currentTime - start);
  const compProfile = scene.composition_profile as SceneCompositionProfile | undefined;
  const scenesList = allScenes && allScenes.length > 0 ? allScenes : (scene.id !== undefined ? [scene as SceneEditPlan] : []);

  // 1. Attention & Composition
  const primaryAttention = compProfile?.primaryAttention || (
    scene.adRole === 'hook' ? 'TALENT_TALKING_HEAD' :
    scene.adRole === 'proof' ? 'EVIDENCE_DASHBOARD' :
    scene.adRole === 'demo' ? 'PRODUCT_DEMO' :
    scene.adRole === 'cta' ? 'CTA_ACTION_BADGE' :
    'TALENT_TALKING_HEAD'
  );

  // 2. Runtime Rhythm Directive
  const rhythmDirective = getRuntimeRhythmDirective(scene, sceneRelativeTime);
  const motionLevel = scene.motion || 'static_lock';
  const aggressiveMotionAllowed = (scene.adRole !== 'proof' && scene.adRole !== 'cta') && (scene.motion_scale || 1.0) <= 1.15;

  // 3. Effective Transition
  const effectiveTransition = getRhythmAdjustedTransition(scene);

  // 4. Caption Treatment
  const captionTreatment = compProfile?.captionTreatment
    || getEffectiveCaptionTreatment(scene)
    || (scene.adRole === 'proof' ? 'SUBDUED' : scene.adRole === 'cta' ? 'MINIMAL' : 'NORMAL');

  // 5. Evidence Visibility & Source
  const activeIdx = scenesList.findIndex((s) => s.id === scene.id);
  const evidenceRes = resolveEvidenceSceneForTime(scenesList, activeIdx >= 0 ? activeIdx : 0, currentTime);
  const evidenceVisible = evidenceRes.scene !== null && (evidenceRes.scene.visual_evidence?.userAssetUrl || evidenceRes.scene.visual_evidence?.title) !== undefined;
  const evidenceSourceSceneId = evidenceRes.scene?.id ?? null;

  // 6. B-Roll Permission
  const brollAllowed = shouldRenderBrollLayer(scene, currentTime);

  // 7. Refresh Stage
  const refreshStage = getRefreshStage(scene, currentTime, sceneRelativeTime);

  return {
    sceneId,
    primaryAttention,
    motionLevel,
    effectiveTransition: effectiveTransition.transition,
    captionTreatment,
    evidenceVisible,
    evidenceSourceSceneId,
    brollAllowed,
    aggressiveMotionAllowed,
    refreshStage,
  };
}

/**
 * Validates metadata completeness and renderer behavioral contracts across all scenes.
 */
export function validateRendererContracts(
  scenes: SceneEditPlan[],
  options?: RenderCertificationOptions
): RenderCertificationIssue[] {
  const issues: RenderCertificationIssue[] = [];
  const overrides = options?.rendererOverrides;

  scenes.forEach((scene, index) => {
    const sceneLabel = `Scene ${index + 1} (${scene.adRole || scene.role || 'scene'})`;

    // 1. Composition Profile Check
    if (!scene.composition_profile) {
      issues.push({
        code: 'MISSING_COMPOSITION_PROFILE',
        severity: 'WARNING',
        renderer: 'ALL',
        category: 'PARITY',
        sceneId: scene.id,
        message: `${sceneLabel}: Missing composition_profile. Renderers may fall back to default unmanaged layering.`,
      });
    }

    // 2. Editing Rhythm Plan Check
    if (!scene.editing_rhythm_plan) {
      issues.push({
        code: 'MISSING_EDITING_RHYTHM_PLAN',
        severity: 'WARNING',
        renderer: 'ALL',
        category: 'PARITY',
        sceneId: scene.id,
        message: `${sceneLabel}: Missing editing_rhythm_plan. Renderers will use fallback rhythm defaults.`,
      });
    }

    // 3. Proof Scene Stability Contract
    if (scene.adRole === 'proof' || scene.role === 'proof') {
      const motionStr = String(scene.motion || '');
      const isAggressiveMotion =
        motionStr === 'punch_zoom' ||
        motionStr === 'whip_pan' ||
        motionStr === 'flash_cut' ||
        Boolean(scene.motion_scale && scene.motion_scale > 1.10);

      if (isAggressiveMotion) {
        issues.push({
          code: 'PROOF_UNSUPPORTED_AGGRESSIVE_MOTION',
          severity: 'ERROR',
          renderer: 'ALL',
          category: 'MOTION',
          sceneId: scene.id,
          message: `${sceneLabel}: Proof scene contains aggressive motion (${scene.motion} @ ${scene.motion_scale || 1.0}x). Violates proof stability contract across all renderers.`,
        });
      }

      const transStr = String(scene.transition || '');
      if (transStr === 'flash' || transStr === 'whip_right' || transStr === 'whip_left' || transStr === 'whip_pan') {
        issues.push({
          code: 'PROOF_DISRUPTIVE_TRANSITION',
          severity: 'WARNING',
          renderer: 'ALL',
          category: 'TRANSITION',
          sceneId: scene.id,
          message: `${sceneLabel}: Flash/whip transition on proof scene risks disrupting metric readability.`,
        });
      }
    }

    // 4. CTA Scene Stability Contract
    if (scene.adRole === 'cta' || scene.role === 'cta') {
      const motionStr = String(scene.motion || '');
      const isAggressiveMotion =
        motionStr === 'punch_zoom' ||
        motionStr === 'whip_pan' ||
        Boolean(scene.motion_scale && scene.motion_scale > 1.10);

      if (isAggressiveMotion) {
        issues.push({
          code: 'CTA_UNSUPPORTED_AGGRESSIVE_MOTION',
          severity: 'ERROR',
          renderer: 'ALL',
          category: 'MOTION',
          sceneId: scene.id,
          message: `${sceneLabel}: CTA scene contains aggressive motion (${scene.motion}). Violates CTA stability contract.`,
        });
      }
    }

    // 5. Evidence Hold Support & Carry-Over Contract
    const hasEvidence = Boolean(
      scene.visual_evidence &&
      (scene.visual_evidence.userAssetUrl || scene.visual_evidence.title)
    );

    if (hasEvidence) {
      const holdWindow = getEvidenceHoldWindow(scene, scenes, index);
      if (holdWindow.holdRequired) {
        // Check if MP4 or Canvas or Preview evidence hold support is disabled via overrides
        if (overrides?.mp4Supported?.evidenceHold === false) {
          issues.push({
            code: 'MP4_EVIDENCE_HOLD_UNSUPPORTED',
            severity: 'ERROR',
            renderer: 'MP4',
            category: 'EVIDENCE',
            sceneId: scene.id,
            message: `${sceneLabel}: Evidence visual hold required (${holdWindow.minimumReadableDurationMs}ms), but MP4 renderer lacks evidence hold capability.`,
          });
        }
        if (overrides?.canvasSupported?.evidenceHold === false) {
          issues.push({
            code: 'CANVAS_EVIDENCE_HOLD_UNSUPPORTED',
            severity: 'ERROR',
            renderer: 'CANVAS',
            category: 'EVIDENCE',
            sceneId: scene.id,
            message: `${sceneLabel}: Evidence visual hold required, but Canvas renderer lacks evidence hold capability.`,
          });
        }
        if (overrides?.previewSupported?.evidenceHold === false) {
          issues.push({
            code: 'PREVIEW_EVIDENCE_HOLD_UNSUPPORTED',
            severity: 'ERROR',
            renderer: 'PREVIEW',
            category: 'EVIDENCE',
            sceneId: scene.id,
            message: `${sceneLabel}: Evidence visual hold required, but Preview renderer lacks evidence hold capability.`,
          });
        }
      }
    }

    // 6. Caption Timings & Integrity
    if (scene.word_timings && Array.isArray(scene.word_timings) && scene.word_timings.length > 0) {
      const sceneDur = Math.max(0, (scene.end || 0) - (scene.start || 0));
      for (const wt of scene.word_timings) {
        if (wt.startOffset < 0 || wt.endOffset < wt.startOffset || (sceneDur > 0 && wt.startOffset > sceneDur + 0.5)) {
          issues.push({
            code: 'CAPTION_TIMING_INVALID',
            severity: 'ERROR',
            renderer: 'ALL',
            category: 'CAPTION',
            sceneId: scene.id,
            message: `${sceneLabel}: Invalid word timing offset for word "${wt.word}" [${wt.startOffset}s - ${wt.endOffset}s] exceeding scene duration ${sceneDur.toFixed(2)}s.`,
          });
          break;
        }
      }
    }
  });

  // 7. Check Renderer Global Capability Overrides
  if (overrides) {
    const keys: Array<keyof RendererCapabilityMatrix> = [
      'hookFocalLock',
      'motionBudget',
      'midSceneRefresh',
      'evidenceHold',
      'proofStability',
      'ctaStability',
      'captionTreatment',
      'transition',
      'brollSuppression',
    ];

    for (const key of keys) {
      if (overrides.previewSupported && overrides.previewSupported[key] === false) {
        issues.push({
          code: `PREVIEW_CAPABILITY_MISSING_${key.toUpperCase()}`,
          severity: 'ERROR',
          renderer: 'PREVIEW',
          category: 'PARITY',
          message: `PreviewPlayer lacks support for capability: ${key}`,
        });
      }
      if (overrides.canvasSupported && overrides.canvasSupported[key] === false) {
        issues.push({
          code: `CANVAS_CAPABILITY_MISSING_${key.toUpperCase()}`,
          severity: 'ERROR',
          renderer: 'CANVAS',
          category: 'PARITY',
          message: `Canvas renderer lacks support for capability: ${key}`,
        });
      }
      if (overrides.mp4Supported && overrides.mp4Supported[key] === false) {
        issues.push({
          code: `MP4_CAPABILITY_MISSING_${key.toUpperCase()}`,
          severity: 'ERROR',
          renderer: 'MP4',
          category: 'PARITY',
          message: `MP4 server renderer lacks support for capability: ${key}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Validates timeline integrity and boundary consistency post-Quality Gate.
 */
export function validateTimelineCertification(
  scenes: SceneEditPlan[],
  totalDuration?: number
): RenderCertificationIssue[] {
  const issues: RenderCertificationIssue[] = [];

  if (!scenes || scenes.length === 0) {
    issues.push({
      code: 'TIMELINE_EMPTY_SCENES',
      severity: 'BLOCKING',
      renderer: 'ALL',
      category: 'TIMELINE',
      message: 'Project contains no scenes to certify.',
    });
    return issues;
  }

  for (let i = 0; i < scenes.length; i++) {
    const curr = scenes[i];
    const prev = i > 0 ? scenes[i - 1] : null;
    const dur = (curr.end || 0) - (curr.start || 0);

    // 1. Negative or zero duration check
    if (dur <= 0 || curr.end <= curr.start) {
      issues.push({
        code: 'TIMELINE_NEGATIVE_DURATION',
        severity: 'BLOCKING',
        renderer: 'ALL',
        category: 'TIMELINE',
        sceneId: curr.id,
        message: `Scene ${i + 1} has invalid non-positive duration (${curr.start}s - ${curr.end}s).`,
      });
    }

    // 2. Scene ordering check
    if (prev && curr.start < prev.start) {
      issues.push({
        code: 'TIMELINE_DISORDERED_SCENES',
        severity: 'BLOCKING',
        renderer: 'ALL',
        category: 'TIMELINE',
        sceneId: curr.id,
        message: `Scene ${i + 1} start (${curr.start}s) is earlier than Scene ${i} start (${prev.start}s).`,
      });
    }

    // 3. Overlapping corruption check (> 50ms overlap)
    if (prev && curr.start < prev.end - 0.05) {
      issues.push({
        code: 'TIMELINE_OVERLAPPING_SCENES',
        severity: 'ERROR',
        renderer: 'ALL',
        category: 'TIMELINE',
        sceneId: curr.id,
        message: `Scene ${i + 1} overlaps preceding Scene ${i} by ${((prev.end - curr.start) * 1000).toFixed(0)}ms.`,
      });
    }

    // 4. Refresh points within bounds
    const plan = curr.editing_rhythm_plan;
    if (plan?.midSceneRefreshPointsSec && Array.isArray(plan.midSceneRefreshPointsSec)) {
      for (const pt of plan.midSceneRefreshPointsSec) {
        if (pt <= 0 || pt >= dur) {
          issues.push({
            code: 'REFRESH_POINT_OUTSIDE_BOUNDS',
            severity: 'WARNING',
            renderer: 'ALL',
            category: 'RHYTHM' as any,
            sceneId: curr.id,
            message: `Scene ${i + 1}: Refresh point ${pt}s is outside scene duration (${dur.toFixed(2)}s).`,
          });
        }
      }
    }
  }

  // 5. Total duration consistency check
  if (totalDuration !== undefined && totalDuration > 0 && scenes.length > 0) {
    const lastSceneEnd = scenes[scenes.length - 1].end;
    if (Math.abs(lastSceneEnd - totalDuration) > 1.5) {
      issues.push({
        code: 'TIMELINE_TOTAL_DURATION_MISMATCH',
        severity: 'WARNING',
        renderer: 'ALL',
        category: 'TIMELINE',
        message: `Total project duration (${totalDuration.toFixed(1)}s) does not match final scene end (${lastSceneEnd.toFixed(1)}s).`,
      });
    }
  }

  return issues;
}

/**
 * Validates audio integrity and preserves narration timeline.
 */
export function validateAudioCertification(
  project: Partial<AlcoEditingProject>
): RenderCertificationIssue[] {
  const issues: RenderCertificationIssue[] = [];
  const auditMetrics = project.output_audit?.metrics;

  // 1. Narration timestamps check: verify that scenes preserve speech alignment
  if (project.scenes && project.scenes.length > 0) {
    project.scenes.forEach((s, idx) => {
      if (s.speech_start !== undefined && s.speech_end !== undefined) {
        if (s.speech_start > s.speech_end) {
          issues.push({
            code: 'AUDIO_SPEECH_TIMESTAMPS_INVERTED',
            severity: 'ERROR',
            renderer: 'ALL',
            category: 'AUDIO',
            sceneId: s.id,
            message: `Scene ${idx + 1}: Speech start (${s.speech_start}s) is greater than speech end (${s.speech_end}s).`,
          });
        }
      }
    });
  }

  // 2. Output diagnostics audio integrity (when available)
  if (auditMetrics) {
    if (auditMetrics.sourceAudioStatus === 'detected' && auditMetrics.outputAudioStatus === 'missing') {
      issues.push({
        code: 'AUDIO_OUTPUT_MISSING',
        severity: 'ERROR',
        renderer: 'MP4',
        category: 'AUDIO',
        message: 'Source audio was detected but output render audio is missing or silent.',
      });
    }
    if (auditMetrics.outputAudioIsSilent === true) {
      issues.push({
        code: 'AUDIO_OUTPUT_SILENT',
        severity: 'ERROR',
        renderer: 'ALL',
        category: 'AUDIO',
        message: 'Output video audio track is completely silent.',
      });
    }
  }

  return issues;
}

/**
 * Validates output quality audit results when available.
 */
export function validateOutputQualityCertification(
  project: Partial<AlcoEditingProject>
): RenderCertificationIssue[] {
  const issues: RenderCertificationIssue[] = [];
  const audit = project.output_audit;

  if (audit) {
    if (audit.isPlaybackCorrupt || (audit.status as string) === 'PLAYBACK_CORRUPT') {
      issues.push({
        code: 'OUTPUT_PLAYBACK_CORRUPT',
        severity: 'BLOCKING',
        renderer: 'ALL',
        category: 'OUTPUT',
        message: 'Output quality audit detected playback corruption in rendered output.',
      });
    }
    if (audit.metrics?.usedSyntheticFallback) {
      issues.push({
        code: 'OUTPUT_SYNTHETIC_FALLBACK_USED',
        severity: 'ERROR',
        renderer: 'MP4',
        category: 'OUTPUT',
        message: 'Renderer fell back to synthetic visualizer instead of processing source video.',
      });
    }
    if (audit.isPosterLike || audit.isTooStatic) {
      issues.push({
        code: 'OUTPUT_STATIC_OR_POSTER',
        severity: 'WARNING',
        renderer: 'ALL',
        category: 'OUTPUT',
        message: 'Output video shows low visual variance or poster-like static imagery.',
      });
    }
  }

  return issues;
}

/**
 * Computes deterministic certification score and status based on issues.
 *
 * Scoring:
 * Base = 100
 * BLOCKING = -25
 * ERROR    = -12
 * WARNING  = -4
 * INFO     = 0
 *
 * Status:
 * ANY BLOCKING => NOT_CERTIFIED
 * Score < 80 => NOT_CERTIFIED
 * Score 80-94 => CERTIFIED_WITH_WARNINGS
 * Score >= 95 and no BLOCKING/ERROR => CERTIFIED
 */
export function calculateCertificationScore(issues: RenderCertificationIssue[]): {
  score: number;
  status: RenderCertificationStatus;
  classification: RenderCertificationClassification;
  blockingCount: number;
  warningCount: number;
  errorCount: number;
} {
  let penalty = 0;
  let blockingCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const issue of issues) {
    switch (issue.severity) {
      case 'BLOCKING':
        penalty += 25;
        blockingCount++;
        break;
      case 'ERROR':
        penalty += 12;
        errorCount++;
        break;
      case 'WARNING':
        penalty += 4;
        warningCount++;
        break;
      case 'INFO':
        penalty += 0;
        break;
    }
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));

  let status: RenderCertificationStatus = 'CERTIFIED';
  let classification: RenderCertificationClassification = 'CERTIFIED';

  if (blockingCount > 0 || score < 80) {
    status = 'NOT_CERTIFIED';
    classification = 'NOT_CERTIFIED';
  } else if (warningCount > 0 || errorCount > 0 || score < 95) {
    status = 'CERTIFIED_WITH_WARNINGS';
    classification = 'CERTIFIED_WITH_WARNINGS';
  } else {
    status = 'CERTIFIED';
    classification = 'CERTIFIED';
  }

  return {
    score,
    status,
    classification,
    blockingCount,
    warningCount,
    errorCount,
  };
}

/**
 * Main Master Render Certification Entry Point.
 * Evaluates behavioral contracts, multi-renderer parity, timeline, audio, and output audit.
 */
export function runRenderCertification(
  project: Partial<AlcoEditingProject>,
  options?: RenderCertificationOptions
): RenderCertificationReport {
  const scenes = project.scenes || [];
  const totalDuration = project.total_duration;
  const issues: RenderCertificationIssue[] = [];
  const overrides = options?.rendererOverrides;

  // 1. Renderer Contract Validation across scenes
  issues.push(...validateRendererContracts(scenes, options));

  // 2. Timeline Integrity Certification
  issues.push(...validateTimelineCertification(scenes, totalDuration));

  // 3. Audio Integrity Certification
  issues.push(...validateAudioCertification(project));

  // 4. Output Quality Audit Aggregation
  issues.push(...validateOutputQualityCertification(project));

  // 5. Check Native FFmpeg Binary Environment Status & Runtime Verification Truth
  let mp4RuntimeVerification: Mp4RuntimeVerification = options?.mp4RuntimeVerification || 'NOT_VERIFIED';

  // Fallback map legacy overrides if mp4RuntimeVerification was not explicitly supplied
  if (!options?.mp4RuntimeVerification) {
    if (overrides?.isNativeFfmpegPlaceholder) {
      mp4RuntimeVerification = 'PLACEHOLDER';
    } else if (overrides?.ffmpegAvailable === false) {
      mp4RuntimeVerification = 'UNAVAILABLE';
    }
  }

  let mp4CertificationReason: string;
  let mp4Verified = false;

  switch (mp4RuntimeVerification) {
    case 'VERIFIED':
      mp4Verified = true;
      mp4CertificationReason = 'MP4 runtime verified';
      break;
    case 'UNAVAILABLE':
      mp4Verified = false;
      mp4CertificationReason = 'FFmpeg runtime unavailable';
      issues.push({
        code: 'MP4_FFMPEG_UNAVAILABLE',
        severity: 'WARNING',
        renderer: 'MP4',
        category: 'OUTPUT',
        message: 'FFmpeg runtime unavailable in current environment. MP4 certification not verified.',
      });
      break;
    case 'PLACEHOLDER':
      mp4Verified = false;
      mp4CertificationReason = 'NATIVE FFMPEG PLACEHOLDER — REAL BINARY REQUIRED';
      issues.push({
        code: 'MP4_FFMPEG_PLACEHOLDER',
        severity: 'WARNING',
        renderer: 'MP4',
        category: 'OUTPUT',
        message: 'Native FFmpeg binary is a placeholder stub. Production MP4 render requires a real binary.',
      });
      break;
    case 'NOT_VERIFIED':
    default:
      mp4Verified = false;
      mp4CertificationReason = 'MP4 runtime has not been verified';
      break;
  }

  // 6. Score & Status Calculation
  const { score, status, blockingCount, warningCount, errorCount } = calculateCertificationScore(issues);

  // 7. Individual Renderer Passes
  const hasPreviewBlockingOrError = issues.some(
    (i) => (i.renderer === 'PREVIEW' || i.renderer === 'ALL') && (i.severity === 'BLOCKING' || i.severity === 'ERROR')
  );
  const hasCanvasBlockingOrError = issues.some(
    (i) => (i.renderer === 'CANVAS' || i.renderer === 'ALL') && (i.severity === 'BLOCKING' || i.severity === 'ERROR')
  );
  const hasMp4BlockingOrError = issues.some(
    (i) => (i.renderer === 'MP4' || i.renderer === 'ALL') && (i.severity === 'BLOCKING' || i.severity === 'ERROR')
  );

  const previewPass = !hasPreviewBlockingOrError && blockingCount === 0;
  const canvasPass = !hasCanvasBlockingOrError && blockingCount === 0;
  // mp4Pass requires verified runtime truth AND zero blocking/error issues
  const mp4Pass = mp4Verified && !hasMp4BlockingOrError && blockingCount === 0;

  // Parity Pass: true when all verified renderers agree and no parity-breaking error issues
  const hasParityIssues = issues.some(
    (i) => i.category === 'PARITY' && (i.severity === 'ERROR' || i.severity === 'BLOCKING')
  );
  const parityPass = previewPass && canvasPass && (mp4Verified ? mp4Pass : true) && !hasParityIssues;
  const fullParityVerified = previewPass && canvasPass && mp4Verified && mp4Pass && !hasParityIssues;

  // 8. Renderer Verification Confidence State
  const rendererVerification = {
    preview: 'VERIFIED' as const,
    canvas: 'VERIFIED' as const,
    mp4: mp4RuntimeVerification,
  };

  // 9. Build capability matrix (static implementation support baseline)
  const capabilityMatrix: RendererCapabilityMatrix = {
    hookFocalLock: {
      preview: overrides?.previewSupported?.hookFocalLock ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.hookFocalLock.preview,
      canvas: overrides?.canvasSupported?.hookFocalLock ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.hookFocalLock.canvas,
      mp4: overrides?.mp4Supported?.hookFocalLock ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.hookFocalLock.mp4,
    },
    motionBudget: {
      preview: overrides?.previewSupported?.motionBudget ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.motionBudget.preview,
      canvas: overrides?.canvasSupported?.motionBudget ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.motionBudget.canvas,
      mp4: overrides?.mp4Supported?.motionBudget ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.motionBudget.mp4,
    },
    midSceneRefresh: {
      preview: overrides?.previewSupported?.midSceneRefresh ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.midSceneRefresh.preview,
      canvas: overrides?.canvasSupported?.midSceneRefresh ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.midSceneRefresh.canvas,
      mp4: overrides?.mp4Supported?.midSceneRefresh ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.midSceneRefresh.mp4,
    },
    evidenceHold: {
      preview: overrides?.previewSupported?.evidenceHold ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.evidenceHold.preview,
      canvas: overrides?.canvasSupported?.evidenceHold ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.evidenceHold.canvas,
      mp4: overrides?.mp4Supported?.evidenceHold ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.evidenceHold.mp4,
    },
    proofStability: {
      preview: overrides?.previewSupported?.proofStability ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.proofStability.preview,
      canvas: overrides?.canvasSupported?.proofStability ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.proofStability.canvas,
      mp4: overrides?.mp4Supported?.proofStability ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.proofStability.mp4,
    },
    ctaStability: {
      preview: overrides?.previewSupported?.ctaStability ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.ctaStability.preview,
      canvas: overrides?.canvasSupported?.ctaStability ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.ctaStability.canvas,
      mp4: overrides?.mp4Supported?.ctaStability ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.ctaStability.mp4,
    },
    captionTreatment: {
      preview: overrides?.previewSupported?.captionTreatment ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.captionTreatment.preview,
      canvas: overrides?.canvasSupported?.captionTreatment ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.captionTreatment.canvas,
      mp4: overrides?.mp4Supported?.captionTreatment ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.captionTreatment.mp4,
    },
    transition: {
      preview: overrides?.previewSupported?.transition ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.transition.preview,
      canvas: overrides?.canvasSupported?.transition ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.transition.canvas,
      mp4: overrides?.mp4Supported?.transition ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.transition.mp4,
    },
    brollSuppression: {
      preview: overrides?.previewSupported?.brollSuppression ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.brollSuppression.preview,
      canvas: overrides?.canvasSupported?.brollSuppression ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.brollSuppression.canvas,
      mp4: overrides?.mp4Supported?.brollSuppression ?? DEFAULT_RENDERER_CAPABILITY_MATRIX.brollSuppression.mp4,
    },
  };

  return {
    status,
    score,
    issues,
    previewPass,
    canvasPass,
    mp4Pass,
    mp4Verified,
    parityPass,
    fullParityVerified,
    blockingIssueCount: blockingCount,
    warningCount,
    generatedAt: options?.generatedAt,
    capabilityMatrix,
    rendererVerification,
    mp4CertificationReason,
  };
}

/**
 * Gate check helper for final export workflow.
 * Blocks export if RenderCertification is NOT_CERTIFIED.
 */
export function canProceedToRenderExport(
  report?: RenderCertificationReport | null
): boolean {
  if (!report) return true;
  if (report.status === 'NOT_CERTIFIED') {
    return false;
  }
  return true;
}

/**
 * Pure renderer-specific export decision helper.
 * Distinguishes project-level safety from specific renderer runtime readiness.
 */
export function canProceedToRendererExport(
  report: RenderCertificationReport | null | undefined,
  renderer: 'WEBM' | 'MP4'
): boolean {
  if (!report) return true;
  if (report.status === 'NOT_CERTIFIED') return false;
  if (report.blockingIssueCount > 0) return false;

  if (renderer === 'WEBM') {
    return report.canvasPass;
  }

  if (renderer === 'MP4') {
    return report.mp4Verified === true && report.mp4Pass === true;
  }

  return true;
}
