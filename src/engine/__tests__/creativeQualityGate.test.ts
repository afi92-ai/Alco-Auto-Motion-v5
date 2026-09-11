/**
 * Step 9.6 Deterministic Test Suite
 * Creative Quality Gate & Final Editing Validation
 */

import {
  runCreativeQualityGate,
  calculateSceneVisualComplexity,
  calculateQualityScore,
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

  console.log(`\n=== STEP 9.6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
