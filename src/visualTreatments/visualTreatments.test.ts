/**
 * ALCO Auto Motion - Visual Treatment Engine Hardening Tests
 * Deterministic test suite verifying all 12 extraction and routing safety scenarios.
 */

import {
  extractMetricContent,
  extractListItems,
  extractBeforeAfterContent,
  extractProcessSteps,
  extractTimelineContent,
  extractCtaContent,
  extractProductContent,
  extractClaimContent,
} from './contentExtractor';
import { routeVisualTreatment } from './router';
import { RouteTreatmentContext } from './types';

function createMockContext(overrides: Partial<RouteTreatmentContext> = {}): RouteTreatmentContext {
  return {
    role: 'explanation',
    duration: 2.8,
    transcript: '',
    visualPurpose: 'EXPLANATION',
    preferredVisual: 'NONE',
    motionIntent: 'HOLD',
    emphasisTarget: null,
    availableUserAssets: [],
    sceneIndex: 0,
    totalScenes: 4,
    resolution: {
      status: 'NO_EVIDENCE',
      resolvedAsset: null,
      confidence: 0,
      reason: 'No authentic asset',
    },
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`, detail || '');
    failed++;
  }
}

export function runVisualTreatmentTests() {
  console.log('--- RUNNING VISUAL TREATMENT HARDENING PASS TESTS ---');

  // Test 1: Valid metric growth extraction
  const metric1 = extractMetricContent('CTR kami naik dari 1% menjadi 3% dalam seminggu');
  assert(
    metric1.fromValue === '1%' &&
      metric1.toValue === '3%' &&
      metric1.multiplier === '+200%' &&
      metric1.isPercentageGrowth === true &&
      metric1.confidence >= 0.8,
    'Scenario 1: Real percentage growth extracted accurately from transcript',
    metric1
  );

  const routePlan1 = routeVisualTreatment(
    createMockContext({
      role: 'proof',
      visualPurpose: 'PROOF',
      transcript: 'CTR kami naik dari 1% menjadi 3% dalam seminggu',
    })
  );
  assert(
    routePlan1.family === 'METRIC_ANIMATION' &&
      routePlan1.template === 'PERCENTAGE_GROWTH' &&
      (routePlan1.params as any).fromValue === '1%' &&
      (routePlan1.params as any).toValue === '3%',
    'Scenario 1B: Router selects PERCENTAGE_GROWTH with real transcript data',
    routePlan1
  );

  // Test 2: Vague proof statement without numbers must NOT trigger fake metric animations
  const metric2 = extractMetricContent('Hasilnya jauh lebih bagus dan konversi naik drastis');
  assert(
    metric2.confidence === 0 && metric2.numericValue === null,
    'Scenario 2: Vague proof statement yields 0 metric confidence',
    metric2
  );

  const routePlan2 = routeVisualTreatment(
    createMockContext({
      role: 'proof',
      visualPurpose: 'PROOF',
      transcript: 'Hasilnya jauh lebih bagus dan konversi naik drastis',
    })
  );
  assert(
    routePlan2.family !== 'METRIC_ANIMATION' &&
      routePlan2.template === 'CLAIM_CARD',
    'Scenario 2B: Router falls back to CLAIM_CARD instead of fake metric animation',
    routePlan2.template
  );

  // Test 3: Storytelling duration ("Saya bekerja selama 3 tahun") is NOT a list and NOT a metric proof
  const list3 = extractListItems('Saya bekerja selama 3 tahun di industri ini');
  assert(
    list3.confidence === 0 && list3.items.length === 0,
    'Scenario 3A: "3 tahun" does not trigger list extraction',
    list3
  );

  const metric3 = extractMetricContent('Saya bekerja selama 3 tahun di industri ini');
  assert(
    metric3.confidence === 0,
    'Scenario 3B: "3 tahun" duration does not trigger metric proof',
    metric3
  );

  const routePlan3 = routeVisualTreatment(
    createMockContext({
      role: 'explanation',
      visualPurpose: 'EXPLANATION',
      transcript: 'Saya bekerja selama 3 tahun di industri ini',
    })
  );
  assert(
    routePlan3.template !== 'ANIMATED_LIST' && routePlan3.template !== 'NUMBER_COUNTER',
    'Scenario 3C: Router avoids ANIMATED_LIST and NUMBER_COUNTER for personal duration',
    routePlan3.template
  );

  // Test 4: Real list with colon enumeration
  const list4 = extractListItems('Ada 3 kesalahan: targeting buruk, hook lemah, proof tidak ada');
  assert(
    list4.items.length === 3 &&
      list4.items[0].toLowerCase().includes('targeting') &&
      list4.confidence >= 0.8,
    'Scenario 4A: Real enumerated list extracted from colon format',
    list4
  );

  const routePlan4 = routeVisualTreatment(
    createMockContext({
      role: 'explanation',
      visualPurpose: 'EXPLANATION',
      transcript: 'Ada 3 kesalahan: targeting buruk, hook lemah, proof tidak ada',
    })
  );
  assert(
    routePlan4.family === 'CALLOUT' &&
      routePlan4.template === 'ANIMATED_LIST' &&
      (routePlan4.params as any).items.length === 3,
    'Scenario 4B: Router selects ANIMATED_LIST with 3 extracted items',
    routePlan4
  );

  // Test 5: Real list with sequential markers ("Pertama ..., kedua ...")
  const list5 = extractListItems('Pertama riset pasar, kedua buat konten, ketiga pasang iklan');
  assert(
    list5.items.length >= 2 && list5.confidence >= 0.8,
    'Scenario 5A: Sequential marker list extracted',
    list5
  );

  // Test 6: Valid Before/After contrast
  const contrast6 = extractBeforeAfterContent('Dulu CTR saya 1%, sekarang 3%');
  assert(
    contrast6.confidence >= 0.8 &&
      contrast6.beforeText !== null &&
      contrast6.afterText !== null,
    'Scenario 6A: Genuine Before/After contrast extracted',
    contrast6
  );

  const routePlan6 = routeVisualTreatment(
    createMockContext({
      role: 'curiosity',
      transcript: 'Dulu CTR saya 1%, sekarang 3%',
    })
  );
  assert(
    routePlan6.family === 'COMPARISON' &&
      routePlan6.template === 'BEFORE_AFTER' &&
      (routePlan6.params as any).beforeText.includes('CTR') &&
      (routePlan6.params as any).afterText.includes('3%'),
    'Scenario 6B: Router selects BEFORE_AFTER with real extracted sides',
    routePlan6
  );

  // Test 7: Invalid Before/After ("Strategi baru ini lebih efektif")
  const contrast7 = extractBeforeAfterContent('Strategi baru ini lebih efektif');
  assert(
    contrast7.confidence === 0,
    'Scenario 7A: Vague non-contrast yields 0 Before/After confidence',
    contrast7
  );

  const routePlan7 = routeVisualTreatment(
    createMockContext({
      role: 'curiosity',
      transcript: 'Strategi baru ini lebih efektif',
    })
  );
  assert(
    routePlan7.template !== 'BEFORE_AFTER',
    'Scenario 7B: Router avoids BEFORE_AFTER when contrast is invalid',
    routePlan7.template
  );

  // Test 8: Authentic Evidence Priority (Tier 1 Fallback)
  const routePlan8 = routeVisualTreatment(
    createMockContext({
      role: 'proof',
      visualPurpose: 'PROOF',
      transcript: 'Lihat dashboard berikut',
      resolution: {
        status: 'EXACT_EVIDENCE',
        resolvedAsset: {
          id: 'proof-1',
          name: 'dashboard.png',
          url: 'blob:mock-asset',
          type: 'screenshot',
          label: 'Meta Ads Dashboard',
        },
        confidence: 0.95,
        reason: 'User uploaded screenshot matched',
      },
    })
  );
  assert(
    routePlan8.family === 'SCREENSHOT_HIGHLIGHT' &&
      routePlan8.template === 'SCREENSHOT_ZOOM' &&
      routePlan8.evidenceResolved === true,
    'Scenario 8: Exact user screenshot matched takes precedence over programmatic graphic',
    routePlan8
  );

  // Test 9: Badge label safety (no misleading VERIFIED DATA on programmatic graphics)
  const routePlan9 = routeVisualTreatment(
    createMockContext({
      role: 'proof',
      visualPurpose: 'PROOF',
      transcript: 'ROAS mencapai 4.2x bulan ini',
    })
  );
  const badgeText = (routePlan9.params as any).badgeText;
  assert(
    badgeText === 'METRIC' && badgeText !== 'VERIFIED DATA',
    'Scenario 9: Programmatic number counter uses neutral METRIC badge, not VERIFIED DATA',
    badgeText
  );

  // Test 10: Multiplier / ROAS extraction
  const metric10 = extractMetricContent('ROAS mencapai 4.2x');
  assert(
    metric10.singleValue === '4.2x' &&
      metric10.numericValue === 4.2 &&
      metric10.confidence >= 0.8,
    'Scenario 10: Multiplier extracted correctly',
    metric10
  );

  // Test 11: Currency metric extraction
  const metric11 = extractMetricContent('Omset tembus 500 juta');
  assert(
    metric11.singleValue?.toLowerCase().includes('500 juta') &&
      metric11.numericValue === 500 &&
      metric11.confidence >= 0.8,
    'Scenario 11: Currency / volume achievement extracted',
    metric11
  );

  // Test 12: Process steps extraction
  const process12 = extractProcessSteps('Langkah 1 riset audiens, Langkah 2 bikin materi, Langkah 3 scaling');
  assert(
    process12.steps.length === 3 &&
      process12.confidence >= 0.8,
    'Scenario 12: Process steps extracted reliably',
    process12
  );

  console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Auto-run when executed directly via tsx
if (process.argv[1]?.includes('visualTreatments.test')) {
  const result = runVisualTreatmentTests();
  if (result.failed > 0) {
    process.exit(1);
  }
}
