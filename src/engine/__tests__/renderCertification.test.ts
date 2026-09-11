/**
 * ALCO Auto Motion V5 — Step 9.7 Production Render Certification Test Suite
 * 15 Scenarios validating Multi-Renderer Behavioral Parity, Safety Gates & Contracts
 */

import {
  runRenderCertification,
  getExpectedRenderState,
  validateRendererContracts,
  validateTimelineCertification,
  validateAudioCertification,
  calculateCertificationScore,
  canProceedToRenderExport,
  canProceedToRendererExport,
} from '../renderCertification';
import { AlcoEditingProject, SceneEditPlan, EvidenceType, MotionPreset, AdRole, Mp4RuntimeVerification } from '../../types';

function createMockScene(overrides: Partial<SceneEditPlan>): SceneEditPlan {
  const base: Partial<SceneEditPlan> = {
    id: 1,
    start: 0,
    end: 3.0,
    role: 'hook',
    adRole: 'hook',
    caption: 'Rahasia naikin ROAS 4.8x tanpa bakar budget.',
    motion: 'slow_zoom_in',
    motion_scale: 1.04,
    transition: 'cut',
    sound_effect: 'soft_impact',
    composition_profile: {
      primaryAttention: 'TALENT_TALKING_HEAD',
      hookFocalLockActive: true,
      hookFocalLockDurationSec: 1.2,
      captionTreatment: 'SUBDUED',
      headlineTreatment: 'STANDARD',
      brollLayer: 'SELECTIVE',
      suppressedElements: [],
    },
    editing_rhythm_plan: {
      paceLevel: 'FAST',
      targetVisualIntervalMs: 1200,
      minimumReadableDurationMs: 1200,
      requiresVisualHold: false,
      refreshStrategy: 'SUBTLE_REFRAME',
      motionBudget: 'HIGH',
      noveltyIntervalMs: 1500,
      preferredTransition: 'cut',
      transitionDurationMs: 0,
      allowMidSceneRefresh: false,
      midSceneRefreshPointsSec: [],
      preserveSpeechBoundary: true,
      preserveCompositionFocus: true,
      speechDensityLevel: 'NORMAL',
      readabilityPriority: 'NORMAL',
      reason: 'Mock baseline',
    },
    speech_start: 0.1,
    speech_end: 2.8,
    speech_duration: 2.7,
  };

  return { ...base, ...overrides } as unknown as SceneEditPlan;
}

export function runTests() {
  console.log('=== RUNNING STEP 9.7 RENDER CERTIFICATION TEST SUITE ===');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Fully valid project -> CERTIFIED, score >= 95
  // -------------------------------------------------------------------------
  console.log('\n--- Test 1: Fully Valid Project Certification ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0, adRole: 'hook' });
    const s2 = createMockScene({
      id: 2,
      start: 3.0,
      end: 6.5,
      adRole: 'proof',
      motion: 'slow_zoom_in',
      motion_scale: 1.04,
      transition: 'cut',
      visual_evidence: {
        type: 'SCREEN_PROOF',
        userAssetUrl: 'https://example.com/asset.png',
        title: 'ROAS 4.8x',
        metricValue: '4.8x',
      },
    });
    const s3 = createMockScene({
      id: 3,
      start: 6.5,
      end: 10.0,
      adRole: 'cta',
      motion: 'normal',
      motion_scale: 1.0,
      transition: 'cut',
    });

    const project: Partial<AlcoEditingProject> = {
      title: 'Valid Project',
      total_duration: 10.0,
      scenes: [s1, s2, s3],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'VERIFIED',
    });
    assert(report.status === 'CERTIFIED', 'TEST 1.1: Status is CERTIFIED');
    assert(report.score >= 95, 'TEST 1.2: Score is >= 95');
    assert(report.previewPass === true, 'TEST 1.3: previewPass is true');
    assert(report.canvasPass === true, 'TEST 1.4: canvasPass is true');
    assert(report.mp4Pass === true, 'TEST 1.5: mp4Pass is true');
    assert(report.mp4Verified === true, 'TEST 1.6: mp4Verified is true');
    assert(report.fullParityVerified === true, 'TEST 1.7: fullParityVerified is true');
    assert(report.parityPass === true, 'TEST 1.8: parityPass is true');
    assert(report.blockingIssueCount === 0, 'TEST 1.9: blockingIssueCount is 0');
  }

  // -------------------------------------------------------------------------
  // TEST 2: Missing composition_profile -> PARITY warning
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Missing Composition Profile ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0, composition_profile: undefined });
    const s2 = createMockScene({ id: 2, start: 3.0, end: 6.0 });

    const project: Partial<AlcoEditingProject> = {
      total_duration: 6.0,
      scenes: [s1, s2],
    };

    const report = runRenderCertification(project);
    const missingProfileIssue = report.issues.find((i) => i.code === 'MISSING_COMPOSITION_PROFILE');
    assert(missingProfileIssue !== undefined, 'TEST 2.1: Missing profile issue detected');
    assert(missingProfileIssue?.severity === 'WARNING', 'TEST 2.2: Issue severity is WARNING');
    assert(missingProfileIssue?.category === 'PARITY', 'TEST 2.3: Issue category is PARITY');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Missing editing_rhythm_plan -> renderer contract warning
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Missing Editing Rhythm Plan ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0, editing_rhythm_plan: undefined });

    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project);
    const missingRhythmIssue = report.issues.find((i) => i.code === 'MISSING_EDITING_RHYTHM_PLAN');
    assert(missingRhythmIssue !== undefined, 'TEST 3.1: Missing rhythm plan issue detected');
    assert(missingRhythmIssue?.severity === 'WARNING', 'TEST 3.2: Issue severity is WARNING');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Proof scene with unsupported aggressive motion -> render certification detects mismatch
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Proof Aggressive Motion Detection ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0, adRole: 'hook' });
    const s2 = createMockScene({
      id: 2,
      start: 3.0,
      end: 6.0,
      adRole: 'proof',
      motion: 'slow_zoom_in',
      motion_scale: 1.25, // Violates proof stability
    });

    const project: Partial<AlcoEditingProject> = {
      total_duration: 6.0,
      scenes: [s1, s2],
    };

    const report = runRenderCertification(project);
    const motionIssue = report.issues.find((i) => i.code === 'PROOF_UNSUPPORTED_AGGRESSIVE_MOTION');
    assert(motionIssue !== undefined, 'TEST 4.1: Aggressive motion issue detected');
    assert(motionIssue?.severity === 'ERROR', 'TEST 4.2: Issue severity is ERROR');
    assert(report.status !== 'CERTIFIED', 'TEST 4.3: Status is not CERTIFIED');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Evidence hold expected, all renderers support carry-over -> PASS
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Evidence Hold Shared Carry-Over Support ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 1.5,
      adRole: 'proof',
      visual_evidence: {
        type: 'SCREEN_PROOF',
        userAssetUrl: 'https://example.com/asset.png',
        title: 'Metric ROAS',
      },
    });
    const s2 = createMockScene({
      id: 2,
      start: 1.5,
      end: 4.5,
      adRole: 'proof',
    });

    const project: Partial<AlcoEditingProject> = {
      total_duration: 4.5,
      scenes: [s1, s2],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'VERIFIED',
    });
    assert(report.previewPass === true, 'TEST 5.1: previewPass is true');
    assert(report.canvasPass === true, 'TEST 5.2: canvasPass is true');
    assert(report.mp4Pass === true, 'TEST 5.3: mp4Pass is true');
    assert(report.mp4Verified === true, 'TEST 5.4: mp4Verified is true');
  }

  // -------------------------------------------------------------------------
  // TEST 6: Evidence hold metadata exists, MP4 support absent -> MP4 parity failure
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Evidence Hold MP4 Parity Failure ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 1.2,
      adRole: 'proof',
      editing_rhythm_plan: {
        requiresVisualHold: true,
        minimumReadableDurationMs: 2200,
        paceLevel: 'FAST',
        targetVisualIntervalMs: 1200,
        refreshStrategy: 'SUBTLE_REFRAME',
        motionBudget: 'HIGH',
        noveltyIntervalMs: 1500,
        preferredTransition: 'cut',
        transitionDurationMs: 0,
        allowMidSceneRefresh: false,
        midSceneRefreshPointsSec: [],
        preserveSpeechBoundary: true,
        preserveCompositionFocus: true,
        speechDensityLevel: 'NORMAL',
        readabilityPriority: 'NORMAL',
        reason: 'Proof test',
      },
      visual_evidence: {
        type: 'SCREEN_PROOF',
        userAssetUrl: 'https://example.com/proof.png',
        title: 'Revenue Chart',
      },
    });
    const s2 = createMockScene({ id: 2, start: 1.2, end: 4.0 });

    const project: Partial<AlcoEditingProject> = {
      total_duration: 4.0,
      scenes: [s1, s2],
    };

    const report = runRenderCertification(project, {
      rendererOverrides: {
        mp4Supported: { evidenceHold: false },
        strictParityMode: true,
      },
    });

    const holdIssue = report.issues.find((i) => i.code === 'MP4_EVIDENCE_HOLD_UNSUPPORTED');
    assert(holdIssue !== undefined, 'TEST 6.1: MP4 hold unsupported issue detected');
    assert(report.mp4Pass === false, 'TEST 6.2: mp4Pass is false');
    assert(report.parityPass === false, 'TEST 6.3: parityPass is false');
  }

  // -------------------------------------------------------------------------
  // TEST 7: Hook focal lock contract -> Preview/Canvas/MP4 agreement
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Hook Focal Lock Contract Parity ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 3.0,
      adRole: 'hook',
      composition_profile: {
        primaryAttention: 'TALENT_TALKING_HEAD',
        hookFocalLockActive: true,
        hookFocalLockDurationSec: 1.2,
        captionTreatment: 'SUBDUED',
        headlineTreatment: 'STANDARD',
        brollLayer: 'SELECTIVE',
        suppressedElements: [],
      },
    });

    const expectedState0 = getExpectedRenderState(s1, 0.5, [s1]);
    const expectedState2 = getExpectedRenderState(s1, 2.0, [s1]);

    assert(expectedState0.primaryAttention === 'TALENT_TALKING_HEAD', 'TEST 7.1: Opening attention is talent head');
    assert(expectedState0.brollAllowed === false, 'TEST 7.2: B-roll suppressed in opening window');
    assert(expectedState2.primaryAttention === 'TALENT_TALKING_HEAD', 'TEST 7.3: Sustained talent head attention');
  }

  // -------------------------------------------------------------------------
  // TEST 8: CTA motion stability -> PASS
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: CTA Motion Stability Contract ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 3.0,
      adRole: 'cta',
      motion: 'normal',
      motion_scale: 1.0,
      composition_profile: {
        primaryAttention: 'CTA_ACTION_BADGE',
        hookFocalLockActive: false,
        hookFocalLockDurationSec: 0,
        captionTreatment: 'MINIMAL',
        headlineTreatment: 'STANDARD',
        brollLayer: 'SUPPRESSED',
        suppressedElements: [],
      },
    });

    const expected = getExpectedRenderState(s1, 1.0, [s1]);
    assert(expected.captionTreatment === 'MINIMAL', 'TEST 8.1: Caption treatment is MINIMAL');
    assert(expected.motionLevel === 'normal', 'TEST 8.2: Motion level is normal');
  }

  // -------------------------------------------------------------------------
  // TEST 9: Invalid caption timing -> ERROR
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9: Invalid Caption Timing ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 2.0,
      word_timings: [
        { word: 'Test', startOffset: 5.0, endOffset: 6.0, isHighlight: false }, // Exceeds 2s scene
      ],
    });

    const project: Partial<AlcoEditingProject> = {
      total_duration: 2.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project);
    const captionIssue = report.issues.find((i) => i.code === 'CAPTION_TIMING_INVALID');
    assert(captionIssue !== undefined, 'TEST 9.1: Caption timing issue detected');
    assert(captionIssue?.severity === 'ERROR', 'TEST 9.2: Issue severity is ERROR');
  }

  // -------------------------------------------------------------------------
  // TEST 10: Audio timeline unchanged -> PASS
  // -------------------------------------------------------------------------
  console.log('\n--- Test 10: Audio Timeline Preserved ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 3.0,
      speech_start: 0.2,
      speech_end: 2.8,
    });

    const issues = validateAudioCertification({ scenes: [s1] });
    assert(
      issues.filter((i) => i.severity === 'ERROR' || i.severity === 'BLOCKING').length === 0,
      'TEST 10.1: Zero audio errors/blocking issues'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 11: Renderer missing capability -> parityPass = false
  // -------------------------------------------------------------------------
  console.log('\n--- Test 11: Renderer Missing Capability Parity Check ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project, {
      rendererOverrides: {
        canvasSupported: { transition: false },
        strictParityMode: true,
      },
    });

    assert(report.canvasPass === false, 'TEST 11.1: canvasPass is false');
    assert(report.parityPass === false, 'TEST 11.2: parityPass is false');
  }

  // -------------------------------------------------------------------------
  // TEST 12: Blocking renderer issue -> NOT_CERTIFIED
  // -------------------------------------------------------------------------
  console.log('\n--- Test 12: Blocking Issue Prevents Certification ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: -1.0 }); // Negative duration => BLOCKING
    const project: Partial<AlcoEditingProject> = {
      scenes: [s1],
    };

    const report = runRenderCertification(project);
    assert(report.status === 'NOT_CERTIFIED', 'TEST 12.1: Status is NOT_CERTIFIED');
    assert(report.blockingIssueCount > 0, 'TEST 12.2: blockingIssueCount > 0');
    assert(canProceedToRenderExport(report) === false, 'TEST 12.3: canProceedToRenderExport is false');
  }

  // -------------------------------------------------------------------------
  // TEST 13: Warnings only -> CERTIFIED_WITH_WARNINGS
  // -------------------------------------------------------------------------
  console.log('\n--- Test 13: Warnings Only -> CERTIFIED_WITH_WARNINGS ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 3.0,
      composition_profile: undefined, // Emits WARNING
      editing_rhythm_plan: undefined, // Emits WARNING
    });

    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project);
    assert(report.status === 'CERTIFIED_WITH_WARNINGS', 'TEST 13.1: Status is CERTIFIED_WITH_WARNINGS');
    assert(report.warningCount > 0, 'TEST 13.2: warningCount > 0');
    assert(report.blockingIssueCount === 0, 'TEST 13.3: blockingIssueCount is 0');
    assert(canProceedToRenderExport(report) === true, 'TEST 13.4: canProceedToRenderExport is true');
  }

  // -------------------------------------------------------------------------
  // TEST 14: Same input -> identical deterministic report
  // -------------------------------------------------------------------------
  console.log('\n--- Test 14: Deterministic Repeatability ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report1 = runRenderCertification(project);
    const report2 = runRenderCertification(project);

    assert(report1.status === report2.status, 'TEST 14.1: Statuses match');
    assert(report1.score === report2.score, 'TEST 14.2: Scores match');
    assert(report1.issues.length === report2.issues.length, 'TEST 14.3: Issue counts match');
    assert(report1.previewPass === report2.previewPass, 'TEST 14.4: previewPass matches');
    assert(report1.canvasPass === report2.canvasPass, 'TEST 14.5: canvasPass matches');
    assert(report1.mp4Pass === report2.mp4Pass, 'TEST 14.6: mp4Pass matches');
  }

  // -------------------------------------------------------------------------
  // TEST 15: Visual hold does not mutate source scenes -> PASS
  // -------------------------------------------------------------------------
  console.log('\n--- Test 15: Pure Read-Only Certification Validation ---');
  {
    const s1 = createMockScene({
      id: 1,
      start: 0,
      end: 1.0,
      adRole: 'proof',
      visual_evidence: {
        type: 'SCREEN_PROOF',
        title: 'ROAS 5.0x',
        userAssetUrl: 'https://example.com/asset.png',
      },
    });
    const s2 = createMockScene({ id: 2, start: 1.0, end: 3.5, adRole: 'insight' });

    const scenes = [s1, s2];
    const s1Snapshot = JSON.stringify(s1);
    const s2Snapshot = JSON.stringify(s2);

    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.5,
      scenes: scenes,
    };

    runRenderCertification(project);

    assert(JSON.stringify(s1) === s1Snapshot, 'TEST 15.1: Scene 1 completely unmutated');
    assert(JSON.stringify(s2) === s2Snapshot, 'TEST 15.2: Scene 2 completely unmutated');
  }

  // -------------------------------------------------------------------------
  // TEST 16: Step 9.7.1 - MP4 Runtime NOT_VERIFIED blocks MP4 but allows WebM
  // -------------------------------------------------------------------------
  console.log('\n--- Test 16: MP4 Runtime NOT_VERIFIED Hardening ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'NOT_VERIFIED',
    });

    assert(report.mp4Verified === false, 'TEST 16.1: mp4Verified is false');
    assert(report.mp4Pass === false, 'TEST 16.2: mp4Pass is false');
    assert(report.fullParityVerified === false, 'TEST 16.3: fullParityVerified is false');
    assert(report.canvasPass === true, 'TEST 16.4: canvasPass is true');
    assert(canProceedToRendererExport(report, 'WEBM') === true, 'TEST 16.5: WebM export allowed');
    assert(canProceedToRendererExport(report, 'MP4') === false, 'TEST 16.6: MP4 export blocked');
  }

  // -------------------------------------------------------------------------
  // TEST 17: Step 9.7.1 - MP4 Runtime UNAVAILABLE emits MP4_FFMPEG_UNAVAILABLE
  // -------------------------------------------------------------------------
  console.log('\n--- Test 17: MP4 Runtime UNAVAILABLE ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'UNAVAILABLE',
    });

    assert(report.mp4Verified === false, 'TEST 17.1: mp4Verified is false');
    assert(report.mp4Pass === false, 'TEST 17.2: mp4Pass is false');
    const issue = report.issues.find((i) => i.code === 'MP4_FFMPEG_UNAVAILABLE');
    assert(issue !== undefined, 'TEST 17.3: MP4_FFMPEG_UNAVAILABLE issue present');
    assert(issue?.severity === 'WARNING', 'TEST 17.4: Issue severity is WARNING');
    assert(canProceedToRendererExport(report, 'MP4') === false, 'TEST 17.5: MP4 export blocked');
  }

  // -------------------------------------------------------------------------
  // TEST 18: Step 9.7.1 - MP4 Runtime PLACEHOLDER emits MP4_FFMPEG_PLACEHOLDER
  // -------------------------------------------------------------------------
  console.log('\n--- Test 18: MP4 Runtime PLACEHOLDER ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'PLACEHOLDER',
    });

    assert(report.mp4Verified === false, 'TEST 18.1: mp4Verified is false');
    assert(report.mp4Pass === false, 'TEST 18.2: mp4Pass is false');
    const issue = report.issues.find((i) => i.code === 'MP4_FFMPEG_PLACEHOLDER');
    assert(issue !== undefined, 'TEST 18.3: MP4_FFMPEG_PLACEHOLDER issue present');
    assert(canProceedToRendererExport(report, 'MP4') === false, 'TEST 18.4: MP4 export blocked');
  }

  // -------------------------------------------------------------------------
  // TEST 19: Step 9.7.1 - MP4 Runtime VERIFIED -> fullParityVerified = true
  // -------------------------------------------------------------------------
  console.log('\n--- Test 19: MP4 Runtime VERIFIED Full Parity ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'VERIFIED',
    });

    assert(report.mp4Verified === true, 'TEST 19.1: mp4Verified is true');
    assert(report.mp4Pass === true, 'TEST 19.2: mp4Pass is true');
    assert(report.fullParityVerified === true, 'TEST 19.3: fullParityVerified is true');
    assert(canProceedToRendererExport(report, 'MP4') === true, 'TEST 19.4: canProceedToRendererExport MP4 is true');
  }

  // -------------------------------------------------------------------------
  // TEST 20: Step 9.7.1 - Default options omit explicit verification -> NOT_VERIFIED
  // -------------------------------------------------------------------------
  console.log('\n--- Test 20: Default Options Runtime Safety ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const report = runRenderCertification(project);

    assert(report.mp4Verified === false, 'TEST 20.1: Default mp4Verified is false');
    assert(report.mp4Pass === false, 'TEST 20.2: Default mp4Pass is false');
    assert(report.fullParityVerified === false, 'TEST 20.3: Default fullParityVerified is false');
  }

  // -------------------------------------------------------------------------
  // TEST 21: Step 9.7.1 - canProceedToRenderExport blocks on NOT_CERTIFIED
  // -------------------------------------------------------------------------
  console.log('\n--- Test 21: canProceedToRenderExport Hard Gate ---');
  {
    const notCertReport = {
      status: 'NOT_CERTIFIED' as const,
      score: 40,
      previewPass: false,
      canvasPass: false,
      mp4Pass: false,
      mp4Verified: false,
      fullParityVerified: false,
      parityPass: false,
      blockingIssueCount: 2,
      warningCount: 0,
      issues: [],
      capabilityMatrix: {} as any,
      generatedAt: '2026-09-10T00:00:00.000Z',
    };

    assert(canProceedToRenderExport(notCertReport) === false, 'TEST 21.1: NOT_CERTIFIED blocks overall export');
    assert(canProceedToRendererExport(notCertReport, 'WEBM') === false, 'TEST 21.2: NOT_CERTIFIED blocks WEBM export');
    assert(canProceedToRendererExport(notCertReport, 'MP4') === false, 'TEST 21.3: NOT_CERTIFIED blocks MP4 export');
  }

  // -------------------------------------------------------------------------
  // TEST 22: Step 9.7.1 - canProceedToRenderExport allows CERTIFIED & CERTIFIED_WITH_WARNINGS
  // -------------------------------------------------------------------------
  console.log('\n--- Test 22: canProceedToRenderExport Allowed States ---');
  {
    const certifiedReport = {
      status: 'CERTIFIED' as const,
      score: 100,
      previewPass: true,
      canvasPass: true,
      mp4Pass: true,
      mp4Verified: true,
      fullParityVerified: true,
      parityPass: true,
      blockingIssueCount: 0,
      warningCount: 0,
      issues: [],
      capabilityMatrix: {} as any,
      generatedAt: '2026-09-10T00:00:00.000Z',
    };

    const warningsReport = {
      ...certifiedReport,
      status: 'CERTIFIED_WITH_WARNINGS' as const,
      warningCount: 1,
    };

    assert(canProceedToRenderExport(certifiedReport) === true, 'TEST 22.1: CERTIFIED allows overall export');
    assert(canProceedToRenderExport(warningsReport) === true, 'TEST 22.2: CERTIFIED_WITH_WARNINGS allows overall export');
  }

  // -------------------------------------------------------------------------
  // TEST 23: Step 9.7.1 - WebM is NOT blocked when native MP4 runtime is unverified
  // -------------------------------------------------------------------------
  console.log('\n--- Test 23: Non-blocking WebM on Unverified MP4 Runtime ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const reportUnverified = runRenderCertification(project, {
      mp4RuntimeVerification: 'NOT_VERIFIED',
    });

    const reportUnavailable = runRenderCertification(project, {
      mp4RuntimeVerification: 'UNAVAILABLE',
    });

    assert(canProceedToRendererExport(reportUnverified, 'WEBM') === true, 'TEST 23.1: WebM allowed when MP4 NOT_VERIFIED');
    assert(canProceedToRendererExport(reportUnavailable, 'WEBM') === true, 'TEST 23.2: WebM allowed when MP4 UNAVAILABLE');
  }

  // -------------------------------------------------------------------------
  // TEST 24: Step 9.7.1 - MP4 is strictly blocked when not verified
  // -------------------------------------------------------------------------
  console.log('\n--- Test 24: Strict MP4 Blocking on Non-Verified States ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const rNotVer = runRenderCertification(project, { mp4RuntimeVerification: 'NOT_VERIFIED' });
    const rUnavail = runRenderCertification(project, { mp4RuntimeVerification: 'UNAVAILABLE' });
    const rPlace = runRenderCertification(project, { mp4RuntimeVerification: 'PLACEHOLDER' });

    assert(canProceedToRendererExport(rNotVer, 'MP4') === false, 'TEST 24.1: MP4 blocked on NOT_VERIFIED');
    assert(canProceedToRendererExport(rUnavail, 'MP4') === false, 'TEST 24.2: MP4 blocked on UNAVAILABLE');
    assert(canProceedToRendererExport(rPlace, 'MP4') === false, 'TEST 24.3: MP4 blocked on PLACEHOLDER');
  }

  // -------------------------------------------------------------------------
  // TEST 25: Step 9.7.1 - Deterministic output with provided generatedAt
  // -------------------------------------------------------------------------
  console.log('\n--- Test 25: Deterministic Output with Fixed Timestamp ---');
  {
    const s1 = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [s1],
    };

    const fixedTime = '2026-09-10T12:00:00.000Z';
    const reportA = runRenderCertification(project, {
      mp4RuntimeVerification: 'VERIFIED',
      generatedAt: fixedTime,
    });

    const reportB = runRenderCertification(project, {
      mp4RuntimeVerification: 'VERIFIED',
      generatedAt: fixedTime,
    });

    assert(JSON.stringify(reportA) === JSON.stringify(reportB), 'TEST 25.1: Exact deep string equality for deterministic report');
    assert(reportA.generatedAt === fixedTime, 'TEST 25.2: generatedAt timestamp is preserved');
  }

  console.log(`\n=== STEP 9.7 / 9.7.1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  runTests();
}
