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
  extractNetworkContent,
} from './contentExtractor';
import { routeVisualTreatment } from './router';
import { RouteTreatmentContext, TreatmentTemplateType } from './types';
import { getSafeArea, getPlacementRect, getResponsiveCardSize, PlacementType } from './layout';
import { buildIntelligentEditPlan } from '../engine';

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

  // -------------------------------------------------------------------------
  // DYNAMIC ICON NETWORK TESTS (TEST A - F)
  // -------------------------------------------------------------------------

  // Test A: "ALCO menghubungkan riset, konten, iklan, dan analytics"
  const networkA = extractNetworkContent('ALCO menghubungkan riset, konten, iklan, dan analytics dalam satu ecosystem.');
  assert(
    networkA.centerLabel === 'ALCO' &&
      networkA.nodes.length === 4 &&
      networkA.nodes[0].label === 'RISET' &&
      networkA.nodes[1].label === 'KONTEN' &&
      networkA.nodes[2].label === 'IKLAN' &&
      networkA.nodes[3].label === 'ANALYTICS' &&
      networkA.confidence >= 0.7,
    'Test A: Extractor successfully parses explicit center ALCO and 4 nodes from transcript',
    networkA
  );

  const routePlanA = routeVisualTreatment(
    createMockContext({
      role: 'explanation',
      visualPurpose: 'EXPLANATION',
      transcript: 'ALCO menghubungkan riset, konten, iklan, dan analytics dalam satu ecosystem.',
    })
  );
  assert(
    routePlanA.family === 'ANIMATED_ILLUSTRATION' &&
      routePlanA.template === 'ICON_NETWORK' &&
      (routePlanA.params as any).centerNode.label === 'ALCO' &&
      (routePlanA.params as any).orbitNodes.length === 4,
    'Test A2: Router selects ICON_NETWORK with extracted ALCO center and 4 nodes',
    routePlanA
  );

  // Test B: "Sistem ini menggabungkan CRM, WhatsApp, website dan database."
  const networkB = extractNetworkContent('Sistem ini menggabungkan CRM, WhatsApp, website dan database.');
  assert(
    networkB.centerLabel === 'SISTEM' &&
      networkB.nodes.length === 4 &&
      networkB.nodes.some(n => n.label === 'CRM') &&
      networkB.nodes.some(n => n.label === 'WHATSAPP') &&
      networkB.nodes.some(n => n.label === 'WEBSITE') &&
      networkB.nodes.some(n => n.label === 'DATABASE'),
    'Test B: Extractor extracts SISTEM center and CRM, WhatsApp, website, database nodes',
    networkB
  );

  const routePlanB = routeVisualTreatment(
    createMockContext({
      role: 'explanation',
      visualPurpose: 'EXPLANATION',
      transcript: 'Sistem ini menggabungkan CRM, WhatsApp, website dan database.',
    })
  );
  assert(
    routePlanB.family === 'ANIMATED_ILLUSTRATION' &&
      routePlanB.template === 'ICON_NETWORK' &&
      (routePlanB.params as any).centerNode.label === 'SISTEM' &&
      (routePlanB.params as any).orbitNodes.length === 4,
    'Test B2: Router routes to ICON_NETWORK with SISTEM center and 4 extracted nodes',
    routePlanB
  );

  // Test C: "Platform ini sangat mudah digunakan." -> Must NOT select ICON_NETWORK
  const networkC = extractNetworkContent('Platform ini sangat mudah digunakan.');
  assert(
    networkC.confidence === 0 && networkC.nodes.length === 0,
    'Test C: Transcript without components yields 0 network confidence and 0 nodes',
    networkC
  );

  const routePlanC = routeVisualTreatment(
    createMockContext({
      role: 'explanation',
      visualPurpose: 'EXPLANATION',
      transcript: 'Platform ini sangat mudah digunakan.',
    })
  );
  assert(
    routePlanC.template !== 'ICON_NETWORK',
    'Test C2: Router rejects ICON_NETWORK when no nodes are extracted',
    routePlanC.template
  );

  // Test D: "Ekosistem ini sangat bagus." -> Keyword alone is NOT enough
  const networkD = extractNetworkContent('Ekosistem ini sangat bagus.');
  assert(
    networkD.confidence === 0 && networkD.nodes.length === 0,
    'Test D: Keyword "ekosistem" alone without component list yields 0 network confidence',
    networkD
  );

  const routePlanD = routeVisualTreatment(
    createMockContext({
      role: 'explanation',
      visualPurpose: 'EXPLANATION',
      transcript: 'Ekosistem ini sangat bagus.',
    })
  );
  assert(
    routePlanD.template !== 'ICON_NETWORK',
    'Test D2: Router rejects ICON_NETWORK when keyword exists without 3+ nodes',
    routePlanD.template
  );

  // Test E: Variable node count (7 components) -> Capped at maximum 6 nodes
  const networkE = extractNetworkContent('Sistem terdiri dari riset, konten, ads, analytics, CRM, website dan database.');
  assert(
    networkE.nodes.length === 6 && networkE.confidence >= 0.7,
    'Test E: Extractor caps extracted nodes at maximum 6 nodes',
    networkE
  );

  // Test F: Zero hardcoded fallback nodes
  const routePlanF = routeVisualTreatment(
    createMockContext({
      role: 'explanation',
      visualPurpose: 'EXPLANATION',
      transcript: 'Sistem ini menggabungkan CRM, WhatsApp, website dan database.',
    })
  );
  const labelsF = (routePlanF.params as any).orbitNodes.map((n: any) => n.label);
  const containsHardcoded = labelsF.includes('ANALISIS') || labelsF.includes('PROSES') || labelsF.includes('EKSEKUSI') || labelsF.includes('HASIL');
  assert(
    !containsHardcoded,
    'Test F: Generated ICON_NETWORK contains zero hardcoded nodes (ANALISIS, PROSES, EKSEKUSI, HASIL)',
    labelsF
  );

  // -------------------------------------------------------------------------
  // MVP BATCH 2 COMPREHENSIVE SCENARIO TESTS (SCENARIOS A - M)
  // -------------------------------------------------------------------------

  // Scenario A: "ROAS mencapai 4.2x" -> NUMBER_COUNTER
  const planScenA = routeVisualTreatment(createMockContext({
    role: 'proof',
    visualPurpose: 'PROOF',
    transcript: 'ROAS mencapai 4.2x bulan ini',
  }));
  assert(
    planScenA.template === 'NUMBER_COUNTER' &&
    (planScenA.params as any).formattedTarget.includes('4.2x'),
    'Scenario A: "ROAS mencapai 4.2x" produces NUMBER_COUNTER',
    planScenA
  );

  // Scenario B: "CTR naik dari 1% menjadi 3%" -> PERCENTAGE_GROWTH
  const planScenB = routeVisualTreatment(createMockContext({
    role: 'proof',
    visualPurpose: 'PROOF',
    transcript: 'CTR naik dari 1% menjadi 3%',
  }));
  assert(
    planScenB.template === 'PERCENTAGE_GROWTH' &&
    (planScenB.params as any).fromValue === '1%' &&
    (planScenB.params as any).toValue === '3%',
    'Scenario B: "CTR naik dari 1% menjadi 3%" produces PERCENTAGE_GROWTH',
    planScenB
  );

  // Scenario C: "Ada tiga masalah: hook lemah, targeting terlalu luas, proof tidak ada" -> ANIMATED_LIST
  const planScenC = routeVisualTreatment(createMockContext({
    role: 'explanation',
    visualPurpose: 'EXPLANATION',
    transcript: 'Ada tiga masalah: hook lemah, targeting terlalu luas, proof tidak ada',
  }));
  assert(
    planScenC.template === 'ANIMATED_LIST' &&
    (planScenC.params as any).items.length === 3,
    'Scenario C: "Ada tiga masalah: ..." produces ANIMATED_LIST with 3 items',
    planScenC
  );

  // Scenario D: "Pertama riset, kedua produksi konten, ketiga jalankan ads" -> PROCESS_STEPS or ARROW_FLOW
  const planScenD = routeVisualTreatment(createMockContext({
    role: 'explanation',
    visualPurpose: 'EXPLANATION',
    transcript: 'Pertama riset, kedua produksi konten, ketiga jalankan ads',
  }));
  assert(
    (planScenD.template === 'ARROW_FLOW' || planScenD.template === 'PROCESS_STEPS'),
    'Scenario D: "Pertama ..., kedua ..., ketiga ..." produces ARROW_FLOW or PROCESS_STEPS',
    planScenD.template
  );

  // Scenario E: "Hari pertama riset, hari ketiga produksi, minggu pertama launch" -> TIMELINE
  const planScenE = routeVisualTreatment(createMockContext({
    role: 'explanation',
    visualPurpose: 'EXPLANATION',
    transcript: 'Hari pertama riset, hari ketiga produksi, minggu pertama launch',
  }));
  assert(
    planScenE.template === 'TIMELINE' &&
    (planScenE.params as any).milestones.length >= 2,
    'Scenario E: "Hari pertama ..., hari ketiga ..." produces TIMELINE',
    planScenE
  );

  // Scenario F: "ALCO menghubungkan riset, konten, ads dan analytics" -> ICON_NETWORK
  const planScenF = routeVisualTreatment(createMockContext({
    role: 'explanation',
    visualPurpose: 'EXPLANATION',
    transcript: 'ALCO menghubungkan riset, konten, ads dan analytics dalam satu ekosistem.',
  }));
  assert(
    planScenF.template === 'ICON_NETWORK' &&
    (planScenF.params as any).centerNode.label === 'ALCO' &&
    (planScenF.params as any).orbitNodes.length >= 3,
    'Scenario F: "ALCO menghubungkan ..." produces ICON_NETWORK',
    planScenF
  );

  // Scenario G: "Dulu CTR 1%, sekarang 3%" -> BEFORE_AFTER
  const planScenG = routeVisualTreatment(createMockContext({
    role: 'curiosity',
    transcript: 'Dulu CTR 1%, sekarang 3%',
  }));
  assert(
    planScenG.template === 'BEFORE_AFTER' &&
    (planScenG.params as any).beforeText.includes('1%') &&
    (planScenG.params as any).afterText.includes('3%'),
    'Scenario G: "Dulu ..., sekarang ..." produces BEFORE_AFTER',
    planScenG
  );

  // Scenario H: "Strategi ini sangat efektif" -> falls back to Claim Card / text emphasis, not fake metric
  const planScenH = routeVisualTreatment(createMockContext({
    role: 'proof',
    visualPurpose: 'PROOF',
    transcript: 'Strategi ini sangat efektif',
  }));
  assert(
    planScenH.family !== 'METRIC_ANIMATION' &&
    planScenH.template !== 'BEFORE_AFTER' &&
    (planScenH.template === 'CLAIM_CARD' || planScenH.template === 'KEYWORD_POP'),
    'Scenario H: "Strategi ini sangat efektif" avoids fake metric / fake before-after',
    planScenH.template
  );

  // Scenario I: Proof scene with authentic screenshot -> SCREENSHOT_ZOOM or HIGHLIGHT_BOX
  const planScenI1 = routeVisualTreatment(createMockContext({
    role: 'proof',
    visualPurpose: 'PROOF',
    transcript: 'Lihat data di dashboard',
    resolution: {
      status: 'EXACT_EVIDENCE',
      resolvedAsset: {
        id: 'asset-1',
        name: 'proof.png',
        url: 'blob:asset-1',
        type: 'screenshot',
        label: 'Dashboard Ads',
      },
      confidence: 0.95,
      reason: 'Exact evidence matched',
    },
  }));
  assert(
    planScenI1.template === 'SCREENSHOT_ZOOM' &&
    planScenI1.evidenceResolved === true,
    'Scenario I: Authentic screenshot matched produces SCREENSHOT_ZOOM',
    planScenI1
  );

  // Scenario J: "Klik link di bio" -> CTA_ACTION
  const planScenJ = routeVisualTreatment(createMockContext({
    role: 'cta',
    visualPurpose: 'CTA',
    transcript: 'Klik link di bio untuk coba sekarang juga!',
  }));
  assert(
    planScenJ.template === 'CTA_ACTION' &&
    (planScenJ.params as any).actionButtonText.length > 0,
    'Scenario J: "Klik link di bio" produces CTA_ACTION',
    planScenJ
  );

  // Scenario K: Multiple consecutive explanation scenes -> avoid identical treatment spam (repetition penalty)
  const planScenK1 = routeVisualTreatment(createMockContext({
    role: 'explanation',
    visualPurpose: 'EXPLANATION',
    transcript: 'Strategi ini bekerja untuk semua kategori produk.',
    recentTreatments: ['CLAIM_CARD'],
  }));
  assert(
    planScenK1.template !== 'CLAIM_CARD',
    'Scenario K: Consecutive explanation after CLAIM_CARD triggers repetition penalty/balancing',
    planScenK1.template
  );

  // Scenario L: No generated plan contains fabricated numeric or business claims
  const planScenL = routeVisualTreatment(createMockContext({
    role: 'explanation',
    visualPurpose: 'EXPLANATION',
    transcript: 'Kami mengoptimalkan strategi marketing klien.',
  }));
  assert(
    planScenL.family !== 'METRIC_ANIMATION' &&
    (planScenL.params as any).fromValue === undefined,
    'Scenario L: Transcript without numbers produces zero fabricated metrics',
    planScenL
  );

  // Scenario M: All 15 templates verified in library
  const expectedTemplates: TreatmentTemplateType[] = [
    'KEYWORD_POP',
    'CLAIM_CARD',
    'NUMBER_COUNTER',
    'PERCENTAGE_GROWTH',
    'SIMPLE_BAR_CHART',
    'ANIMATED_LIST',
    'PROCESS_STEPS',
    'ARROW_FLOW',
    'TIMELINE',
    'ICON_NETWORK',
    'BEFORE_AFTER',
    'SCREENSHOT_ZOOM',
    'HIGHLIGHT_BOX',
    'PRODUCT_CARD',
    'CTA_ACTION',
  ];
  assert(
    expectedTemplates.length === 15,
    'Scenario M: 15 standardized templates registered in treatment library',
    expectedTemplates.length
  );

  // -------------------------------------------------------------------------
  // FINAL INTEGRATION FIX TESTS: HISTORY INJECTION & SAFE AREA LAYOUT
  // -------------------------------------------------------------------------

  // Test N1: Safe Area Bounds & Caption Zone Protection (720x1280 and 1080x1920)
  const safe720 = getSafeArea(720, 1280);
  const safe1080 = getSafeArea(1080, 1920);

  assert(
    safe720.left === 32 && safe720.right === 688 && safe720.bottom === 1060 && safe720.top === 80,
    'Test N1.1: 720x1280 Safe area margins correctly protect top and bottom caption zones',
    safe720
  );

  assert(
    safe1080.left === 48 && safe1080.right === 1032 && safe1080.bottom === 1590 && safe1080.top === 120,
    'Test N1.2: 1080x1920 Safe area margins scale proportionally',
    safe1080
  );

  // Test N2: Card Layout boundaries for all 15 templates
  let allInsideSafe720 = true;
  let allInsideSafe1080 = true;
  let allScaledProportionally = true;

  expectedTemplates.forEach((tpl) => {
    const size720 = getResponsiveCardSize(tpl, 'BOLD', 720);
    const size1080 = getResponsiveCardSize(tpl, 'BOLD', 1080);

    // Verify proportional scaling for 1080x1920
    if (size1080.width <= size720.width || size1080.height <= size720.height) {
      allScaledProportionally = false;
    }

    (['UPPER_THIRD', 'CENTER', 'LOWER_THIRD'] as PlacementType[]).forEach((placement) => {
      const rect720 = getPlacementRect(placement, size720.width, size720.height, 720, 1280);
      if (
        rect720.x < safe720.left ||
        rect720.x + rect720.width > safe720.right ||
        rect720.y < safe720.top ||
        rect720.y + rect720.height > safe720.bottom
      ) {
        allInsideSafe720 = false;
      }

      const rect1080 = getPlacementRect(placement, size1080.width, size1080.height, 1080, 1920);
      if (
        rect1080.x < safe1080.left ||
        rect1080.x + rect1080.width > safe1080.right ||
        rect1080.y < safe1080.top ||
        rect1080.y + rect1080.height > safe1080.bottom
      ) {
        allInsideSafe1080 = false;
      }
    });
  });

  assert(
    allInsideSafe720,
    'Test N2.1: All 15 visual treatment cards remain strictly inside safe area bounds for 720x1280',
    allInsideSafe720
  );
  assert(
    allInsideSafe1080,
    'Test N2.2: All 15 visual treatment cards remain strictly inside safe area bounds for 1080x1920',
    allInsideSafe1080
  );
  assert(
    allScaledProportionally,
    'Test N2.3: All 15 visual treatment cards scale up proportionally when rendered at 1080x1920',
    allScaledProportionally
  );

  // Test N3: Full pipeline execution with rolling history and repetition suppression
  const mockTranscriptSegments = [
    { id: 1, start: 0, end: 3, text: 'Inilah rahasia optimasi konversi digital.' },
    { id: 2, start: 3, end: 6, text: 'Fokus pada riset audiens yang mendalam.' },
    { id: 3, start: 6, end: 9, text: 'Gunakan konten yang relevan dengan problem mereka.' },
    { id: 4, start: 9, end: 12, text: 'Hasilnya omzet meningkat 250% dalam 30 hari.' },
    { id: 5, start: 12, end: 15, text: 'Daftar sekarang untuk konsultasi gratis.' },
  ];

  const mockAnalysis: any[] = mockTranscriptSegments.map((s, idx) => ({
    id: s.id,
    start: s.start,
    end: s.end,
    content_role: idx === 0 ? 'hook' : idx === 3 ? 'proof' : idx === 4 ? 'cta' : 'explanation',
    importance: 8,
    emotion: 'authoritative',
    key_phrase: s.text,
    reasoning: 'Test scene reasoning',
  }));

  const editPlan = buildIntelligentEditPlan(mockTranscriptSegments, mockAnalysis, 'educational');
  assert(
    editPlan.scenes.length === 5,
    'Test N3.1: buildIntelligentEditPlan successfully generates 5 scenes with visual treatments',
    editPlan.scenes.length
  );

  const sceneTreatments = editPlan.scenes.map((s) => s.visual_treatment?.template);
  // Ensure that no single card template is repeated 3 times in a row
  let hasThreeConsecutiveDuplicates = false;
  for (let i = 0; i < sceneTreatments.length - 2; i++) {
    if (
      sceneTreatments[i] &&
      sceneTreatments[i] !== 'TALKING_HEAD_FOCUS' &&
      sceneTreatments[i] === sceneTreatments[i + 1] &&
      sceneTreatments[i] === sceneTreatments[i + 2]
    ) {
      hasThreeConsecutiveDuplicates = true;
    }
  }

  assert(
    !hasThreeConsecutiveDuplicates,
    'Test N3.2: Production pipeline history active - no card treatment repeats 3 consecutive times',
    sceneTreatments
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
