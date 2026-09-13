import { directVisualEvidence } from '../visualEvidenceDirector';
import { matchAssetForScene } from '../assetMatcher';
import { evaluateSceneComposition } from '../sceneCompositionEngine';
import { calculateEditingRhythmPlan } from '../editingRhythmEngine';
import { UserProofAsset, SceneEditPlan } from '../../types';

function runTests() {
  console.log('=== RUNNING VISUAL EVIDENCE DIRECTOR TEST SUITE (ALCO AUTO MOTION V5) ===');

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
  // 1. DIRECT EVIDENCE DETECTION: METRIC & PROOF SCENE
  // -------------------------------------------------------------------------
  const metricDirective = directVisualEvidence({
    transcript: 'CTR iklan ini tembus 4.2% dan ROAS melonjak sampai 5.8x lipat',
    role: 'proof',
    adRole: 'proof',
    index: 2,
    totalScenes: 5,
  });

  assert(metricDirective.visualPurpose === 'PROOF', 'Metric scene visualPurpose is PROOF', `Got: ${metricDirective.visualPurpose}`);
  assert(metricDirective.preferredVisual === 'METRIC', 'Metric scene preferredVisual is METRIC', `Got: ${metricDirective.preferredVisual}`);
  assert(metricDirective.genericBrollAllowed === false, 'Metric scene genericBrollAllowed is false', `Got: ${metricDirective.genericBrollAllowed}`);
  assert(metricDirective.motionIntent === 'HOLD_AND_HIGHLIGHT', 'Metric scene motionIntent is HOLD_AND_HIGHLIGHT', `Got: ${metricDirective.motionIntent}`);
  assert(Boolean(metricDirective.requiredEvidence), 'Metric scene requiredEvidence is extracted', `Got: ${metricDirective.requiredEvidence}`);

  // -------------------------------------------------------------------------
  // 2. DIRECT EVIDENCE DETECTION: UI & WORKFLOW DEMO
  // -------------------------------------------------------------------------
  const uiDemoDirective = directVisualEvidence({
    transcript: 'Buka dashboard lalu klik menu campaign dan buat adset baru di software ini',
    role: 'solution',
    adRole: 'demo',
    index: 3,
    totalScenes: 5,
  });

  assert(uiDemoDirective.visualPurpose === 'DEMO', 'UI Demo scene visualPurpose is DEMO', `Got: ${uiDemoDirective.visualPurpose}`);
  assert(uiDemoDirective.preferredVisual === 'UI_DEMO', 'UI Demo scene preferredVisual is UI_DEMO', `Got: ${uiDemoDirective.preferredVisual}`);
  assert(uiDemoDirective.genericBrollAllowed === false, 'UI Demo scene genericBrollAllowed is false', `Got: ${uiDemoDirective.genericBrollAllowed}`);
  assert(uiDemoDirective.motionIntent === 'HOLD', 'UI Demo scene motionIntent is HOLD', `Got: ${uiDemoDirective.motionIntent}`);

  // -------------------------------------------------------------------------
  // 3. DIRECT EVIDENCE DETECTION: OFFER & VALUE STACK
  // -------------------------------------------------------------------------
  const offerDirective = directVisualEvidence({
    transcript: 'Dapatkan diskon promo 50% plus bonus template senilai 1 juta rupiah',
    role: 'cta',
    adRole: 'offer',
    index: 4,
    totalScenes: 6,
  });

  assert(offerDirective.visualPurpose === 'OFFER', 'Offer scene visualPurpose is OFFER', `Got: ${offerDirective.visualPurpose}`);
  assert(offerDirective.genericBrollAllowed === false, 'Offer scene genericBrollAllowed is false', `Got: ${offerDirective.genericBrollAllowed}`);

  // -------------------------------------------------------------------------
  // 4. DIRECT EVIDENCE DETECTION: CTA SCENE
  // -------------------------------------------------------------------------
  const ctaDirective = directVisualEvidence({
    transcript: 'Klik link di bawah sekarang juga untuk amankan slot Anda hari ini',
    role: 'cta',
    adRole: 'cta',
    index: 5,
    totalScenes: 6,
  });

  assert(ctaDirective.visualPurpose === 'CTA', 'CTA scene visualPurpose is CTA', `Got: ${ctaDirective.visualPurpose}`);
  assert(ctaDirective.genericBrollAllowed === false, 'CTA scene genericBrollAllowed is false', `Got: ${ctaDirective.genericBrollAllowed}`);

  // -------------------------------------------------------------------------
  // 5. DIRECT EVIDENCE DETECTION: EMOTION & PAIN POINT
  // -------------------------------------------------------------------------
  const emotionDirective = directVisualEvidence({
    transcript: 'Capek banget tiap malam kepikiran omset drop dan boncos terus-terusan',
    role: 'problem',
    adRole: 'problem',
    index: 1,
    totalScenes: 5,
  });

  assert(emotionDirective.visualPurpose === 'EMOTION', 'Problem scene visualPurpose is EMOTION', `Got: ${emotionDirective.visualPurpose}`);
  assert(emotionDirective.preferredVisual === 'PERSON', 'Problem scene preferredVisual is PERSON', `Got: ${emotionDirective.preferredVisual}`);

  // -------------------------------------------------------------------------
  // 6. ASSET MATCHER INTEGRATION: REJECTION OF GENERIC B-ROLL WHEN DISALLOWED
  // -------------------------------------------------------------------------
  const mockAssets: UserProofAsset[] = [
    {
      id: 'unrelated-broll-1',
      name: 'Pemandangan Sunset Pantai Bali',
      label: 'Nature Landscape',
      type: 'product',
      url: 'https://example.com/nature.mp4',
    },
    {
      id: 'metric-dashboard-1',
      name: 'Screenshot ROAS & CTR Dashboard',
      label: 'Meta Ads Manager CTR 4.2%',
      type: 'dashboard',
      url: 'https://example.com/roas-dashboard.png',
    },
  ];

  // When directive has genericBrollAllowed = false, specific dashboard asset wins cleanly
  const proofMatchResult = matchAssetForScene(
    {
      transcript: 'CTR iklan tembus 4.2% dan ROAS naik tinggi',
      role: 'proof',
      sceneIndex: 2,
      directive: metricDirective,
    },
    mockAssets
  );

  assert(proofMatchResult.asset?.id === 'metric-dashboard-1', 'Evidence-specific dashboard asset selected over generic B-roll');
  assert(proofMatchResult.score >= 0.50, 'Matched asset has high relevance score (>0.50)');

  // When ONLY generic unrelated assets exist for a strict proof scene, generic B-roll is rejected
  const rejectedMatchResult = matchAssetForScene(
    {
      transcript: 'CTR iklan tembus 4.2% dan ROAS naik tinggi',
      role: 'proof',
      sceneIndex: 2,
      directive: metricDirective,
    },
    [mockAssets[0]] // only sunset nature video provided
  );

  assert(rejectedMatchResult.asset === null, 'Generic B-roll rejected when genericBrollAllowed is false');
  assert(
    rejectedMatchResult.reason.includes('Generic asset') ||
    rejectedMatchResult.reason.includes('rejected') ||
    rejectedMatchResult.reason.includes('below threshold'),
    'Rejection rationale recorded clearly'
  );

  // -------------------------------------------------------------------------
  // 7. SCENE COMPOSITION INTEGRATION: METRIC DIRECTIVE ENFORCEMENT
  // -------------------------------------------------------------------------
  const proofScenePlan: Partial<SceneEditPlan> = {
    id: 3,
    role: 'proof',
    adRole: 'proof',
    caption: 'CTR iklan tembus 4.2% dengan ROAS 5.8x lipat',
    visual_evidence_directive: metricDirective,
  };

  const compProfile = evaluateSceneComposition(proofScenePlan, {
    index: 2,
    totalScenes: 5,
    availableUserAssets: mockAssets,
  });

  assert(compProfile.evidencePriority === 'PRIMARY', 'Composition evidencePriority is PRIMARY for METRIC directive');
  assert(compProfile.suppressedElements.includes('GENERIC_BROLL'), 'GENERIC_BROLL is suppressed when genericBrollAllowed is false');

  // -------------------------------------------------------------------------
  // 8. EDITING RHYTHM INTEGRATION: HOLD_AND_HIGHLIGHT ENFORCEMENT
  // -------------------------------------------------------------------------
  const fullScenePlan = {
    id: 3,
    start: 5.0,
    end: 8.5,
    speech_start: 5.0,
    speech_end: 8.5,
    speech_duration: 3.5,
    role: 'proof',
    adRole: 'proof',
    caption: 'CTR iklan tembus 4.2% dengan ROAS 5.8x lipat',
    motion: 'normal',
    transition: 'cut',
    visual_evidence_directive: metricDirective,
    composition_profile: compProfile,
  } as unknown as SceneEditPlan;

  const rhythmPlan = calculateEditingRhythmPlan({
    scene: fullScenePlan,
    index: 2,
    totalScenes: 5,
    compositionProfile: compProfile,
  });

  assert(rhythmPlan.readabilityPriority === 'CRITICAL', 'Rhythm readabilityPriority is CRITICAL for HOLD_AND_HIGHLIGHT');
  assert(rhythmPlan.refreshStrategy === 'EVIDENCE_HOLD', 'Rhythm refreshStrategy is EVIDENCE_HOLD');
  assert(rhythmPlan.minimumReadableDurationMs >= 2200, 'Minimum readable duration is at least 2200ms for metric evidence');

  console.log(`=== VED TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

runTests();
