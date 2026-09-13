import {
  RouteTreatmentContext,
  VisualTreatmentPlan,
  TreatmentFamily,
  TreatmentTemplateType,
} from './types';
import { buildNumberCounterParams } from './metrics/counter';
import { buildPercentageGrowthParams } from './metrics/growth';
import { buildSimpleBarChartParams } from './metrics/chart';
import { buildKeywordPopParams } from './typography/keywordPop';
import { buildClaimCardParams } from './typography/claimCard';
import { buildArrowFlowParams } from './diagrams/arrowFlow';
import { buildProcessStepsParams } from './diagrams/processSteps';
import { buildTimelineParams } from './diagrams/timeline';
import { buildAnimatedListParams } from './callouts/animatedList';
import { buildCtaActionParams } from './callouts/ctaAction';
import { buildBeforeAfterParams } from './comparisons/beforeAfter';
import { buildProductCardParams } from './product/productCard';
import { buildScreenshotZoomParams } from './screenshot/screenshotZoom';
import { buildHighlightBoxParams } from './screenshot/highlightBox';
import { buildIconNetworkParams } from './illustration/iconNetwork';

/**
 * Visual Treatment Router
 * Central decision router selecting optimal programmatic or asset-backed treatment
 * based on Scene Intelligence, Visual Evidence Director, and Visual Evidence Resolution.
 * Strictly avoids AI image generation and fabricated evidence.
 */
export function routeVisualTreatment(ctx: RouteTreatmentContext): VisualTreatmentPlan {
  const {
    role,
    adRole,
    visualPurpose,
    preferredVisual,
    directive,
    resolution,
    transcript,
    duration,
  } = ctx;

  const textUpper = transcript.toUpperCase();

  // 1. CTA MOMENT
  if (role === 'cta' || adRole === 'cta' || visualPurpose === 'CTA') {
    return {
      family: 'CTA',
      template: 'CTA_ACTION',
      duration: Math.min(duration, 2.8),
      params: buildCtaActionParams(ctx),
      rationale: 'CTA intent detected: deploying high-visibility action card with directional prompt.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: true,
      placement: 'UPPER_THIRD',
    };
  }

  // 2. COMMERCIAL OFFER / PRODUCT
  if (
    adRole === 'offer' ||
    visualPurpose === 'OFFER' ||
    (/DISKON|PENAWARAN|HARGA|PRODUK|PROMO|OFFER|BELI|INVESTASI/i.test(textUpper) && role === 'solution')
  ) {
    return {
      family: 'PRODUCT_SHOWCASE',
      template: 'PRODUCT_CARD',
      duration: Math.min(duration, 3.2),
      params: buildProductCardParams(ctx),
      rationale: 'Commercial offer moment detected: deploying structured product showcase card.',
      sourceDirective: directive,
      evidenceResolved: resolution.status === 'EXACT_EVIDENCE',
      requiresHold: true,
      placement: 'UPPER_THIRD',
    };
  }

  // 3. COMPARISON (BEFORE / AFTER)
  if (
    textUpper.includes('BEFORE AFTER') ||
    textUpper.includes('DULU') ||
    textUpper.includes('SEKARANG') ||
    textUpper.includes('CARA LAMA') ||
    textUpper.includes('BEDANYA') ||
    (role === 'curiosity' && /BEDANYA|BANDINGKAN|VS|DARIPADA/i.test(textUpper))
  ) {
    return {
      family: 'COMPARISON',
      template: 'BEFORE_AFTER',
      duration: Math.min(duration, 3.0),
      params: buildBeforeAfterParams(ctx),
      rationale: 'Contrast/comparison detected: deploying Before/After split card.',
      sourceDirective: directive,
      evidenceResolved: resolution.status === 'EXACT_EVIDENCE',
      requiresHold: true,
      placement: 'UPPER_THIRD',
    };
  }

  // 4. METRIC / PROOF MOMENTS
  if (
    visualPurpose === 'PROOF' ||
    preferredVisual === 'METRIC' ||
    role === 'proof' ||
    resolution.metricData !== undefined
  ) {
    // 4A. Exact authentic screenshot evidence exists
    if (resolution.status === 'EXACT_EVIDENCE' && resolution.resolvedAsset) {
      if (directive?.motionIntent === 'HOLD_AND_HIGHLIGHT') {
        return {
          family: 'SCREENSHOT_HIGHLIGHT',
          template: 'HIGHLIGHT_BOX',
          duration: Math.max(2.4, Math.min(duration, 3.2)),
          params: buildHighlightBoxParams(ctx),
          rationale: 'Exact user screenshot matched with focal highlight intent: deploying Highlight Box on authentic asset.',
          sourceDirective: directive,
          evidenceResolved: true,
          requiresHold: true,
          placement: 'CENTER',
        };
      }

      return {
        family: 'SCREENSHOT_HIGHLIGHT',
        template: 'SCREENSHOT_ZOOM',
        duration: Math.max(2.4, Math.min(duration, 3.2)),
        params: buildScreenshotZoomParams(ctx),
        rationale: 'Exact user screenshot matched: deploying Screenshot Zoom with focal border glow.',
        sourceDirective: directive,
        evidenceResolved: true,
        requiresHold: true,
        placement: 'CENTER',
      };
    }

    // 4B. Evidence unavailable -> Programmatic Native Graphic (Do NOT fabricate evidence!)
    if (resolution.metricData?.fromValue && resolution.metricData?.toValue && /%|CTR|KONVERSI/i.test(textUpper)) {
      return {
        family: 'METRIC_ANIMATION',
        template: 'PERCENTAGE_GROWTH',
        duration: Math.max(2.2, Math.min(duration, 3.0)),
        params: buildPercentageGrowthParams(ctx),
        rationale: 'Evidence unavailable: deploying native Percentage Growth metric animation from transcript numbers.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: true,
        placement: 'CENTER',
      };
    }

    if (/BANDING|COMPARE|LEBIH TINGGI|ROAS/i.test(textUpper) && /X|KALI/i.test(textUpper)) {
      return {
        family: 'METRIC_ANIMATION',
        template: 'SIMPLE_BAR_CHART',
        duration: Math.max(2.2, Math.min(duration, 3.0)),
        params: buildSimpleBarChartParams(ctx),
        rationale: 'Evidence unavailable: deploying programmatic Simple Bar Chart for comparative ROAS metric.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: true,
        placement: 'CENTER',
      };
    }

    return {
      family: 'METRIC_ANIMATION',
      template: 'NUMBER_COUNTER',
      duration: Math.max(2.2, Math.min(duration, 3.0)),
      params: buildNumberCounterParams(ctx),
      rationale: 'Evidence unavailable: deploying programmatic Number Counter for empirical milestone.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: true,
      placement: 'CENTER',
    };
  }

  // 5. UI DEMO MOMENTS
  if (visualPurpose === 'DEMO' || preferredVisual === 'UI_DEMO' || adRole === 'demo') {
    if (resolution.status === 'EXACT_EVIDENCE' && resolution.resolvedAsset) {
      return {
        family: 'SCREENSHOT_HIGHLIGHT',
        template: 'SCREENSHOT_ZOOM',
        duration: Math.min(duration, 3.0),
        params: buildScreenshotZoomParams(ctx),
        rationale: 'UI Demo directive with authentic screenshot matched: deploying Screenshot Zoom.',
        sourceDirective: directive,
        evidenceResolved: true,
        requiresHold: true,
        placement: 'CENTER',
      };
    }

    // Fallback without fake evidence: Process steps or arrow flow
    return {
      family: 'DIAGRAM_FLOW',
      template: 'PROCESS_STEPS',
      duration: Math.min(duration, 3.2),
      params: buildProcessStepsParams(ctx),
      rationale: 'UI Demo directive without user screenshot: deploying programmatic Process Steps workflow.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: false,
      placement: 'CENTER',
    };
  }

  // 6. PROCESS / FLOW / TIMELINE EXPLANATION
  if (
    visualPurpose === 'EXPLANATION' ||
    role === 'explanation' ||
    adRole === 'insight' ||
    adRole === 'solution'
  ) {
    // 6A. Chronological / Timeline
    if (/HARI|MINGGU|BULAN|ROADMAP|JANGKA|WAKTU|TAHAP/i.test(textUpper)) {
      return {
        family: 'TIMELINE',
        template: 'TIMELINE',
        duration: Math.min(duration, 3.0),
        params: buildTimelineParams(ctx),
        rationale: 'Timeline/progression keywords detected: deploying Timeline Milestones.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 6B. Multiple points / Checklist / Errors
    if (/KESALAHAN|ALASAN|FAKTOR|TIPS|HAL|POIN|DAFTAR|MASALAH/i.test(textUpper) || textUpper.includes('3 ') || textUpper.includes('4 ')) {
      return {
        family: 'CALLOUT',
        template: 'ANIMATED_LIST',
        duration: Math.min(duration, 3.0),
        params: buildAnimatedListParams(ctx),
        rationale: 'Multiple distinct points detected: deploying Animated List checklist.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 6C. Sequential Process
    if (/LANGKAH|CARA|STEP|ALUR|SISTEM|PROSES|TUTORIAL/i.test(textUpper)) {
      return {
        family: 'DIAGRAM_FLOW',
        template: 'ARROW_FLOW',
        duration: Math.min(duration, 3.0),
        params: buildArrowFlowParams(ctx),
        rationale: 'System process/flow detected: deploying connected Arrow Flow diagram.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 6D. Ecosystem / Multi-feature
    if (/INTEGRASI|FITUR|ALL-IN-ONE|ENGIN|EKOSISTEM/i.test(textUpper)) {
      return {
        family: 'ANIMATED_ILLUSTRATION',
        template: 'ICON_NETWORK',
        duration: Math.min(duration, 3.0),
        params: buildIconNetworkParams(ctx),
        rationale: 'Feature network/ecosystem detected: deploying Icon Network illustration.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 6E. Insight / Claim
    return {
      family: 'KINETIC_TYPOGRAPHY',
      template: 'CLAIM_CARD',
      duration: Math.min(duration, 2.8),
      params: buildClaimCardParams(ctx),
      rationale: 'Conceptual insight detected: deploying verified Claim Card.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: false,
      placement: 'UPPER_THIRD',
    };
  }

  // 7. HOOK MOMENT (0-3s)
  if (role === 'hook' || adRole === 'hook') {
    return {
      family: 'KINETIC_TYPOGRAPHY',
      template: 'KEYWORD_POP',
      duration: Math.min(duration, 2.0),
      params: buildKeywordPopParams(ctx),
      rationale: '0-3s Hook pattern interrupt: deploying high-energy Keyword Pop punch.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: false,
      placement: 'UPPER_THIRD',
    };
  }

  // 8. STORY / EMOTION / PROBLEM -> TALKING HEAD FOCUS (or subtle B-Roll)
  return {
    family: 'TALKING_HEAD',
    template: 'TALKING_HEAD_FOCUS',
    duration: Math.min(duration, 2.5),
    params: {
      type: 'TALKING_HEAD_FOCUS',
      duration: Math.min(duration, 2.5),
      framing: 'PRESENTER_CENTERED',
      subtleZoom: true,
    },
    rationale: 'Narrative emotional moment: maintaining presenter focus without cluttering overlays.',
    sourceDirective: directive,
    evidenceResolved: false,
    requiresHold: false,
    placement: 'FULL_SCREEN',
  };
}
