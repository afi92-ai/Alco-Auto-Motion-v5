import {
  RouteTreatmentContext,
  VisualTreatmentPlan,
} from './types';
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
 * Visual Treatment Router (Hardened)
 * Central decision router selecting optimal programmatic or asset-backed treatment
 * based on Scene Intelligence, Visual Evidence Director, and Visual Evidence Resolution.
 * 
 * Strict safety rules:
 * 1. No fabricated factual content or fake metrics.
 * 2. Metric visual treatments require verified transcript numbers or authentic metadata.
 * 3. Before/After requires genuine contrast data.
 * 4. Animated List requires structurally extractable items.
 * 5. Strict fallback hierarchy: Authentic Evidence -> Structured Motion -> Text Emphasis -> Talking Head.
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

  // 1. EXTRACT STRUCTURED CONTENT FROM TRANSCRIPT & CONTEXT
  const metricContent = extractMetricContent(transcript);
  const listContent = extractListItems(transcript);
  const beforeAfterContent = extractBeforeAfterContent(transcript);
  const processContent = extractProcessSteps(transcript);
  const timelineContent = extractTimelineContent(transcript);
  const ctaContent = extractCtaContent(transcript, ctx.emphasisTarget);
  const productContent = extractProductContent(transcript, ctx.emphasisTarget);
  const claimContent = extractClaimContent(transcript, ctx.emphasisTarget);
  const networkContent = extractNetworkContent(transcript, ctx.emphasisTarget);

  // 2. CTA MOMENT
  if (role === 'cta' || adRole === 'cta' || visualPurpose === 'CTA') {
    return {
      family: 'CTA',
      template: 'CTA_ACTION',
      duration: Math.min(duration, 2.8),
      params: buildCtaActionParams(ctx, ctaContent),
      rationale: 'CTA intent detected: deploying high-visibility action card with directional prompt.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: true,
      placement: 'UPPER_THIRD',
    };
  }

  // 3. COMMERCIAL OFFER / PRODUCT
  if (
    adRole === 'offer' ||
    visualPurpose === 'OFFER' ||
    (/DISKON|PENAWARAN|HARGA|PRODUK|PROMO|OFFER|BELI|INVESTASI/i.test(textUpper) && role === 'solution')
  ) {
    return {
      family: 'PRODUCT_SHOWCASE',
      template: 'PRODUCT_CARD',
      duration: Math.min(duration, 3.2),
      params: buildProductCardParams(ctx, productContent),
      rationale: 'Commercial offer moment detected: deploying structured product showcase card.',
      sourceDirective: directive,
      evidenceResolved: resolution.status === 'EXACT_EVIDENCE',
      requiresHold: true,
      placement: 'UPPER_THIRD',
    };
  }

  // 4. COMPARISON (BEFORE / AFTER)
  // Only route to BEFORE_AFTER if genuine contrast could be extracted
  if (
    textUpper.includes('BEFORE AFTER') ||
    textUpper.includes('DULU') ||
    textUpper.includes('SEKARANG') ||
    textUpper.includes('CARA LAMA') ||
    textUpper.includes('BEDANYA') ||
    (role === 'curiosity' && /BEDANYA|BANDINGKAN|VS|DARIPADA/i.test(textUpper))
  ) {
    if (beforeAfterContent.confidence >= 0.7) {
      return {
        family: 'COMPARISON',
        template: 'BEFORE_AFTER',
        duration: Math.min(duration, 3.0),
        params: buildBeforeAfterParams(ctx, beforeAfterContent),
        rationale: 'Contrast/comparison detected with extractable states: deploying Before/After split card.',
        sourceDirective: directive,
        evidenceResolved: resolution.status === 'EXACT_EVIDENCE',
        requiresHold: true,
        placement: 'UPPER_THIRD',
      };
    }
    // Contrast failed to extract -> fallback to Text Emphasis (Claim Card or Keyword Pop)
    return {
      family: 'KINETIC_TYPOGRAPHY',
      template: 'CLAIM_CARD',
      duration: Math.min(duration, 2.8),
      params: buildClaimCardParams(ctx, claimContent),
      rationale: 'Comparative intent detected without two distinct states: falling back to Claim Card.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: false,
      placement: 'UPPER_THIRD',
    };
  }

  // 5. METRIC / PROOF MOMENTS (STRICT HARDENING)
  if (
    visualPurpose === 'PROOF' ||
    preferredVisual === 'METRIC' ||
    role === 'proof' ||
    resolution.metricData !== undefined
  ) {
    // 5A. Exact authentic screenshot evidence exists (Tier 1 Fallback)
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

    // 5B. Evidence unavailable -> Check for real numeric data in transcript or resolution
    const hasRealNumeric =
      metricContent.confidence >= 0.7 ||
      Boolean(
        resolution.metricData &&
          (resolution.metricData.fromValue ||
            resolution.metricData.toValue ||
            resolution.metricData.primaryNumber !== undefined)
      );

    if (hasRealNumeric) {
      // 5B.1. Percentage Growth: e.g. "naik dari 1% menjadi 3%"
      if (metricContent.isPercentageGrowth && metricContent.fromValue && metricContent.toValue) {
        return {
          family: 'METRIC_ANIMATION',
          template: 'PERCENTAGE_GROWTH',
          duration: Math.max(2.2, Math.min(duration, 3.0)),
          params: buildPercentageGrowthParams(ctx, metricContent),
          rationale: 'Deploying native Percentage Growth animation from verified transcript numbers.',
          sourceDirective: directive,
          evidenceResolved: false,
          requiresHold: true,
          placement: 'CENTER',
        };
      }

      // 5B.2. Comparative Bar Chart: e.g. comparative multiplier
      if (metricContent.isComparison && metricContent.fromValue && metricContent.toValue) {
        return {
          family: 'METRIC_ANIMATION',
          template: 'SIMPLE_BAR_CHART',
          duration: Math.max(2.2, Math.min(duration, 3.0)),
          params: buildSimpleBarChartParams(ctx, metricContent),
          rationale: 'Deploying programmatic Simple Bar Chart for comparative metric.',
          sourceDirective: directive,
          evidenceResolved: false,
          requiresHold: true,
          placement: 'CENTER',
        };
      }

      // 5B.3. Single Achievement Number Counter
      return {
        family: 'METRIC_ANIMATION',
        template: 'NUMBER_COUNTER',
        duration: Math.max(2.2, Math.min(duration, 3.0)),
        params: buildNumberCounterParams(ctx, metricContent),
        rationale: 'Deploying programmatic Number Counter for empirical milestone.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: true,
        placement: 'CENTER',
      };
    }

    // 5C. Proof moment WITHOUT numbers and WITHOUT authentic evidence:
    // Strictly forbid fake counters or fabricated metrics!
    // Fallback Tier 3: Text Emphasis (Claim Card or Keyword Pop)
    if (ctx.emphasisTarget) {
      return {
        family: 'KINETIC_TYPOGRAPHY',
        template: 'KEYWORD_POP',
        duration: Math.min(duration, 2.0),
        params: buildKeywordPopParams(ctx, { mainWord: ctx.emphasisTarget.toUpperCase() }),
        rationale: 'Proof moment without numeric data: falling back to Keyword Pop on emphasis target.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'UPPER_THIRD',
      };
    }

    return {
      family: 'KINETIC_TYPOGRAPHY',
      template: 'CLAIM_CARD',
      duration: Math.min(duration, 2.8),
      params: buildClaimCardParams(ctx, claimContent),
      rationale: 'Proof moment without numeric data: falling back to Claim Card with transcript quote.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: false,
      placement: 'UPPER_THIRD',
    };
  }

  // 6. UI DEMO MOMENTS
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

    if (processContent.confidence >= 0.7) {
      return {
        family: 'DIAGRAM_FLOW',
        template: 'PROCESS_STEPS',
        duration: Math.min(duration, 3.2),
        params: buildProcessStepsParams(ctx, processContent),
        rationale: 'UI Demo directive without user screenshot: deploying extracted Process Steps workflow.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    return {
      family: 'KINETIC_TYPOGRAPHY',
      template: 'CLAIM_CARD',
      duration: Math.min(duration, 2.8),
      params: buildClaimCardParams(ctx, claimContent),
      rationale: 'UI Demo directive without asset or steps: deploying Claim Card.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: false,
      placement: 'UPPER_THIRD',
    };
  }

  // 7. PROCESS / FLOW / TIMELINE EXPLANATION
  if (
    visualPurpose === 'EXPLANATION' ||
    role === 'explanation' ||
    adRole === 'insight' ||
    adRole === 'solution'
  ) {
    // 7A. Chronological / Timeline (requires valid milestones)
    if (timelineContent.confidence >= 0.7) {
      return {
        family: 'TIMELINE',
        template: 'TIMELINE',
        duration: Math.min(duration, 3.0),
        params: buildTimelineParams(ctx, timelineContent),
        rationale: 'Extracted timeline milestones: deploying Timeline visual.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 7B. Multiple points / Checklist / Errors (requires valid list extraction)
    if (listContent.confidence >= 0.7) {
      return {
        family: 'CALLOUT',
        template: 'ANIMATED_LIST',
        duration: Math.min(duration, 3.0),
        params: buildAnimatedListParams(ctx, listContent),
        rationale: 'Multiple distinct points extracted: deploying Animated List checklist.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 7C. Sequential Process
    if (processContent.confidence >= 0.7) {
      return {
        family: 'DIAGRAM_FLOW',
        template: 'ARROW_FLOW',
        duration: Math.min(duration, 3.0),
        params: buildArrowFlowParams(ctx, processContent),
        rationale: 'System process/flow extracted: deploying connected Arrow Flow diagram.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 7D. Ecosystem / Multi-feature Icon Network
    // Strictly requires valid extracted nodes (>= 3 distinct components)
    if (networkContent.confidence >= 0.7 && networkContent.nodes.length >= 3) {
      return {
        family: 'ANIMATED_ILLUSTRATION',
        template: 'ICON_NETWORK',
        duration: Math.min(duration, 3.2),
        params: buildIconNetworkParams(ctx, networkContent),
        rationale: 'Connected system/ecosystem nodes extracted from transcript: deploying dynamic Icon Network.',
        sourceDirective: directive,
        evidenceResolved: false,
        requiresHold: false,
        placement: 'CENTER',
      };
    }

    // 7E. Fallback for explanation: Claim Card
    return {
      family: 'KINETIC_TYPOGRAPHY',
      template: 'CLAIM_CARD',
      duration: Math.min(duration, 2.8),
      params: buildClaimCardParams(ctx, claimContent),
      rationale: 'Conceptual insight detected: deploying Claim Card.',
      sourceDirective: directive,
      evidenceResolved: false,
      requiresHold: false,
      placement: 'UPPER_THIRD',
    };
  }

  // 8. HOOK MOMENT (0-3s)
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

  // 9. DEFAULT / NARRATIVE / EMOTION -> TALKING HEAD FOCUS (Tier 4 Fallback)
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
