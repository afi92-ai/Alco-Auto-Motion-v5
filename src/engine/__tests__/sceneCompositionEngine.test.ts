import {
  evaluateSceneComposition,
  applyAttentionBudget,
  evaluateProjectComposition,
  isHookFocalLockActive,
  SceneCompositionProfile,
} from '../sceneCompositionEngine';
import { SceneEditPlan, UserProofAsset } from '../../types';

function runTests() {
  console.log('=== RUNNING SCENE COMPOSITION & ATTENTION HIERARCHY TEST SUITE (Step 9.4B) ===\n');

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

  // TEST 1 — HOOK
  {
    const hookScene: Partial<SceneEditPlan> = {
      id: 0,
      role: 'hook',
      adRole: 'hook',
      start: 0,
      end: 3.2,
      caption: 'Stop scroll! Ini rahasia raih 10x ROAS Meta Ads.',
      headline: 'RAHASIA 10X ROAS',
      hookText: 'RAHASIA 10X ROAS',
      talking_head_framing: {
        is_talking_head: true,
        confidence: 0.95,
        face_center: { x: 50, y: 35 },
        framing_mode: 'medium_talking_head',
        protection_status: 'EYELINE_LOCKED',
        eyeline_y_percent: 35,
        headroom_percent: 14,
        smart_reframe_scale: 1.18,
        crop_shift_offset: { x: 0, y: 0 },
        note: 'Hook presenter locked',
      },
      motion: 'punch_zoom',
      motion_scale: 1.28,
    };

    const profile = evaluateSceneComposition(hookScene, { index: 0, totalScenes: 5 });

    assert(profile.primaryAttention === 'HOOK_PATTERN_INTERRUPT', 'TEST 1.1 — Hook Primary is Pattern Interrupt');
    assert(profile.secondaryAttention === 'UPPER_HEADLINE', 'TEST 1.2 — Hook Secondary is Upper Headline');
    assert(profile.captionPriority === 'SUPPORT', 'TEST 1.3 — Hook Caption Priority is Support');
    assert(profile.hookFocalLockActive === true, 'TEST 1.4 — Hook Focal Lock Active is true');
    assert(profile.hookFocalLockDurationSec === 1.2, 'TEST 1.5 — Hook Focal Lock Duration is 1.2s');
    assert(profile.suppressedElements.includes('DECORATIVE_MOTION_GRAPHICS'), 'TEST 1.6 — Suppressed decorative motion in hook');
    assert(profile.suppressedElements.includes('SECONDARY_CARDS_IN_HOOK_WINDOW'), 'TEST 1.7 — Suppressed secondary cards in opening hook window');
    assert(isHookFocalLockActive(0.5, 0, profile) === true, 'TEST 1.8 — Focal Lock is active at t=0.5s');
    assert(isHookFocalLockActive(1.5, 0, profile) === false, 'TEST 1.9 — Focal Lock released at t=1.5s');
  }

  // TEST 2 — PROBLEM
  {
    const problemScene: Partial<SceneEditPlan> = {
      id: 1,
      role: 'problem',
      adRole: 'problem',
      start: 3.2,
      end: 7.0,
      caption: 'Banyak advertiser bakar uang jutaan tapi boncos parah tiap hari.',
      talking_head_framing: {
        is_talking_head: true,
        confidence: 0.92,
        face_center: { x: 50, y: 26 },
        framing_mode: 'close_up_impact',
        protection_status: 'FACE_SAFEGUARDED',
        eyeline_y_percent: 26,
        headroom_percent: 10,
        smart_reframe_scale: 1.25,
        crop_shift_offset: { x: 0, y: 0 },
        note: 'Problem emotional close up',
      },
    };

    const profile = evaluateSceneComposition(problemScene, { index: 1, totalScenes: 5 });

    assert(profile.primaryAttention === 'TALENT_TALKING_HEAD', 'TEST 2.1 — Problem Primary is Presenter Emotional Delivery');
    assert(profile.secondaryAttention === 'PROBLEM_STATEMENT', 'TEST 2.2 — Problem Secondary is Problem Statement');
    assert(profile.suppressedElements.includes('DECORATIVE_MOTION_GRAPHICS'), 'TEST 2.3 — Problem suppresses decorative motion');
    assert(profile.suppressedElements.includes('GENERIC_BROLL'), 'TEST 2.4 — Problem suppresses generic B-roll');
    assert(profile.captionTreatment === 'NORMAL', 'TEST 2.5 — Problem caption treatment is NORMAL');
  }

  // TEST 3 — SOLUTION WITH DEMO
  {
    const demoAsset: UserProofAsset = {
      id: 'demo_1',
      name: 'System Workflow Demo',
      url: 'blob:http://localhost:3000/demo.png',
      type: 'product',
      label: 'Live Platform Workflow',
    };

    const solutionScene: Partial<SceneEditPlan> = {
      id: 2,
      role: 'solution',
      adRole: 'solution',
      start: 7.0,
      end: 11.5,
      caption: 'Cukup input materi dan sistem ini otomatis generate creative visual.',
      visual_evidence: {
        type: 'SCREEN_DEMO',
        title: 'AUTOMATED CREATIVE ENGINE',
        badgeTag: 'LIVE SYSTEM DEMO',
        calloutPoint: 'Instant AI Generation',
      },
    };

    const profile = evaluateSceneComposition(solutionScene, {
      availableUserAssets: [demoAsset],
      index: 2,
      totalScenes: 5,
    });

    assert(profile.primaryAttention === 'PRODUCT_DEMO', 'TEST 3.1 — Solution with Demo Primary is PRODUCT_DEMO');
    assert(profile.secondaryAttention === 'KEY_BENEFIT', 'TEST 3.2 — Solution Secondary is KEY_BENEFIT');
    assert(profile.evidencePriority === 'PRIMARY', 'TEST 3.3 — Evidence Priority is PRIMARY');
    assert(profile.captionTreatment === 'COMPACT', 'TEST 3.4 — Caption Treatment is COMPACT for demo');
    assert(profile.suppressedElements.includes('DECORATIVE_MOTION_GRAPHICS'), 'TEST 3.5 — Decorative motion suppressed during demo');
  }

  // TEST 4 — SOLUTION WITHOUT DEMO
  {
    const solutionSceneNoDemo: Partial<SceneEditPlan> = {
      id: 2,
      role: 'solution',
      adRole: 'solution',
      start: 7.0,
      end: 11.5,
      caption: 'Solusinya adalah pendekatan funnel terstruktur dan copy presisi.',
      talking_head_framing: {
        is_talking_head: true,
        confidence: 0.90,
        face_center: { x: 50, y: 34 },
        framing_mode: 'medium_talking_head',
        protection_status: 'FACE_SAFEGUARDED',
        eyeline_y_percent: 34,
        headroom_percent: 13,
        smart_reframe_scale: 1.15,
        crop_shift_offset: { x: 0, y: 0 },
        note: 'Solution talking head',
      },
    };

    const profile = evaluateSceneComposition(solutionSceneNoDemo, {
      availableUserAssets: [],
      index: 2,
      totalScenes: 5,
    });

    assert(profile.primaryAttention === 'TALENT_TALKING_HEAD', 'TEST 4.1 — Solution without Demo Primary falls back to TALENT_TALKING_HEAD');
    assert(profile.secondaryAttention === 'SOLUTION_HEADLINE', 'TEST 4.2 — Secondary is SOLUTION_HEADLINE');
    assert(profile.primaryAttention !== undefined, 'TEST 4.3 — Primary attention is never empty');
    assert(profile.captionTreatment === 'NORMAL', 'TEST 4.4 — Caption treatment is NORMAL');
  }

  // TEST 5 — PROOF WITH DASHBOARD
  {
    const proofAsset: UserProofAsset = {
      id: 'proof_1',
      name: 'Meta Ads Manager ROAS',
      url: 'blob:http://localhost:3000/proof.png',
      type: 'dashboard',
      label: 'Verified 5.4x ROAS Dashboard',
    };

    const proofScene: Partial<SceneEditPlan> = {
      id: 3,
      role: 'proof',
      adRole: 'proof',
      start: 11.5,
      end: 16.0,
      caption: 'Ini dashboard real akun klien kami tembus ROAS 5.4x dalam 14 hari.',
      visual_evidence: {
        type: 'SCREEN_PROOF',
        title: 'ADS MANAGER RESULT',
        metricValue: '5.4x ROAS',
        badgeTag: 'VERIFIED PROOF',
      },
      broll: {
        query: 'happy person smiling',
        visual_intent: 'proof',
        sourceUrl: 'blob:http://localhost:3000/stock.jpg',
      },
    };

    const profile = evaluateSceneComposition(proofScene, {
      availableUserAssets: [proofAsset],
      index: 3,
      totalScenes: 5,
    });

    assert(profile.primaryAttention === 'EVIDENCE_DASHBOARD', 'TEST 5.1 — Proof with Dashboard Primary is EVIDENCE_DASHBOARD');
    assert(profile.secondaryAttention === 'KEY_METRIC_CLAIM', 'TEST 5.2 — Secondary is KEY_METRIC_CLAIM');
    assert(profile.evidencePriority === 'PRIMARY', 'TEST 5.3 — Evidence Priority is PRIMARY');
    assert(profile.brollPriority === 'SUPPRESSED', 'TEST 5.4 — Generic B-roll Priority is SUPPRESSED');
    assert(profile.captionTreatment === 'SUBDUED', 'TEST 5.5 — Caption Treatment is SUBDUED during proof');
    assert(profile.suppressedElements.includes('GENERIC_BROLL'), 'TEST 5.6 — Generic B-roll is in suppressed list');
    assert(profile.suppressedElements.includes('EXCESSIVE_CAPTION_HIGHLIGHTS'), 'TEST 5.7 — Excessive caption highlights suppressed');
  }

  // TEST 6 — PROOF WITHOUT ASSET
  {
    const proofSceneNoAsset: Partial<SceneEditPlan> = {
      id: 3,
      role: 'proof',
      adRole: 'proof',
      start: 11.5,
      end: 16.0,
      caption: 'Kenaikan profit bersih tercatat 340 persen dalam 1 bulan.',
      brollFormat: 'data_card',
      visualDecision: 'SCREENSHOT',
    };

    const profile = evaluateSceneComposition(proofSceneNoAsset, {
      availableUserAssets: [],
      index: 3,
      totalScenes: 5,
    });

    assert(profile.primaryAttention === 'DATA_CARD_FALLBACK', 'TEST 6.1 — Proof without Screenshot falls back to DATA_CARD_FALLBACK');
    assert(profile.secondaryAttention === 'KEY_METRIC_CLAIM', 'TEST 6.2 — Secondary is KEY_METRIC_CLAIM');
    assert(profile.captionTreatment === 'COMPACT', 'TEST 6.3 — Caption Treatment is COMPACT');
  }

  // TEST 7 — OFFER
  {
    const offerScene: Partial<SceneEditPlan> = {
      id: 4,
      role: 'cta',
      adRole: 'offer',
      start: 16.0,
      end: 20.5,
      caption: 'Dapatkan diskon 50 persen plus full lifetime update sekarang juga.',
      visual_evidence: {
        type: 'OFFER_CARD',
        title: 'LIMITED ACCESS OFFER',
        metricValue: 'DISKON 50%',
        subtitle: 'Lifetime Free Updates Included',
      },
    };

    const profile = evaluateSceneComposition(offerScene, { index: 4, totalScenes: 6 });

    assert(profile.primaryAttention === 'OFFER_VALUE_STACK', 'TEST 7.1 — Offer Primary is OFFER_VALUE_STACK');
    assert(profile.secondaryAttention === 'MAIN_BENEFIT_ANCHOR', 'TEST 7.2 — Secondary is MAIN_BENEFIT_ANCHOR');
    assert(profile.captionTreatment === 'MINIMAL', 'TEST 7.3 — Caption Treatment is MINIMAL');
    assert(profile.headlineTreatment === 'SUPPRESSED', 'TEST 7.4 — Headline is SUPPRESSED during offer');
    assert(profile.suppressedElements.includes('GENERIC_BROLL'), 'TEST 7.5 — Generic B-roll suppressed in offer');
  }

  // TEST 8 — CTA
  {
    const ctaScene: Partial<SceneEditPlan> = {
      id: 5,
      role: 'cta',
      adRole: 'cta',
      start: 20.5,
      end: 24.0,
      caption: 'Klik tombol di bawah dan daftar sebelum kuota ditutup malam ini.',
      visual_evidence: {
        type: 'CTA_CARD',
        title: 'KLIK LINK DI BIO',
        badgeTag: 'EXCLUSIVE SLOTS',
      },
      headline: 'DAFTAR SEKARANG',
    };

    const profile = evaluateSceneComposition(ctaScene, { index: 5, totalScenes: 6 });

    assert(profile.primaryAttention === 'CTA_ACTION_BADGE', 'TEST 8.1 — CTA Primary is CTA_ACTION_BADGE');
    assert(profile.secondaryAttention === 'OFFER_REMINDER', 'TEST 8.2 — Secondary is OFFER_REMINDER');
    assert(profile.captionTreatment === 'MINIMAL', 'TEST 8.3 — Caption Treatment is MINIMAL');
    assert(profile.headlineTreatment === 'SUPPRESSED', 'TEST 8.4 — Headline is SUPPRESSED on CTA');
    assert(profile.suppressedElements.includes('UPPER_HEADLINE'), 'TEST 8.5 — Upper headline suppressed on CTA');
    assert(profile.suppressedElements.includes('DECORATIVE_MOTION_GRAPHICS'), 'TEST 8.6 — Decorative motion suppressed on CTA');
  }

  // TEST 9 — ATTENTION BUDGET
  {
    const mockProfile: SceneCompositionProfile = {
      primaryAttention: 'HOOK_PATTERN_INTERRUPT',
      secondaryAttention: 'UPPER_HEADLINE',
      supportingElements: ['CAPTION_NORMAL', 'SUBTLE_MOTION', 'BACKGROUND_AROUND_TALENT'],
      suppressedElements: [],
      captionPriority: 'SUPPORT',
      headlinePriority: 'SECONDARY',
      evidencePriority: 'SUPPRESSED',
      brollPriority: 'SUPPRESSED',
      talkingHeadPriority: 'SECONDARY',
      maxVisualLayers: 4,
      compositionDensity: 'RICH',
      captionTreatment: 'NORMAL',
      headlineTreatment: 'SHOW',
      hookFocalLockActive: false,
      hookFocalLockDurationSec: 0,
      reason: 'Test budget constraints',
    };

    const budgeted = applyAttentionBudget(mockProfile);

    assert(budgeted.supportingElements.length <= 2, 'TEST 9.1 — Supporting elements capped at budget');
    assert(budgeted.maxVisualLayers <= 3, 'TEST 9.2 — Max visual layers capped at 3');
  }

  // TEST 10 — PREVIEW / MP4 DETERMINISTIC PARITY
  {
    const scenes: Partial<SceneEditPlan>[] = [
      { id: 0, role: 'hook', adRole: 'hook', start: 0, end: 3, caption: 'Hook caption' },
      { id: 1, role: 'problem', adRole: 'problem', start: 3, end: 7, caption: 'Problem caption' },
      { id: 2, role: 'proof', adRole: 'proof', start: 7, end: 11, caption: 'Proof caption' },
      { id: 3, role: 'cta', adRole: 'cta', start: 11, end: 15, caption: 'CTA caption' },
    ];

    const profiles1 = evaluateProjectComposition(scenes);
    const profiles2 = evaluateProjectComposition(scenes);

    assert(JSON.stringify(profiles1) === JSON.stringify(profiles2), 'TEST 10.1 — 100% Deterministic profiles output');
    assert(profiles1[0].primaryAttention === 'HOOK_PATTERN_INTERRUPT', 'TEST 10.2 — Scene 0 is Hook Pattern Interrupt');
    assert(profiles1[1].primaryAttention === 'TALENT_TALKING_HEAD', 'TEST 10.3 — Scene 1 is Presenter');
    assert(profiles1[2].primaryAttention === 'DATA_CARD_FALLBACK', 'TEST 10.4 — Scene 2 is Proof Data Card');
    assert(profiles1[3].primaryAttention === 'CTA_ACTION_BADGE', 'TEST 10.5 — Scene 3 is CTA Action Badge');
  }

  console.log(`\n=== SCENE COMPOSITION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
