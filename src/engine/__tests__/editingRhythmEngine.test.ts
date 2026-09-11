/**
 * Step 9.5B Deterministic Test Suite
 * Editing Rhythm Engine & Meta Ads Attention Pacing
 */

import {
  calculateEditingRhythmPlan,
  calculateMinimumReadableDurationMs,
  classifySpeechDensity,
  calculateWordsPerSecond,
} from '../editingRhythmEngine';
import { SceneEditPlan } from '../../types';
import { evaluateSceneComposition } from '../sceneCompositionEngine';

function runTests() {
  console.log('=== RUNNING STEP 9.5B EDITING RHYTHM ENGINE TEST SUITE ===');
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
  // TEST 1 — Hook (0-3s opening window)
  // Expected: FAST, high initial motion, focal lock respected
  // -------------------------------------------------------------------------
  const hookScene: SceneEditPlan = {
    id: 1,
    start: 0,
    end: 2.2,
    role: 'hook',
    adRole: 'hook',
    caption: 'Stop scrolling! Simak rahasia ini sekarang.', // 5 words in 2.2s = 2.27 WPS (NORMAL)
    motion: 'punch_zoom',
    motion_scale: 1.25,
    transition: 'flash',
    sound_effect: 'whoosh',
    scores: { emotional: 80, clarity: 90, energy: 90, pacing: 90, retention: 95, importance: 9 } as any,
    camera_dynamics: { type: 'punch_zoom', zoomSpeed: 'fast', focalPoint: 'speaker_eyes' } as any,
    broll: null,
    visual_intent: 'talking_head_focus' as any,
    caption_style: 'minimal' as any,
    caption_grammar: 'hook_punch' as any,
    caption_mode: 'word_by_word' as any,
    highlight_words: ['Stop', 'rahasia'],
  } as any;
  const hookComp = evaluateSceneComposition(hookScene, { index: 0, totalScenes: 5 });
  const hookPlan = calculateEditingRhythmPlan({
    scene: hookScene,
    index: 0,
    totalScenes: 5,
    compositionProfile: hookComp,
    contentType: 'meta_ads',
  });

  assert(hookPlan.paceLevel === 'FAST', 'TEST 1.1 — Hook paceLevel is FAST');
  assert(hookPlan.motionBudget === 'HIGH', 'TEST 1.2 — Hook motionBudget is HIGH');
  assert(hookPlan.targetVisualIntervalMs >= 900 && hookPlan.targetVisualIntervalMs <= 1400, 'TEST 1.3 — Hook targetVisualInterval is 900–1400ms');
  assert(hookPlan.allowMidSceneRefresh === false, 'TEST 1.4 — Hook mid-scene refresh is false (Focal Lock protected)');
  assert(hookPlan.preserveCompositionFocus === true, 'TEST 1.5 — Hook preserves composition focus');

  // -------------------------------------------------------------------------
  // TEST 2 — Dense Hook Speech
  // Expected: Motion/cadence reduced appropriately
  // -------------------------------------------------------------------------
  const denseHookScene: SceneEditPlan = {
    ...hookScene,
    end: 1.8,
    speech_duration: 1.8,
    caption: 'Ini adalah rahasia paling penting yang harus kalian ketahui sekarang juga sebelum terlambat', // 13 words in 1.8s = 7.2 WPS (DENSE)
  };
  const denseHookPlan = calculateEditingRhythmPlan({
    scene: denseHookScene,
    index: 0,
    totalScenes: 5,
    compositionProfile: hookComp,
    contentType: 'meta_ads',
  });

  assert(denseHookPlan.speechDensityLevel === 'DENSE', 'TEST 2.1 — Dense speech correctly classified as DENSE');
  assert(denseHookPlan.motionBudget === 'MEDIUM', 'TEST 2.2 — Dense hook throttles motionBudget to MEDIUM');
  assert(denseHookPlan.targetVisualIntervalMs >= 1300, 'TEST 2.3 — Dense hook widens visual interval for caption reading');

  // -------------------------------------------------------------------------
  // TEST 3 — Problem 7s Talking Head Monologue
  // Expected: Mid-scene refresh allowed, SUBTLE_REFRAME/CROP_SHIFT, no hard-cut slicing
  // -------------------------------------------------------------------------
  const problemScene: SceneEditPlan = {
    id: 2,
    start: 2.2,
    end: 8.7,
    speech_duration: 6.5,
    role: 'problem',
    adRole: 'problem',
    caption: 'Banyak pemilik bisnis terjebak menyalahkan algoritma, padahal masalahnya ada pada creative hook video yang membosankan dan tidak terarah sama sekali.', // 18 words / 6.5s = 2.77 WPS (NORMAL)
    motion: 'slow_zoom_in',
    motion_scale: 1.10,
    transition: 'cut',
    sound_effect: 'none',
    scores: { emotional: 88, clarity: 85, energy: 75, pacing: 70, retention: 80, importance: 8 } as any,
    camera_dynamics: { type: 'slow_zoom_in', zoomSpeed: 'slow', focalPoint: 'center' } as any,
    broll: null,
    visual_intent: 'talking_head_focus' as any,
    caption_style: 'minimal' as any,
    caption_grammar: 'balanced_statement' as any,
    caption_mode: 'sentence_flow' as any,
    highlight_words: ['menyalahkan', 'creative hook'],
  } as any;
  const problemComp = evaluateSceneComposition(problemScene, { index: 1, totalScenes: 5 });
  const problemPlan = calculateEditingRhythmPlan({
    scene: problemScene,
    index: 1,
    totalScenes: 5,
    compositionProfile: problemComp,
    contentType: 'meta_ads',
  });

  assert(problemPlan.paceLevel === 'MEDIUM', 'TEST 3.1 — Problem paceLevel is MEDIUM');
  assert(problemPlan.allowMidSceneRefresh === true, 'TEST 3.2 — 7s monologue allows mid-scene refresh');
  assert(
    problemPlan.refreshStrategy === 'SUBTLE_REFRAME' || problemPlan.refreshStrategy === 'CROP_SHIFT',
    'TEST 3.3 — Strategy is non-destructive SUBTLE_REFRAME or CROP_SHIFT'
  );
  assert(
    Array.isArray(problemPlan.midSceneRefreshPointsSec) && problemPlan.midSceneRefreshPointsSec.length === 2,
    'TEST 3.4 — 7s scene generates 2 safe refresh timing markers'
  );
  assert(problemPlan.preserveSpeechBoundary === true, 'TEST 3.5 — Preserves speech boundaries without audio cuts');

  // -------------------------------------------------------------------------
  // TEST 4 — Solution with Demo Asset
  // Expected: Controlled pacing, comprehension over speed
  // -------------------------------------------------------------------------
  const demoScene: SceneEditPlan = {
    id: 3,
    start: 9.2,
    end: 13.7,
    speech_duration: 4.5,
    role: 'solution',
    adRole: 'demo',
    visualDecision: 'PRODUCT_DEMO',
    caption: 'Cukup unggah rekaman mentah, lalu sistem otomatis memotong dan merender video vertikal berkinerja tinggi.',
    motion: 'pan_left' as any,
    motion_scale: 1.0,
    transition: 'cut',
    sound_effect: 'click',
    scores: { emotional: 70, clarity: 95, energy: 80, pacing: 80, retention: 85, importance: 9 } as any,
    camera_dynamics: { type: 'static', zoomSpeed: 'linear', focalPoint: 'center' } as any,
    broll: null,
    visual_evidence: {
      type: 'SCREEN_DEMO',
      title: 'Alco Auto Motion V5',
      subtitle: '1-Click Intelligent Timeline',
    },
    visual_intent: 'demonstration' as any,
    caption_style: 'minimal' as any,
    caption_grammar: 'balanced_statement' as any,
    caption_mode: 'sentence_flow' as any,
    highlight_words: ['otomatis', 'vertikal'],
  } as any;
  const demoComp = evaluateSceneComposition(demoScene, { index: 2, totalScenes: 5 });
  const demoPlan = calculateEditingRhythmPlan({
    scene: demoScene,
    index: 2,
    totalScenes: 5,
    compositionProfile: demoComp,
    contentType: 'meta_ads',
  });

  assert(demoPlan.paceLevel === 'CONTROLLED', 'TEST 4.1 — Demo paceLevel is CONTROLLED');
  assert(demoPlan.readabilityPriority === 'HIGH', 'TEST 4.2 — Demo readabilityPriority is HIGH');
  assert(demoPlan.motionBudget === 'LOW', 'TEST 4.3 — Demo motionBudget is LOW');
  assert(demoPlan.refreshStrategy === 'EVIDENCE_HOLD', 'TEST 4.4 — Demo refreshStrategy is EVIDENCE_HOLD');

  // -------------------------------------------------------------------------
  // TEST 5 — Proof Dashboard
  // Expected: CRITICAL readability, EVIDENCE_HOLD, minimal motion
  // -------------------------------------------------------------------------
  const proofScene: SceneEditPlan = {
    id: 4,
    start: 12.7,
    end: 16.2,
    speech_duration: 3.5,
    role: 'proof',
    adRole: 'proof',
    visualDecision: 'SCREENSHOT',
    caption: 'Dan ini hasilnya: ROAS meningkat 5.4x dan omzet tembus 140 juta dalam 14 hari pertama.',
    motion: 'pan_right' as any,
    motion_scale: 1.0,
    transition: 'cut',
    sound_effect: 'data_blip',
    scores: { emotional: 80, clarity: 95, energy: 85, pacing: 80, retention: 90, importance: 10 } as any,
    camera_dynamics: { type: 'static', zoomSpeed: 'linear', focalPoint: 'center' } as any,
    broll: null,
    visual_evidence: {
      type: 'SCREEN_PROOF',
      title: '5.4x ROAS',
      subtitle: 'Rp 140.000.000 Omzet',
    },
    visual_intent: 'evidence_proof' as any,
    caption_style: 'minimal' as any,
    caption_grammar: 'balanced_statement' as any,
    caption_mode: 'sentence_flow' as any,
    highlight_words: ['5.4x', '140 juta'],
  } as any;
  const proofComp = evaluateSceneComposition(proofScene, { index: 3, totalScenes: 5 });
  const proofPlan = calculateEditingRhythmPlan({
    scene: proofScene,
    index: 3,
    totalScenes: 5,
    compositionProfile: proofComp,
    contentType: 'meta_ads',
  });

  assert(proofPlan.readabilityPriority === 'CRITICAL', 'TEST 5.1 — Proof readabilityPriority is CRITICAL');
  assert(proofPlan.refreshStrategy === 'EVIDENCE_HOLD', 'TEST 5.2 — Proof refreshStrategy is EVIDENCE_HOLD');
  assert(proofPlan.motionBudget === 'MINIMAL', 'TEST 5.3 — Proof motionBudget is MINIMAL');
  assert(proofPlan.allowMidSceneRefresh === false, 'TEST 5.4 — Mid-scene cutaway blocked during proof');

  // -------------------------------------------------------------------------
  // TEST 6 — Short Proof (1.0s source scene)
  // Expected: minimumReadableDuration > source duration, safe hold recommendation, NO audio extension
  // -------------------------------------------------------------------------
  const shortProofScene: SceneEditPlan = {
    ...proofScene,
    start: 12.7,
    end: 13.7,
    speech_duration: 1.0,
  };
  const shortProofPlan = calculateEditingRhythmPlan({
    scene: shortProofScene,
    index: 3,
    totalScenes: 5,
    compositionProfile: proofComp,
    contentType: 'meta_ads',
  });

  assert(shortProofPlan.minimumReadableDurationMs >= 2200, 'TEST 6.1 — Proof benchmark is >= 2200ms');
  assert(shortProofPlan.minimumReadableDurationMs > 1000, 'TEST 6.2 — Minimum readable duration > source duration (1.0s)');
  assert(shortProofPlan.requiresVisualHold === true, 'TEST 6.3 — Marked as requiresVisualHold');
  assert(shortProofPlan.preserveSpeechBoundary === true, 'TEST 6.4 — Audio timeline not artificially extended');

  // -------------------------------------------------------------------------
  // TEST 7 — Offer Scene
  // Expected: HIGH readability, price/value stack protected
  // -------------------------------------------------------------------------
  const offerScene: SceneEditPlan = {
    id: 5,
    start: 16.2,
    end: 19.5,
    speech_duration: 3.3,
    role: 'solution',
    adRole: 'offer',
    caption: 'Dapatkan diskon 50% khusus hari ini ditambah bonus 10 template iklan siap pakai.',
    motion: 'slow_zoom_in',
    motion_scale: 1.06,
    transition: 'cut',
    sound_effect: 'soft_impact',
    scores: { emotional: 85, clarity: 90, energy: 85, pacing: 75, retention: 85, importance: 9 } as any,
    camera_dynamics: { type: 'slow_zoom_in', zoomSpeed: 'linear', focalPoint: 'center' } as any,
    broll: null,
    visual_intent: 'talking_head_focus' as any,
    caption_style: 'minimal' as any,
    caption_grammar: 'balanced_statement' as any,
    caption_mode: 'sentence_flow' as any,
    highlight_words: ['diskon 50%', 'bonus 10 template'],
  } as any;
  const offerComp = evaluateSceneComposition(offerScene, { index: 4, totalScenes: 6 });
  const offerPlan = calculateEditingRhythmPlan({
    scene: offerScene,
    index: 4,
    totalScenes: 6,
    compositionProfile: offerComp,
    contentType: 'meta_ads',
  });

  assert(offerPlan.readabilityPriority === 'HIGH', 'TEST 7.1 — Offer readabilityPriority is HIGH');
  assert(offerPlan.paceLevel === 'CONTROLLED', 'TEST 7.2 — Offer paceLevel is CONTROLLED');
  assert(offerPlan.refreshStrategy === 'EVIDENCE_HOLD', 'TEST 7.3 — Offer refreshStrategy is EVIDENCE_HOLD');

  // -------------------------------------------------------------------------
  // TEST 8 — CTA Scene
  // Expected: STABLE, MINIMAL motion, focused action frame
  // -------------------------------------------------------------------------
  const ctaScene: SceneEditPlan = {
    id: 6,
    start: 19.5,
    end: 22.0,
    speech_duration: 2.5,
    role: 'cta',
    adRole: 'cta',
    caption: 'Klik tombol di bawah sekarang juga dan mulai uji coba gratis!',
    motion: 'punch_zoom',
    motion_scale: 1.15,
    transition: 'zoom_cut',
    sound_effect: 'downlifter',
    scores: { emotional: 80, clarity: 95, energy: 90, pacing: 85, retention: 90, importance: 10 } as any,
    camera_dynamics: { type: 'punch_zoom', zoomSpeed: 'instant', focalPoint: 'center' } as any,
    broll: null,
    visual_intent: 'brand_cta' as any,
    caption_style: 'minimal' as any,
    caption_grammar: 'cta_punch' as any,
    caption_mode: 'sentence_flow' as any,
    highlight_words: ['klik tombol', 'gratis'],
  } as any;
  const ctaComp = evaluateSceneComposition(ctaScene, { index: 5, totalScenes: 6 });
  const ctaPlan = calculateEditingRhythmPlan({
    scene: ctaScene,
    index: 5,
    totalScenes: 6,
    compositionProfile: ctaComp,
    contentType: 'meta_ads',
  });

  assert(ctaPlan.paceLevel === 'STABLE', 'TEST 8.1 — CTA paceLevel is STABLE');
  assert(ctaPlan.motionBudget === 'MINIMAL', 'TEST 8.2 — CTA motionBudget is MINIMAL');
  assert(ctaPlan.allowMidSceneRefresh === false, 'TEST 8.3 — CTA blocks mid-scene refreshes');

  // -------------------------------------------------------------------------
  // TEST 9 — Dense Speech (> 3.8 WPS)
  // Expected: Lower motion budget, longer visual interval
  // -------------------------------------------------------------------------
  const normalWps = calculateWordsPerSecond('Satu dua tiga empat lima', 2.0); // 2.5 WPS
  const denseWps = calculateWordsPerSecond('Satu dua tiga empat lima enam tujuh delapan sembilan sepuluh sebelas', 2.0); // 5.5 WPS
  assert(classifySpeechDensity(normalWps) === 'NORMAL', 'TEST 9.1 — 2.5 WPS is NORMAL');
  assert(classifySpeechDensity(denseWps) === 'DENSE', 'TEST 9.2 — 5.5 WPS is DENSE');

  // -------------------------------------------------------------------------
  // TEST 10 — Sparse Speech (< 2.2 WPS)
  // Expected: Visual refresh occurs more frequently
  // -------------------------------------------------------------------------
  const sparseWps = calculateWordsPerSecond('Halo semua', 2.5); // 0.8 WPS
  assert(classifySpeechDensity(sparseWps) === 'SPARSE', 'TEST 10.1 — 0.8 WPS is SPARSE');

  const sparseProblemPlan = calculateEditingRhythmPlan({
    scene: { ...problemScene, caption: 'Halo semua' },
    index: 1,
    totalScenes: 5,
    compositionProfile: problemComp,
    contentType: 'meta_ads',
  });
  assert(sparseProblemPlan.targetVisualIntervalMs < problemPlan.targetVisualIntervalMs, 'TEST 10.2 — Sparse speech tightens targetVisualIntervalMs');

  // -------------------------------------------------------------------------
  // TEST 11 — Step 9.4 Compatibility
  // Evidence primary cannot receive aggressive refresh
  // -------------------------------------------------------------------------
  assert(proofComp.evidencePriority === 'PRIMARY', 'TEST 11.1 — Proof attention hierarchy is EVIDENCE_DASHBOARD (PRIMARY)');
  assert(proofPlan.refreshStrategy === 'EVIDENCE_HOLD', 'TEST 11.2 — Rhythm strictly defaults to EVIDENCE_HOLD');
  assert(proofPlan.allowMidSceneRefresh === false, 'TEST 11.3 — Disruptive refresh blocked by Attention Hierarchy');

  // -------------------------------------------------------------------------
  // TEST 12 — Determinism
  // Same input always produces identical plan
  // -------------------------------------------------------------------------
  const planA = calculateEditingRhythmPlan({
    scene: problemScene,
    index: 1,
    totalScenes: 5,
    compositionProfile: problemComp,
    contentType: 'meta_ads',
  });
  const planB = calculateEditingRhythmPlan({
    scene: problemScene,
    index: 1,
    totalScenes: 5,
    compositionProfile: problemComp,
    contentType: 'meta_ads',
  });
  assert(JSON.stringify(planA) === JSON.stringify(planB), 'TEST 12.1 — 100% Deterministic output verified');

  console.log(`=== STEP 9.5B TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
