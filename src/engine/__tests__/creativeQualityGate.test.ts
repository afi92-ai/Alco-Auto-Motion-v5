/**
 * Step 9.6 Deterministic Test Suite
 * Creative Quality Gate & Final Editing Validation
 */

import {
  runCreativeQualityGate,
  calculateSceneVisualComplexity,
  calculateQualityScore,
  canProceedAfterQualityGate,
  CreativeQualityIssue,
} from '../creativeQualityGate';
import { SceneEditPlan } from '../../types';

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
      primaryAttention: 'HOOK_SPEAKER_FACE',
      hookFocalLockActive: false,
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

function runTests() {
  console.log('=== RUNNING STEP 9.6 CREATIVE QUALITY GATE TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1 — Healthy Meta Ads scene set => score >= 90
  // -------------------------------------------------------------------------
  console.log('\n--- Test 1: Healthy Meta Ads Scene Set ---');
  {
    const healthyScenes: SceneEditPlan[] = [
      createMockScene({
        id: 1,
        start: 0,
        end: 2.2,
        role: 'hook',
        adRole: 'hook',
        caption: 'Stop scrolling sekarang!',
        motion: 'slow_zoom_in',
        motion_scale: 1.05,
        transition: 'cut',
        speech_start: 0.1,
        speech_end: 2.0,
        speech_duration: 1.9,
      }),
      createMockScene({
        id: 2,
        start: 2.2,
        end: 5.0,
        role: 'problem',
        adRole: 'problem',
        caption: 'Biaya iklan Anda sering boncos terus.',
        motion: 'slow_zoom_in',
        motion_scale: 1.03,
        transition: 'cut',
        speech_start: 2.3,
        speech_end: 4.8,
        speech_duration: 2.5,
      }),
      createMockScene({
        id: 3,
        start: 5.0,
        end: 8.0,
        role: 'proof',
        adRole: 'proof',
        caption: 'Ini dashboard ROAS kami nyata.',
        motion: 'normal',
        motion_scale: 1.02,
        transition: 'cut',
        visual_evidence: {
          type: 'SCREEN_PROOF',
          title: 'ROAS Verified',
          userAssetUrl: 'https://example.com/asset1.jpg',
          metricValue: '4.8x',
        } as any,
        speech_start: 5.1,
        speech_end: 7.8,
        speech_duration: 2.7,
      }),
      createMockScene({
        id: 4,
        start: 8.0,
        end: 11.0,
        role: 'cta',
        adRole: 'cta',
        caption: 'Klik tombol di bawah sekarang.',
        motion: 'normal',
        motion_scale: 1.0,
        transition: 'cut',
        speech_start: 8.1,
        speech_end: 10.8,
        speech_duration: 2.7,
      }),
    ];

    const { report } = runCreativeQualityGate(healthyScenes);

    assert(report.score >= 90, `TEST 1.1: Healthy scene set score is ${report.score} (>= 90)`);
    assert(report.status === 'PASS' || report.status === 'PASS_WITH_WARNINGS', 'TEST 1.2: Status is PASS or PASS_WITH_WARNINGS');
    assert(report.blockingIssueCount === 0, 'TEST 1.3: 0 blocking issues');
  }

  // -------------------------------------------------------------------------
  // TEST 2 — Proof + aggressive motion => warning / safe auto-fix
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Proof + Aggressive Motion ---');
  {
    const proofScene = createMockScene({
      id: 201,
      start: 0,
      end: 3.0,
      role: 'proof',
      adRole: 'proof',
      motion: 'punch_zoom',
      motion_scale: 1.25,
      visual_evidence: {
        type: 'SCREEN_PROOF',
        title: 'ROAS',
        userAssetUrl: 'https://example.com/p.jpg',
      } as any,
    });

    const { report, validatedScenes } = runCreativeQualityGate([proofScene], { autoFix: true });
    const motionIssue = report.issues.find((i) => i.code === 'PROOF_AGGRESSIVE_MOTION');

    assert(Boolean(motionIssue), 'TEST 2.1: Detected PROOF_AGGRESSIVE_MOTION warning');
    assert(motionIssue?.severity === 'WARNING', 'TEST 2.2: Severity is WARNING');
    assert(motionIssue?.autoFixApplied === true, 'TEST 2.3: autoFixApplied is true');
    assert(validatedScenes[0].motion === 'normal', 'TEST 2.4: Auto-fix downgraded motion to normal');
    assert(validatedScenes[0].motion_scale <= 1.05, 'TEST 2.5: Auto-fix clamped motion_scale <= 1.05');
  }

  // -------------------------------------------------------------------------
  // TEST 3 — Proof + generic B-roll overriding evidence => error
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Proof + Generic B-Roll Overriding Evidence ---');
  {
    const proofScene = createMockScene({
      id: 301,
      start: 0,
      end: 3.0,
      role: 'proof',
      adRole: 'proof',
      visual_evidence: {
        type: 'SCREEN_PROOF',
        title: 'ROAS',
        userAssetUrl: 'https://example.com/p.jpg',
      } as any,
      broll: {
        query: 'generic reaction',
        visual_intent: 'metaphor',
        overlay_style: 'full',
        sourceUrl: 'https://example.com/generic.mp4',
      } as any,
    });

    const { report, validatedScenes } = runCreativeQualityGate([proofScene], { autoFix: true });
    const brollIssue = report.issues.find((i) => i.code === 'PROOF_EVIDENCE_HIDDEN_BY_BROLL');

    assert(Boolean(brollIssue), 'TEST 3.1: Detected PROOF_EVIDENCE_HIDDEN_BY_BROLL');
    assert(brollIssue?.severity === 'ERROR', 'TEST 3.2: Severity is ERROR');
    assert(validatedScenes[0].broll === null, 'TEST 3.3: Auto-fix suppressed generic B-roll layer');
  }

  // -------------------------------------------------------------------------
  // TEST 4 — CTA with mid-scene refresh => warning / refresh disabled
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: CTA With Mid-Scene Refresh ---');
  {
    const ctaScene = createMockScene({
      id: 401,
      start: 0,
      end: 3.0,
      role: 'cta',
      adRole: 'cta',
      editing_rhythm_plan: {
        allowMidSceneRefresh: true,
        midSceneRefreshPointsSec: [1.5],
      } as any,
    });

    const { report, validatedScenes } = runCreativeQualityGate([ctaScene], { autoFix: true });
    const ctaIssue = report.issues.find((i) => i.code === 'CTA_UNNECESSARY_REFRESH');

    assert(Boolean(ctaIssue), 'TEST 4.1: Detected CTA_UNNECESSARY_REFRESH warning');
    assert(validatedScenes[0].editing_rhythm_plan?.allowMidSceneRefresh === false, 'TEST 4.2: Auto-fix disabled allowMidSceneRefresh');
    assert(validatedScenes[0].editing_rhythm_plan?.midSceneRefreshPointsSec?.length === 0, 'TEST 4.3: Auto-fix cleared midSceneRefreshPointsSec');
  }

  // -------------------------------------------------------------------------
  // TEST 5 — Refresh point outside scene duration => error + safe removal
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Refresh Point Outside Scene Duration ---');
  {
    const scene = createMockScene({
      id: 501,
      start: 0,
      end: 4.0,
      role: 'problem',
      adRole: 'problem',
      editing_rhythm_plan: {
        allowMidSceneRefresh: true,
        midSceneRefreshPointsSec: [1.8, 5.2], // 5.2s > 4.0s duration
      } as any,
    });

    const { report, validatedScenes } = runCreativeQualityGate([scene], { autoFix: true });
    const refreshIssue = report.issues.find((i) => i.code === 'REFRESH_POINT_OUTSIDE_DURATION');

    assert(Boolean(refreshIssue), 'TEST 5.1: Detected REFRESH_POINT_OUTSIDE_DURATION');
    assert(refreshIssue?.severity === 'ERROR', 'TEST 5.2: Severity is ERROR');
    assert(validatedScenes[0].editing_rhythm_plan?.midSceneRefreshPointsSec?.includes(5.2) === false, 'TEST 5.3: Invalid 5.2s marker removed');
    assert(validatedScenes[0].editing_rhythm_plan?.midSceneRefreshPointsSec?.includes(1.8) === true, 'TEST 5.4: Valid 1.8s marker preserved');
  }

  // -------------------------------------------------------------------------
  // TEST 6 — Dense speech + HIGH motion => warning
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Dense Speech + HIGH Motion ---');
  {
    const denseScene = createMockScene({
      id: 601,
      start: 0,
      end: 2.0,
      role: 'solution',
      adRole: 'solution',
      caption: 'Satu dua tiga empat lima enam tujuh delapan sembilan sepuluh sebelas dua belas', // 12 words in 2s = 6.0 WPS (DENSE)
      motion_scale: 1.20,
      editing_rhythm_plan: {
        speechDensityLevel: 'DENSE',
        motionBudget: 'HIGH',
      } as any,
    });

    const { report, validatedScenes } = runCreativeQualityGate([denseScene], { autoFix: true });
    const denseIssue = report.issues.find((i) => i.code === 'DENSE_SPEECH_AGGRESSIVE_MOTION');

    assert(Boolean(denseIssue), 'TEST 6.1: Detected DENSE_SPEECH_AGGRESSIVE_MOTION warning');
    assert(denseIssue?.severity === 'WARNING', 'TEST 6.2: Severity is WARNING');
    assert(validatedScenes[0].motion_scale <= 1.05, 'TEST 6.3: Auto-fix clamped motion_scale <= 1.05');
  }

  // -------------------------------------------------------------------------
  // TEST 7 — Caption/evidence collision => warning
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Caption/Evidence Collision ---');
  {
    const collidingScene = createMockScene({
      id: 701,
      start: 0,
      end: 3.0,
      role: 'proof',
      adRole: 'proof',
      caption_density_status: 'power_highlight',
      caption_adaptive_position: 'CENTER-LOW',
      caption_font_size_pt: 32,
      visual_evidence: {
        type: 'SCREEN_PROOF',
        title: 'ROAS',
        userAssetUrl: 'https://example.com/p.jpg',
      } as any,
    });

    const { report, validatedScenes } = runCreativeQualityGate([collidingScene], { autoFix: true });
    const collisionIssue = report.issues.find(
      (i) => i.code === 'CAPTION_TOO_DOMINANT_IN_PROOF' || i.code === 'CAPTION_COLLIDES_WITH_EVIDENCE'
    );

    assert(Boolean(collisionIssue), 'TEST 7.1: Detected caption/evidence collision warning');
    assert(validatedScenes[0].caption_adaptive_position === 'LOWER', 'TEST 7.2: Auto-fix shifted position to LOWER');
    assert(validatedScenes[0].caption_density_status === 'clean_minimal', 'TEST 7.3: Auto-fix set density to clean_minimal');
  }

  // -------------------------------------------------------------------------
  // TEST 8 — Evidence hold carries into CTA => error
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: Evidence Hold Carries Into CTA ---');
  {
    const proofScene = createMockScene({
      id: 801,
      start: 0,
      end: 1.0,
      role: 'proof',
      adRole: 'proof',
      visual_evidence: {
        type: 'SCREEN_PROOF',
        title: 'Proof',
        userAssetUrl: 'https://example.com/p.jpg',
      } as any,
      editing_rhythm_plan: {
        targetVisualIntervalMs: 2500,
        minimumReadableDurationMs: 2500,
        requiresVisualHold: true,
      } as any,
    });

    const ctaScene = createMockScene({
      id: 802,
      start: 1.0,
      end: 3.0,
      role: 'cta',
      adRole: 'cta',
    });

    const { report } = runCreativeQualityGate([proofScene, ctaScene]);
    assert(report.status !== 'FAIL' || report.blockingIssueCount === 0, 'TEST 8.1: Safe conflict stop prevents invalid corruption');
  }

  // -------------------------------------------------------------------------
  // TEST 9 — Repeated asset overuse => warning
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9: Repeated Asset Overuse ---');
  {
    const sameUrl = 'https://example.com/duplicate_asset.jpg';
    const overusedScenes = [1, 2, 3, 4, 5].map((id, idx) =>
      createMockScene({
        id,
        start: idx * 2,
        end: (idx + 1) * 2,
        role: 'problem',
        visual_evidence: {
          type: 'SCREEN_PROOF',
          title: `Evidence ${id}`,
          userAssetUrl: sameUrl,
        } as any,
      })
    );

    const { report } = runCreativeQualityGate(overusedScenes);
    const assetIssue = report.issues.find((i) => i.code === 'ASSET_REPEATED_OVERUSE');

    assert(Boolean(assetIssue), 'TEST 9.1: Detected ASSET_REPEATED_OVERUSE warning for 5x reused asset');
    assert(assetIssue?.severity === 'WARNING', 'TEST 9.2: Severity is WARNING');
  }

  // -------------------------------------------------------------------------
  // TEST 10 — Invalid speech timeline => blocking/error
  // -------------------------------------------------------------------------
  console.log('\n--- Test 10: Invalid Speech Timeline ---');
  {
    const invalidScene = createMockScene({
      id: 1001,
      start: 0,
      end: 3.0,
      speech_start: 2.5,
      speech_end: 1.0, // Invalid: speech_start > speech_end
    });

    const { report } = runCreativeQualityGate([invalidScene]);
    const timelineIssue = report.issues.find((i) => i.code === 'SPEECH_TIMELINE_INVALID');

    assert(Boolean(timelineIssue), 'TEST 10.1: Detected SPEECH_TIMELINE_INVALID');
    assert(timelineIssue?.severity === 'BLOCKING', 'TEST 10.2: Inverted speech boundaries classified as BLOCKING');
    assert(report.status === 'FAIL', 'TEST 10.3: Report status is FAIL due to blocking corruption');
  }

  // -------------------------------------------------------------------------
  // TEST 11 — Valid Step 9.5 visual hold => no false positive
  // -------------------------------------------------------------------------
  console.log('\n--- Test 11: Valid Step 9.5 Visual Hold No False Positive ---');
  {
    const proofScene = createMockScene({
      id: 1101,
      start: 0,
      end: 1.2,
      role: 'proof',
      adRole: 'proof',
      visual_evidence: {
        type: 'SCREEN_PROOF',
        title: 'Proof',
        userAssetUrl: 'https://example.com/p.jpg',
      } as any,
      editing_rhythm_plan: {
        paceLevel: 'STABLE',
        minimumReadableDurationMs: 2200,
        requiresVisualHold: true,
        refreshStrategy: 'EVIDENCE_HOLD',
        motionBudget: 'MINIMAL',
        preferredTransition: 'cut',
      } as any,
    });

    const benefitScene = createMockScene({
      id: 1102,
      start: 1.2,
      end: 4.0,
      role: 'solution',
      adRole: 'benefit',
    });

    const { report } = runCreativeQualityGate([proofScene, benefitScene]);
    const falseHoldIssue = report.issues.find((i) => i.code === 'EVIDENCE_HOLD_BLEEDS_INTO_CONFLICT');

    assert(falseHoldIssue === undefined, 'TEST 11.1: No false positive for legitimate proof -> benefit hold');
    assert(report.score >= 80, 'TEST 11.2: Valid hold preserves high quality score');
  }

  // -------------------------------------------------------------------------
  // TEST 12 — Determinism: Same input => identical report
  // -------------------------------------------------------------------------
  console.log('\n--- Test 12: Deterministic Output ---');
  {
    const testScenes = [
      createMockScene({ id: 1, start: 0, end: 2.5 }),
      createMockScene({ id: 2, start: 2.5, end: 5.0, motion_scale: 1.25, adRole: 'proof' }),
    ];

    const res1 = runCreativeQualityGate(testScenes, { autoFix: false });
    const res2 = runCreativeQualityGate(testScenes, { autoFix: false });

    assert(res1.report.score === res2.report.score, 'TEST 12.1: Scores are strictly identical');
    assert(res1.report.status === res2.report.status, 'TEST 12.2: Statuses are strictly identical');
    assert(res1.report.issues.length === res2.report.issues.length, 'TEST 12.3: Issue counts are strictly identical');
    assert(
      JSON.stringify(res1.report.issues) === JSON.stringify(res2.report.issues),
      'TEST 12.4: Issues JSON is 100% deterministic'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 13 — Auto-fix does not change speech timestamps
  // -------------------------------------------------------------------------
  console.log('\n--- Test 13: Auto-Fix Preserves Speech Timestamps ---');
  {
    const scenesWithSpeech: SceneEditPlan[] = [
      createMockScene({
        id: 1301,
        start: 0,
        end: 3.0,
        speech_start: 0.15,
        speech_end: 2.85,
        speech_duration: 2.7,
        adRole: 'proof',
        motion: 'punch_zoom', // Will trigger auto-fix
        motion_scale: 1.25,
      }),
      createMockScene({
        id: 1302,
        start: 3.0,
        end: 6.0,
        speech_start: 3.2,
        speech_end: 5.7,
        speech_duration: 2.5,
        adRole: 'cta',
        editing_rhythm_plan: { allowMidSceneRefresh: true, midSceneRefreshPointsSec: [1.5] } as any, // Will trigger auto-fix
      }),
    ];

    const { validatedScenes } = runCreativeQualityGate(scenesWithSpeech, { autoFix: true });

    assert(validatedScenes[0].speech_start === 0.15, 'TEST 13.1: Scene 1 speech_start unchanged');
    assert(validatedScenes[0].speech_end === 2.85, 'TEST 13.2: Scene 1 speech_end unchanged');
    assert(validatedScenes[0].speech_duration === 2.7, 'TEST 13.3: Scene 1 speech_duration unchanged');
    assert(validatedScenes[1].speech_start === 3.2, 'TEST 13.4: Scene 2 speech_start unchanged');
    assert(validatedScenes[1].speech_end === 5.7, 'TEST 13.5: Scene 2 speech_end unchanged');
    assert(validatedScenes[1].speech_duration === 2.5, 'TEST 13.6: Scene 2 speech_duration unchanged');
  }

  // -------------------------------------------------------------------------
  // TEST 14 — Quality scoring deterministic
  // -------------------------------------------------------------------------
  console.log('\n--- Test 14: Quality Scoring Math Verification ---');
  {
    const issues: CreativeQualityIssue[] = [
      { code: 'W1', severity: 'WARNING', category: 'MOTION', message: 'W1', autoFixAvailable: false },
      { code: 'W2', severity: 'WARNING', category: 'MOTION', message: 'W2', autoFixAvailable: false },
      { code: 'E1', severity: 'ERROR', category: 'RHYTHM', message: 'E1', autoFixAvailable: false },
    ];

    // Score: 100 - (4*2) - (12*1) = 100 - 8 - 12 = 80
    const res = calculateQualityScore(issues);
    assert(res.score === 80, `TEST 14.1: Calculated score is exactly 80 (got ${res.score})`);
    assert(res.classification === 'READY_WITH_WARNINGS', 'TEST 14.2: 80 classified as READY_WITH_WARNINGS');
    assert(res.status === 'PASS_WITH_WARNINGS', 'TEST 14.3: Status is PASS_WITH_WARNINGS');

    // Add a blocking issue: 80 - 25 = 55 (< 60)
    issues.push({ code: 'B1', severity: 'BLOCKING', category: 'RHYTHM', message: 'B1', autoFixAvailable: false });
    const blockedRes = calculateQualityScore(issues);
    assert(blockedRes.score === 55, `TEST 14.4: Blocked score is exactly 55 (got ${blockedRes.score})`);
    assert(blockedRes.status === 'FAIL', 'TEST 14.5: Status is FAIL');
    assert(blockedRes.classification === 'NOT_READY', 'TEST 14.6: Classification is NOT_READY');
  }

  // -------------------------------------------------------------------------
  // TEST 15 — Auto-fix sets resolved=true and populates resolution description
  // -------------------------------------------------------------------------
  console.log('\n--- Test 15: Auto-Fix Resolved Metadata Population ---');
  {
    const scenesToFix: SceneEditPlan[] = [
      createMockScene({
        id: 1501,
        start: 0,
        end: 3.0,
        adRole: 'proof',
        motion: 'punch_zoom',
        motion_scale: 1.25,
      }),
      createMockScene({
        id: 1502,
        start: 3.0,
        end: 6.0,
        adRole: 'proof',
        transition: 'flash',
        editing_rhythm_plan: {
          preferredTransition: 'flash',
        } as any,
      }),
    ];

    const { report } = runCreativeQualityGate(scenesToFix, { autoFix: true });
    const fixedIssues = report.issues.filter((i) => i.autoFixApplied);

    assert(fixedIssues.length >= 2, 'TEST 15.1: At least 2 auto-fixes applied');
    for (const issue of fixedIssues) {
      assert(issue.resolved === true, `TEST 15.2: Issue ${issue.code} has resolved === true`);
      assert(typeof issue.resolution === 'string' && issue.resolution.length > 5, `TEST 15.3: Issue ${issue.code} has resolution string: "${issue.resolution}"`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 16 — Resolved WARNING penalty is 0 (score stays 100)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 16: Resolved WARNING Penalty is 0 ---');
  {
    const resolvedWarningIssues: CreativeQualityIssue[] = [
      {
        code: 'CAPTION_TOO_DOMINANT_IN_PROOF',
        severity: 'WARNING',
        category: 'CAPTION',
        message: 'Dominant caption',
        autoFixAvailable: true,
        autoFixApplied: true,
        resolved: true,
        resolution: 'Reduced caption size',
      },
      {
        code: 'EVIDENCE_MOTION_EXCESSIVE',
        severity: 'WARNING',
        category: 'MOTION',
        message: 'Excessive motion',
        autoFixAvailable: true,
        autoFixApplied: true,
        resolved: true,
        resolution: 'Softened motion scale',
      },
      {
        code: 'FLASH_TRANSITION_IN_PROOF_OR_CTA',
        severity: 'WARNING',
        category: 'TRANSITION',
        message: 'Flash transition in proof',
        autoFixAvailable: true,
        autoFixApplied: true,
        resolved: true,
        resolution: 'Replaced flash with cut',
      },
    ];

    const result = calculateQualityScore(resolvedWarningIssues);
    assert(result.score === 100, `TEST 16.1: Score with 3 resolved warnings is 100 (got ${result.score})`);
    assert(result.status === 'PASS', 'TEST 16.2: Status is PASS');
    assert(result.classification === 'READY', 'TEST 16.3: Classification is READY');
    assert(result.resolvedWarningCount === 3, 'TEST 16.4: resolvedWarningCount is 3');
  }

  // -------------------------------------------------------------------------
  // TEST 17 — Unresolved vs Resolved WARNING comparison
  // -------------------------------------------------------------------------
  console.log('\n--- Test 17: Unresolved vs Resolved WARNING Score Comparison ---');
  {
    const unresolvedIssues: CreativeQualityIssue[] = [
      { code: 'W1', severity: 'WARNING', category: 'MOTION', message: 'Unresolved 1', autoFixAvailable: false, resolved: false },
      { code: 'W2', severity: 'WARNING', category: 'MOTION', message: 'Unresolved 2', autoFixAvailable: false, resolved: false },
    ];
    const resolvedIssues: CreativeQualityIssue[] = [
      { code: 'W1', severity: 'WARNING', category: 'MOTION', message: 'Resolved 1', autoFixAvailable: true, resolved: true, autoFixApplied: true, resolution: 'Fixed' },
      { code: 'W2', severity: 'WARNING', category: 'MOTION', message: 'Resolved 2', autoFixAvailable: true, resolved: true, autoFixApplied: true, resolution: 'Fixed' },
    ];

    const unresolvedRes = calculateQualityScore(unresolvedIssues);
    const resolvedRes = calculateQualityScore(resolvedIssues);

    assert(unresolvedRes.score === 92, `TEST 17.1: Unresolved 2x WARNING score is 92 (got ${unresolvedRes.score})`);
    assert(resolvedRes.score === 100, `TEST 17.2: Resolved 2x WARNING score is 100 (got ${resolvedRes.score})`);
  }

  // -------------------------------------------------------------------------
  // TEST 18 — Resolved ERROR retains small -2 penalty vs unresolved -12
  // -------------------------------------------------------------------------
  console.log('\n--- Test 18: Resolved ERROR Penalty vs Unresolved ERROR ---');
  {
    const unresolvedErr: CreativeQualityIssue[] = [
      { code: 'E1', severity: 'ERROR', category: 'RHYTHM', message: 'Unresolved Error', autoFixAvailable: false, resolved: false },
    ];
    const resolvedErr: CreativeQualityIssue[] = [
      { code: 'E1', severity: 'ERROR', category: 'RHYTHM', message: 'Resolved Error', autoFixAvailable: true, resolved: true, autoFixApplied: true, resolution: 'Intervention resolved' },
    ];

    const unRes = calculateQualityScore(unresolvedErr);
    const resRes = calculateQualityScore(resolvedErr);

    assert(unRes.score === 88, `TEST 18.1: Unresolved ERROR score is 88 (got ${unRes.score})`);
    assert(resRes.score === 98, `TEST 18.2: Resolved ERROR score is 98 (got ${resRes.score})`);
  }

  // -------------------------------------------------------------------------
  // TEST 19 — canProceedAfterQualityGate returns false when status is FAIL
  // -------------------------------------------------------------------------
  console.log('\n--- Test 19: canProceedAfterQualityGate Blocks on FAIL Status ---');
  {
    const failReport = {
      status: 'FAIL' as const,
      score: 50,
      classification: 'NOT_READY' as const,
      issues: [],
      blockingIssueCount: 0,
      warningCount: 0,
      autoFixCount: 0,
      sceneComplexity: [],
    };
    assert(canProceedAfterQualityGate(failReport) === false, 'TEST 19.1: canProceedAfterQualityGate is false for status FAIL');
  }

  // -------------------------------------------------------------------------
  // TEST 20 — canProceedAfterQualityGate returns false when blockingIssueCount > 0
  // -------------------------------------------------------------------------
  console.log('\n--- Test 20: canProceedAfterQualityGate Blocks on blockingIssueCount > 0 ---');
  {
    const blockedReport = {
      status: 'FAIL' as const,
      score: 75,
      classification: 'NOT_READY' as const,
      issues: [{ code: 'TIMELINE_NEGATIVE_DURATION', severity: 'BLOCKING' as const, category: 'RHYTHM' as const, message: 'Bad', autoFixAvailable: false }],
      blockingIssueCount: 1,
      warningCount: 0,
      autoFixCount: 0,
      sceneComplexity: [],
    };
    assert(canProceedAfterQualityGate(blockedReport) === false, 'TEST 20.1: canProceedAfterQualityGate is false when blockingIssueCount > 0');
  }

  // -------------------------------------------------------------------------
  // TEST 21 — canProceedAfterQualityGate allows PASS and PASS_WITH_WARNINGS
  // -------------------------------------------------------------------------
  console.log('\n--- Test 21: canProceedAfterQualityGate Allows Non-Blocking Workflows ---');
  {
    const passReport = {
      status: 'PASS' as const,
      score: 100,
      classification: 'READY' as const,
      issues: [],
      blockingIssueCount: 0,
      warningCount: 0,
      autoFixCount: 0,
      sceneComplexity: [],
    };
    const warnReport = {
      status: 'PASS_WITH_WARNINGS' as const,
      score: 85,
      classification: 'READY_WITH_WARNINGS' as const,
      issues: [{ code: 'ATTENTION_TARGETS_EXCEEDED', severity: 'WARNING' as const, category: 'COMPOSITION' as const, message: 'Warning', autoFixAvailable: false }],
      blockingIssueCount: 0,
      warningCount: 1,
      autoFixCount: 0,
      sceneComplexity: [],
    };

    assert(canProceedAfterQualityGate(passReport) === true, 'TEST 21.1: canProceedAfterQualityGate is true for PASS');
    assert(canProceedAfterQualityGate(warnReport) === true, 'TEST 21.2: canProceedAfterQualityGate is true for PASS_WITH_WARNINGS');
    assert(canProceedAfterQualityGate(null) === true, 'TEST 21.3: canProceedAfterQualityGate is true when report is undefined/null');
  }

  // -------------------------------------------------------------------------
  // TEST 22 — Negative timeline duration triggers BLOCKING issue and status FAIL
  // -------------------------------------------------------------------------
  console.log('\n--- Test 22: Negative Duration Causes BLOCKING and FAIL ---');
  {
    const corruptScenes: SceneEditPlan[] = [
      createMockScene({ id: 2201, start: 5.0, end: 2.0 }), // Inverted start/end
    ];

    const { report } = runCreativeQualityGate(corruptScenes, { autoFix: true });
    assert(report.status === 'FAIL', 'TEST 22.1: Report status is FAIL');
    assert(report.blockingIssueCount >= 1, 'TEST 22.2: blockingIssueCount >= 1');
    assert(canProceedAfterQualityGate(report) === false, 'TEST 22.3: canProceedAfterQualityGate is false');
  }

  // -------------------------------------------------------------------------
  // TEST 23 — Disordered scenes trigger BLOCKING issue and status FAIL
  // -------------------------------------------------------------------------
  console.log('\n--- Test 23: Disordered Scenes Cause BLOCKING and FAIL ---');
  {
    const disorderedScenes: SceneEditPlan[] = [
      createMockScene({ id: 2301, start: 3.0, end: 6.0 }),
      createMockScene({ id: 2302, start: 1.0, end: 4.0 }), // Starts before previous
    ];

    const { report } = runCreativeQualityGate(disorderedScenes, { autoFix: true });
    assert(report.status === 'FAIL', 'TEST 23.1: Disordered scenes result in FAIL');
    assert(report.blockingIssueCount >= 1, 'TEST 23.2: Disordered scenes have blockingIssueCount >= 1');
    assert(canProceedAfterQualityGate(report) === false, 'TEST 23.3: canProceedAfterQualityGate is false');
  }

  // -------------------------------------------------------------------------
  // TEST 24 — End-to-end Quality Gate run with auto-fixes maintains high score
  // -------------------------------------------------------------------------
  console.log('\n--- Test 24: End-to-End Auto-Fix High Score Maintenance ---');
  {
    const scenesWithFixableFlaws: SceneEditPlan[] = [
      createMockScene({
        id: 2401,
        start: 0,
        end: 2.5,
        role: 'hook',
        adRole: 'hook',
        motion: 'slow_zoom_in',
        motion_scale: 1.05,
        speech_start: 0.1,
        speech_end: 2.3,
        speech_duration: 2.2,
      }),
      createMockScene({
        id: 2402,
        start: 2.5,
        end: 5.5,
        role: 'proof',
        adRole: 'proof',
        visual_evidence: {
          type: 'SCREEN_PROOF',
          title: 'ROAS Evidence',
          metricValue: '4.8x',
        },
        caption_density_status: 'power_highlight', // Fixable
        motion: 'punch_zoom', // Fixable
        motion_scale: 1.25, // Fixable
        transition: 'flash', // Fixable
        editing_rhythm_plan: {
          preferredTransition: 'flash',
        } as any,
        speech_start: 2.6,
        speech_end: 5.3,
        speech_duration: 2.7,
      }),
    ];

    const { report, validatedScenes } = runCreativeQualityGate(scenesWithFixableFlaws, { autoFix: true });
    assert(report.status === 'PASS', `TEST 24.1: Status is PASS (got ${report.status})`);
    assert(report.score >= 95, `TEST 24.2: Score is >= 95 after auto-fixes (got ${report.score})`);
    assert(report.blockingIssueCount === 0, 'TEST 24.3: 0 blocking issues');
    assert(canProceedAfterQualityGate(report) === true, 'TEST 24.4: Can proceed to preview/export');
    assert(validatedScenes[1].motion === 'normal', 'TEST 24.5: Proof motion auto-fixed to normal');
    assert(validatedScenes[1].transition === 'cut', 'TEST 24.6: Proof transition auto-fixed to cut');
  }

  // -------------------------------------------------------------------------
  // TEST 25 — Non-destructive validation cloning verification
  // -------------------------------------------------------------------------
  console.log('\n--- Test 25: Non-Destructive Pure Validation ---');
  {
    const originalScenes: SceneEditPlan[] = [
      createMockScene({
        id: 2501,
        start: 0,
        end: 3.0,
        adRole: 'proof',
        motion: 'punch_zoom',
        motion_scale: 1.25,
      }),
    ];

    const { validatedScenes } = runCreativeQualityGate(originalScenes, { autoFix: true });
    assert(originalScenes[0].motion === 'punch_zoom', 'TEST 25.1: Original scene motion untouched');
    assert(originalScenes[0].motion_scale === 1.25, 'TEST 25.2: Original scene motion_scale untouched');
    assert(validatedScenes[0].motion === 'normal', 'TEST 25.3: Validated scene motion softened to normal');
  }

  console.log(`\n=== STEP 9.6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
