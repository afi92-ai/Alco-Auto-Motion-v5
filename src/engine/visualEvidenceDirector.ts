/**
 * ALCO AUTO MOTION V5 — VISUAL EVIDENCE DIRECTOR
 *
 * Intermediate Director Engine situated between Scene Intelligence and Asset Matcher:
 * Transcript → Scene Intelligence → Visual Evidence Director → Asset Matcher → Composition Engine → Editing Rhythm → Render
 *
 * Determines for every scene:
 * - visualPurpose: CONTEXT | PROOF | DEMO | EXPLANATION | EMOTION | OFFER | CTA
 * - preferredVisual: BROLL | SCREENSHOT | METRIC | UI_DEMO | TEXT_EMPHASIS | PERSON | PRODUCT | DIAGRAM | NONE
 * - requiredEvidence: string | null
 * - genericBrollAllowed: boolean
 * - emphasisTarget: string | null
 * - motionIntent: HOLD | HOLD_AND_HIGHLIGHT | SLOW_PUSH | TRACK | STATIC | CUT_FAST | NONE
 * - confidence: 0..1
 * - reason: short diagnostic text
 *
 * Ensures visual decisions are anchored to editorial evidence needs,
 * preventing generic stock footage from hijacking specific proof/demo moments.
 */

import {
  ContentRole,
  AdRole,
  SceneIntelligenceScore,
  ContentType,
  VisualPurpose,
  PreferredVisual,
  VisualEvidenceMotionIntent,
  VisualEvidenceDirective,
} from '../types';

export type {
  VisualPurpose,
  PreferredVisual,
  VisualEvidenceMotionIntent,
  VisualEvidenceDirective,
};

export interface DirectVisualEvidenceInput {
  transcript: string;
  role?: ContentRole;
  adRole?: AdRole;
  scores?: SceneIntelligenceScore;
  index?: number;
  totalScenes?: number;
  contentType?: ContentType;
}

/**
 * Normalizes numbers for clean display: converts commas to dots, e.g. "0,6%" -> "0.6%"
 */
function normalizeMetricNumber(str: string): string {
  return str.replace(/,/g, '.').trim();
}

/**
 * Helper to capitalize word/tokens nicely
 */
function capitalizeWord(w: string): string {
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * 1. UI Demo / Instruction Detector
 * Detects step-by-step UI actions (e.g. "Klik menu Campaign lalu pilih Create", "Buka menu Settings", etc.)
 */
function detectUiInstruction(text: string): {
  isUi: boolean;
  actionChain: string | null;
  target: string | null;
  confidence: number;
} {
  const t = text.trim();

  // Exclude CTA conversion triggers (e.g. "Klik link di bawah", "Klik bio", "Klik tombol di bawah")
  if (/\b(klik\s+link|klik\s+di\s+bawah|link\s+di\s+bio|klik\s+bio|daftar\s+sekarang|order\s+sekarang|checkout\s+sekarang)\b/i.test(t)) {
    return { isUi: false, actionChain: null, target: null, confidence: 0 };
  }

  // Pattern 1: Multi-step chain, e.g. "Klik menu Campaign lalu pilih Create" or "Buka Settings kemudian klik Integrasi"
  const chainRegex = /\b(klik|pilih|buka|tekan|click|select|open|press)\s+(?:menu\s+|tombol\s+|halaman\s+|tab\s+)?([A-Za-z0-9_-]+)\s+(?:lalu|kemudian|then|and)?\s*(klik|pilih|tekan|select|click)?\s*([A-Za-z0-9_-]+)?/i;
  const chainMatch = t.match(chainRegex);

  if (chainMatch) {
    const step1Verb = chainMatch[1];
    const step1Target = chainMatch[2];
    const step2Verb = chainMatch[3];
    const step2Target = chainMatch[4];

    // Check if second action exists and is not a stopword
    const excludedStep2 = new Set(['ini', 'itu', 'di', 'ke', 'dan', 'yang', 'bisa', 'akan']);
    if (step2Target && !excludedStep2.has(step2Target.toLowerCase())) {
      const formattedStep1 = capitalizeWord(step1Target);
      const formattedStep2 = capitalizeWord(step2Target);
      return {
        isUi: true,
        actionChain: `${formattedStep1} > ${formattedStep2}`,
        target: formattedStep2,
        confidence: 0.96,
      };
    }

    // Single step with UI keyword
    const uiKeywords = /\b(menu|tombol|button|tab|halaman|page|field|kolom|dropdown|icon|ikon|fitur|setting|pengaturan|dashboard|folder|file|link|opsi|create|campaign|tambah)\b/i;
    if (uiKeywords.test(t)) {
      const formattedTarget = capitalizeWord(step1Target);
      return {
        isUi: true,
        actionChain: `${capitalizeWord(step1Verb)} ${formattedTarget}`,
        target: formattedTarget,
        confidence: 0.90,
      };
    }
  }

  // Pattern 2: Generic software UI interaction keywords
  const uiDirectRegex = /\b(klik|pilih|tekan|buka|centang|toggle)\s+(?:menu|tombol|button|fitur|opsi)?\s*([A-Za-z0-9_-]+)/i;
  const directMatch = t.match(uiDirectRegex);
  if (directMatch && /\b(menu|tombol|button|tab|dashboard|setting|create|simpan|download|export|import|install)\b/i.test(t)) {
    const target = capitalizeWord(directMatch[2]);
    return {
      isUi: true,
      actionChain: target,
      target,
      confidence: 0.88,
    };
  }

  return { isUi: false, actionChain: null, target: null, confidence: 0 };
}

/**
 * 2. Metric / Proof Evidence Detector
 * Detects specific performance claims (e.g. "CTR iklan ini cuma 0,6%", "ROAS 4.5x", "Omset 100 juta")
 */
function detectMetricProof(text: string): {
  isMetric: boolean;
  metricLabel: string | null;
  metricValue: string | null;
  fullEvidence: string | null;
  hasScreenshotContext: boolean;
  confidence: number;
} {
  const t = text.trim();

  // A. Named KPI metrics: CTR, ROAS, CPC, CPM, ROI, CPA, AOV, LTV
  const namedKpiRegex = /\b(CTR|ROAS|CPC|CPM|ROI|CPA|AOV|LTV)\b[^\d]*?(\d+(?:[.,]\d+)?%?|\d+(?:[.,]\d+)?x?)/i;
  const kpiMatch = t.match(namedKpiRegex);
  if (kpiMatch) {
    const kpiName = kpiMatch[1].toUpperCase();
    const rawVal = kpiMatch[2];
    let val = normalizeMetricNumber(rawVal);
    // Ensure % or x tag if appropriate for KPI
    if (kpiName === 'CTR' || kpiName === 'ROI') {
      if (!val.includes('%')) val += '%';
    } else if (kpiName === 'ROAS') {
      if (!val.toLowerCase().includes('x')) val += 'x';
    }

    return {
      isMetric: true,
      metricLabel: kpiName,
      metricValue: val,
      fullEvidence: `${kpiName} ${val}`,
      hasScreenshotContext: /\b(dashboard|screenshot|grafik|tampilan|laporan|ads manager|meta ads)\b/i.test(t),
      confidence: 0.98,
    };
  }

  // B. Percentage with business outcome context (e.g. "naik 35%", "cuma 0,6%", "konversi 12%")
  const percentRegex = /\b(?:sebesar|cuma|hanya|naik|turun|mencapai|sebesar|tembus)?\s*(\d+(?:[.,]\d+)?%)\b/i;
  const percentMatch = t.match(percentRegex);
  if (percentMatch) {
    const val = normalizeMetricNumber(percentMatch[1]);
    // Determine context label
    let label = 'Metric';
    if (/\b(ctr|klik|click)\b/i.test(t)) label = 'CTR';
    else if (/\b(konversi|conversion)\b/i.test(t)) label = 'Konversi';
    else if (/\b(profit|margin|keuntungan)\b/i.test(t)) label = 'Profit';
    else if (/\b(diskon|potongan)\b/i.test(t)) label = 'Diskon';
    else if (/\b(retensi|retention)\b/i.test(t)) label = 'Retensi';
    else if (/\b(pertumbuhan|growth)\b/i.test(t)) label = 'Growth';

    return {
      isMetric: true,
      metricLabel: label,
      metricValue: val,
      fullEvidence: label !== 'Metric' ? `${label} ${val}` : val,
      hasScreenshotContext: /\b(dashboard|screenshot|grafik|tampilan|laporan)\b/i.test(t),
      confidence: 0.92,
    };
  }

  // C. Currency / Volume numbers: e.g. "omset 100 juta", "Rp 500 ribu", "10x lipat"
  const volumeRegex = /\b(omset|omzet|revenue|penjualan|profit|gaji|income|biaya)\s*(?:mencapai|sebesar|tembus)?\s*(\d+(?:[.,]\d+)?\s*(?:jt|juta|ribu|rb|milyar|m|k|rupiah|rp|usd|\$))/i;
  const volMatch = t.match(volumeRegex);
  if (volMatch) {
    const label = capitalizeWord(volMatch[1]);
    const val = normalizeMetricNumber(volMatch[2]);
    return {
      isMetric: true,
      metricLabel: label,
      metricValue: val,
      fullEvidence: `${label} ${val}`,
      hasScreenshotContext: /\b(dashboard|screenshot|grafik|laporan)\b/i.test(t),
      confidence: 0.94,
    };
  }

  // D. General multiplier claim: e.g. "naik 5x lipat"
  const multiplierRegex = /\b(\d+(?:[.,]\d+)?x)\s*(?:lipat|pertumbuhan)?\b/i;
  const multMatch = t.match(multiplierRegex);
  if (multMatch) {
    const val = normalizeMetricNumber(multMatch[1]);
    return {
      isMetric: true,
      metricLabel: 'Multiplier',
      metricValue: val,
      fullEvidence: `${val} Growth`,
      hasScreenshotContext: /\b(dashboard|screenshot|grafik)\b/i.test(t),
      confidence: 0.90,
    };
  }

  // E. Explicit dashboard/screenshot mention without exact digits
  if (/\b(dashboard|screenshot|tangkapan layar|grafik omset|grafik penjualan)\b/i.test(t)) {
    return {
      isMetric: true,
      metricLabel: 'Dashboard',
      metricValue: null,
      fullEvidence: 'Dashboard Analytics',
      hasScreenshotContext: true,
      confidence: 0.86,
    };
  }

  return {
    isMetric: false,
    metricLabel: null,
    metricValue: null,
    fullEvidence: null,
    hasScreenshotContext: false,
    confidence: 0,
  };
}

/**
 * 3. Emotional / Storytelling Reflection Detector
 * Detects personal journey, vulnerability, confusion, or emotional struggle.
 */
function detectEmotionalReflection(text: string): {
  isEmotion: boolean;
  emotionPhrase: string | null;
  confidence: number;
} {
  const t = text.trim();

  const emotionalPatterns = [
    /\bawalnya saya pikir\b/i,
    /\bdulu saya\b/i,
    /\bsaya pikir\b/i,
    /\bsaya (?:merasa|bingung|frustasi|stres|capek|lelah|takut|khawatir|sadar)\b/i,
    /\brasanya mau nyerah\b/i,
    /\bjujur saja\b/i,
    /\bgak nyangka\b/i,
    /\bmerasa bersalah\b/i,
    /\bgagal terus\b/i,
    /\bboncos terus\b/i,
    /\bsempat putus asa\b/i,
    /\btanpa saya sadari\b/i,
    /\bmerasa baik-baik saja\b/i,
  ];

  for (const pat of emotionalPatterns) {
    const m = t.match(pat);
    if (m) {
      return {
        isEmotion: true,
        emotionPhrase: m[0],
        confidence: 0.90,
      };
    }
  }

  return { isEmotion: false, emotionPhrase: null, confidence: 0 };
}

/**
 * 4. Product Offer / Value Stack Detector
 * Detects commercial offers, discounts, bundles, bonuses, pricing.
 */
function detectProductOffer(text: string): {
  isOffer: boolean;
  offerTarget: string | null;
  confidence: number;
} {
  const t = text.trim();

  // Discount percentage or price mention
  const discountMatch = t.match(/\b(diskon\s*\d+%|potongan\s*\d+%|\d+%\s*off)\b/i);
  if (discountMatch) {
    return {
      isOffer: true,
      offerTarget: discountMatch[0],
      confidence: 0.94,
    };
  }

  const priceMatch = t.match(/\b(harganya\s*(?:cuma|hanya)?\s*(?:rp\s*)?\d+(?:[.,]\d+)?\s*(?:ribu|rb|jt|juta)?|cuma\s*\d+\s*(?:ribu|rb))\b/i);
  if (priceMatch) {
    return {
      isOffer: true,
      offerTarget: priceMatch[0],
      confidence: 0.92,
    };
  }

  const promoMatch = t.match(/\b(promo\s*(?:spesial|terbatas|launching)|bonus\s*\d+|paket\s*lengkap|voucher\s*diskon|garansi\s*\d+\s*hari)\b/i);
  if (promoMatch) {
    return {
      isOffer: true,
      offerTarget: promoMatch[0],
      confidence: 0.88,
    };
  }

  return { isOffer: false, offerTarget: null, confidence: 0 };
}

/**
 * 5. Call-To-Action (CTA) Detector
 * Detects explicit commands to convert, click, download, register, comment.
 */
function detectCta(text: string): {
  isCta: boolean;
  ctaCommand: string | null;
  confidence: number;
} {
  const t = text.trim();

  const ctaPatterns = [
    /\b(klik link(?: di bio)?)\b/i,
    /\b(link di bio)\b/i,
    /\b(download\s*(?:panduan|ebook|sekarang|template)?)\b/i,
    /\b(daftar\s*(?:sekarang|gratis|di bawah)?)\b/i,
    /\b(gabung\s*(?:sekarang|komunitas)?)\b/i,
    /\b(order\s*(?:sekarang|hari ini)?)\b/i,
    /\b(beli\s*(?:sekarang|sebelum kehabisan)?)\b/i,
    /\b(komen\s*['"][^'"]+['"]|komen\s+[a-z]+)\b/i,
    /\b(dm\s*(?:saya|kami|sekarang)?)\b/i,
    /\b(swipe up|tap link|cek bio)\b/i,
    /\b(hubungi\s*(?:kami|admin|wa)?)\b/i,
  ];

  for (const pat of ctaPatterns) {
    const m = t.match(pat);
    if (m) {
      return {
        isCta: true,
        ctaCommand: m[0],
        confidence: 0.94,
      };
    }
  }

  return { isCta: false, ctaCommand: null, confidence: 0 };
}

/**
 * 6. Educational Framework / Diagram Detector
 * Detects structured concepts, steps, or multi-pillar architecture.
 */
function detectEducationalFramework(text: string): {
  isFramework: boolean;
  frameworkTarget: string | null;
  confidence: number;
} {
  const t = text.trim();

  const frameworkMatch = t.match(/\b(\d+)\s+(pilar|tahap|langkah|kunci|prinsip|alasan|metode|faktor|fondasi)\b/i);
  if (frameworkMatch) {
    return {
      isFramework: true,
      frameworkTarget: `${frameworkMatch[1]} ${capitalizeWord(frameworkMatch[2])}`,
      confidence: 0.90,
    };
  }

  if (/\b(framework|arsitektur|diagram|alur kerja|alur proses|anatomi|blueprint)\b/i.test(t)) {
    return {
      isFramework: true,
      frameworkTarget: 'Framework Structure',
      confidence: 0.85,
    };
  }

  return { isFramework: false, frameworkTarget: null, confidence: 0 };
}

/**
 * 7. Generic Context Detector
 * Detects broad world-setting or high-level introductory scene sentences.
 */
function detectGenericContext(text: string): {
  isGenericContext: boolean;
  confidence: number;
} {
  const t = text.trim();

  const contextPhrases = [
    /\bdi era digital\b/i,
    /\bsaat ini\b/i,
    /\btren\b/i,
    /\bbanyak orang\b/i,
    /\bseperti yang kita tahu\b/i,
    /\bdalam dunia\b/i,
    /\bbelakangan ini\b/i,
    /\bdewasa ini\b/i,
    /\bpersaingan bisnis\b/i,
    /\bmedia sosial\b/i,
  ];

  for (const pat of contextPhrases) {
    if (pat.test(t)) {
      return { isGenericContext: true, confidence: 0.82 };
    }
  }

  return { isGenericContext: false, confidence: 0 };
}

/**
 * Primary Directing Function: directVisualEvidence
 *
 * Takes scene context and deterministically computes the VisualEvidenceDirective.
 * Pure function with reproducible, explainable diagnostic rationale.
 */
export function directVisualEvidence(input: DirectVisualEvidenceInput): VisualEvidenceDirective {
  const { transcript, role = 'explanation', adRole, scores, index = 0, totalScenes = 1 } = input;
  const text = transcript || '';
  const textUpper = text.toUpperCase();

  const isFirstScene = index === 0 || role === 'hook' || adRole === 'hook';
  const isLastScene = (totalScenes > 1 && index >= totalScenes - 1) || role === 'cta' || adRole === 'cta';

  // --- PASS 1: TUTORIAL / UI INSTRUCTION ---
  // If user says "Klik menu Campaign lalu pilih Create", it is strictly a UI demo
  const uiCheck = detectUiInstruction(text);
  if (uiCheck.isUi) {
    return {
      visualPurpose: 'DEMO',
      preferredVisual: 'UI_DEMO',
      requiredEvidence: uiCheck.actionChain,
      genericBrollAllowed: false,
      emphasisTarget: uiCheck.target,
      motionIntent: 'HOLD',
      confidence: uiCheck.confidence,
      reason: `UI instruction detected: "${uiCheck.actionChain}". Requires UI demo walkthrough; generic B-roll rejected.`,
    };
  }

  // --- PASS 2: METRIC & NUMERICAL PROOF ---
  // If user says "CTR iklan ini cuma 0,6%, artinya kreatifnya belum cukup menarik."
  const metricCheck = detectMetricProof(text);
  if (metricCheck.isMetric) {
    const isDashboardOnly = !metricCheck.metricValue && metricCheck.hasScreenshotContext;
    const preferredVisual: PreferredVisual = isDashboardOnly ? 'SCREENSHOT' : 'METRIC';
    const requiredEvidence = metricCheck.fullEvidence;
    const emphasisTarget = metricCheck.metricValue || metricCheck.metricLabel;

    return {
      visualPurpose: 'PROOF',
      preferredVisual,
      requiredEvidence,
      genericBrollAllowed: false,
      emphasisTarget,
      motionIntent: 'HOLD_AND_HIGHLIGHT',
      confidence: metricCheck.confidence,
      reason: `Metric proof detected: "${requiredEvidence}". Holding and highlighting numeric evidence; generic B-roll rejected.`,
    };
  }

  // --- PASS 3: PRODUCT OFFER / VALUE STACK ---
  const offerCheck = detectProductOffer(text);
  if (offerCheck.isOffer || adRole === 'offer') {
    return {
      visualPurpose: 'OFFER',
      preferredVisual: 'PRODUCT',
      requiredEvidence: offerCheck.offerTarget || 'Product Offer',
      genericBrollAllowed: false,
      emphasisTarget: offerCheck.offerTarget,
      motionIntent: 'HOLD_AND_HIGHLIGHT',
      confidence: offerCheck.confidence,
      reason: `Commercial offer detected: "${offerCheck.offerTarget}". Product value focal point; generic B-roll rejected.`,
    };
  }

  // --- PASS 4: CALL TO ACTION (CTA) ---
  const ctaCheck = detectCta(text);
  if (ctaCheck.isCta || isLastScene) {
    const ctaTarget = ctaCheck.ctaCommand || 'Call to Action';
    const isUiCta = /\b(link|klik|tap|download|website|bio)\b/i.test(ctaTarget);

    return {
      visualPurpose: 'CTA',
      preferredVisual: isUiCta ? 'UI_DEMO' : 'TEXT_EMPHASIS',
      requiredEvidence: ctaTarget,
      genericBrollAllowed: false,
      emphasisTarget: ctaTarget,
      motionIntent: 'HOLD',
      confidence: ctaCheck.confidence || 0.90,
      reason: `Call-to-action conversion moment: "${ctaTarget}". Clear conversion focus; generic B-roll rejected.`,
    };
  }

  // --- PASS 5: STRUCTURED FRAMEWORK / DIAGRAM ---
  const frameworkCheck = detectEducationalFramework(text);
  if (frameworkCheck.isFramework) {
    return {
      visualPurpose: 'EXPLANATION',
      preferredVisual: 'DIAGRAM',
      requiredEvidence: frameworkCheck.frameworkTarget,
      genericBrollAllowed: false,
      emphasisTarget: frameworkCheck.frameworkTarget,
      motionIntent: 'HOLD',
      confidence: frameworkCheck.confidence,
      reason: `Structured framework detected: "${frameworkCheck.frameworkTarget}". Diagram/framework visual required; generic B-roll rejected.`,
    };
  }

  // --- PASS 6: EMOTIONAL / STORYTELLING REFLECTION ---
  // e.g. "Awalnya saya pikir iklan saya baik-baik saja."
  const emotionCheck = detectEmotionalReflection(text);
  if (emotionCheck.isEmotion || role === 'curiosity' || adRole === 'agitate' || (scores && scores.emotional_intensity >= 8)) {
    return {
      visualPurpose: 'EMOTION',
      preferredVisual: 'PERSON',
      requiredEvidence: null,
      genericBrollAllowed: true,
      emphasisTarget: null,
      motionIntent: 'SLOW_PUSH',
      confidence: emotionCheck.confidence || 0.85,
      reason: emotionCheck.emotionPhrase
        ? `Emotional storytelling phrase "${emotionCheck.emotionPhrase}". Presenter eye-contact or empathetic B-roll allowed.`
        : 'Emotional resonance scene. Presenter eye-contact or evocative B-roll allowed.',
    };
  }

  // --- PASS 7: GENERIC CONTEXT ---
  const contextCheck = detectGenericContext(text);
  if (contextCheck.isGenericContext) {
    return {
      visualPurpose: 'CONTEXT',
      preferredVisual: 'BROLL',
      requiredEvidence: null,
      genericBrollAllowed: true,
      emphasisTarget: null,
      motionIntent: 'SLOW_PUSH',
      confidence: contextCheck.confidence,
      reason: 'General context scene. High-quality contextual B-roll footage permitted.',
    };
  }

  // --- PASS 8: HOOK SCENE SPECIALIZATION ---
  if (isFirstScene) {
    return {
      visualPurpose: 'CONTEXT',
      preferredVisual: 'PERSON',
      requiredEvidence: null,
      genericBrollAllowed: false, // 0-3s Hook rule: protect speaker eye-contact from generic B-roll distraction
      emphasisTarget: null,
      motionIntent: 'STATIC',
      confidence: 0.90,
      reason: '0-3s Hook window: Presenter eye-contact lock required; generic B-roll suppressed.',
    };
  }

  // --- PASS 9: ROLE-BASED INTELLIGENT FALLBACK ---
  switch (role) {
    case 'proof':
      return {
        visualPurpose: 'PROOF',
        preferredVisual: 'METRIC',
        requiredEvidence: 'Proof Evidence',
        genericBrollAllowed: false,
        emphasisTarget: 'Proof',
        motionIntent: 'HOLD_AND_HIGHLIGHT',
        confidence: 0.80,
        reason: 'Proof role without explicit number: requiring verified proof evidence; generic B-roll rejected.',
      };

    case 'solution':
      return {
        visualPurpose: 'DEMO',
        preferredVisual: 'PRODUCT',
        requiredEvidence: 'Product Solution',
        genericBrollAllowed: false,
        emphasisTarget: 'Solution',
        motionIntent: 'HOLD',
        confidence: 0.78,
        reason: 'Solution role: Product demonstration preferred over generic background.',
      };

    case 'problem':
      return {
        visualPurpose: 'EMOTION',
        preferredVisual: 'PERSON',
        requiredEvidence: null,
        genericBrollAllowed: true,
        emphasisTarget: null,
        motionIntent: 'SLOW_PUSH',
        confidence: 0.75,
        reason: 'Problem role: Creator emotional delivery supported with contextual imagery.',
      };

    default:
      return {
        visualPurpose: 'EXPLANATION',
        preferredVisual: 'TEXT_EMPHASIS',
        requiredEvidence: null,
        genericBrollAllowed: true,
        emphasisTarget: null,
        motionIntent: 'SLOW_PUSH',
        confidence: 0.70,
        reason: 'General explanation scene: clear text emphasis and subtle camera push.',
      };
  }
}
