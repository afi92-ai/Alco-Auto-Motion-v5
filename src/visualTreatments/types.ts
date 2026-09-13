import {
  ContentRole,
  AdRole,
  VisualPurpose,
  PreferredVisual,
  VisualEvidenceDirective,
  UserProofAsset,
} from '../types';

export type TreatmentFamily =
  | 'TALKING_HEAD'
  | 'BROLL'
  | 'KINETIC_TYPOGRAPHY'
  | 'MOTION_GRAPHIC'
  | 'ANIMATED_ILLUSTRATION'
  | 'METRIC_ANIMATION'
  | 'DIAGRAM_FLOW'
  | 'SCREENSHOT_HIGHLIGHT'
  | 'UI_DEMO'
  | 'PRODUCT_SHOWCASE'
  | 'CALLOUT'
  | 'COMPARISON'
  | 'TIMELINE'
  | 'CTA';

export type TreatmentTemplateType =
  | 'NUMBER_COUNTER'
  | 'PERCENTAGE_GROWTH'
  | 'SIMPLE_BAR_CHART'
  | 'KEYWORD_POP'
  | 'CLAIM_CARD'
  | 'ARROW_FLOW'
  | 'PROCESS_STEPS'
  | 'ICON_NETWORK'
  | 'BEFORE_AFTER'
  | 'SCREENSHOT_ZOOM'
  | 'HIGHLIGHT_BOX'
  | 'PRODUCT_CARD'
  | 'ANIMATED_LIST'
  | 'TIMELINE'
  | 'CTA_ACTION'
  | 'TALKING_HEAD_FOCUS'
  | 'BROLL_CUTAWAY';

// 1. NUMBER_COUNTER
export interface NumberCounterParams {
  type: 'NUMBER_COUNTER';
  duration: number;
  label: string;
  fromValue: number;
  toValue: number;
  prefix?: string;
  suffix?: string;
  formattedTarget: string;
  emphasis: string;
  badgeText?: string;
  accentColor?: string;
}

// 2. PERCENTAGE_GROWTH
export interface PercentageGrowthParams {
  type: 'PERCENTAGE_GROWTH';
  duration: number;
  primaryText: string;
  fromValue: string;
  toValue: string;
  growthMultiplier?: string;
  emphasis: string;
  direction?: 'UP' | 'DOWN';
  subtext?: string;
  accentColor?: string;
}

// 3. SIMPLE_BAR_CHART
export interface BarChartItem {
  label: string;
  value: number;
  displayValue: string;
  highlight?: boolean;
  color?: string;
}

export interface SimpleBarChartParams {
  type: 'SIMPLE_BAR_CHART';
  duration: number;
  title: string;
  bars: BarChartItem[];
  highlightIndex: number;
  comparisonNote?: string;
  accentColor?: string;
}

// 4. KEYWORD_POP
export interface KeywordPopParams {
  type: 'KEYWORD_POP';
  duration: number;
  mainWord: string;
  supportingText?: string;
  style?: 'PUNCH' | 'GLOW' | 'BADGE' | 'NEON';
  accentColor?: string;
}

// 5. CLAIM_CARD
export interface ClaimCardParams {
  type: 'CLAIM_CARD';
  duration: number;
  title: string;
  claim: string;
  verifiedBadge?: string;
  authorOrSource?: string;
  iconType?: 'CHECK' | 'SHIELD' | 'STAR' | 'TARGET';
  accentColor?: string;
}

// 6. ARROW_FLOW
export interface FlowNode {
  label: string;
  sublabel?: string;
  highlight?: boolean;
}

export interface ArrowFlowParams {
  type: 'ARROW_FLOW';
  duration: number;
  title?: string;
  nodes: FlowNode[];
  flowDirection?: 'RIGHT' | 'DOWN';
  activeStepIndex?: number;
  accentColor?: string;
}

// 7. PROCESS_STEPS
export interface ProcessStepItem {
  stepNumber: number;
  title: string;
  desc?: string;
  status?: 'DONE' | 'ACTIVE' | 'UPCOMING';
}

export interface ProcessStepsParams {
  type: 'PROCESS_STEPS';
  duration: number;
  title?: string;
  steps: ProcessStepItem[];
  activeStep: number;
  accentColor?: string;
}

// 8. ICON_NETWORK
export interface NetworkNode {
  label: string;
  icon: string;
  highlight?: boolean;
}

export interface IconNetworkParams {
  type: 'ICON_NETWORK';
  duration: number;
  centerNode: { label: string; icon: string };
  orbitNodes: NetworkNode[];
  accentColor?: string;
}

// 9. BEFORE_AFTER
export interface BeforeAfterParams {
  type: 'BEFORE_AFTER';
  duration: number;
  title: string;
  beforeLabel: string;
  beforeText: string;
  afterLabel: string;
  afterText: string;
  improvementMetric?: string;
  assetUrl?: string;
  accentColor?: string;
}

// 10. SCREENSHOT_ZOOM
export interface ScreenshotZoomParams {
  type: 'SCREENSHOT_ZOOM';
  duration: number;
  assetUrl: string;
  caption: string;
  zoomLevel: number;
  focalPoint?: { xPercent: number; yPercent: number };
  borderGlow?: string;
  badge?: string;
  accentColor?: string;
}

// 11. HIGHLIGHT_BOX
export interface HighlightBoxParams {
  type: 'HIGHLIGHT_BOX';
  duration: number;
  targetLabel: string;
  highlightArea: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  };
  calloutText: string;
  highlightColor?: string;
  assetUrl?: string;
}

// 12. PRODUCT_CARD
export interface ProductCardParams {
  type: 'PRODUCT_CARD';
  duration: number;
  productName: string;
  badge: string;
  offerPrice?: string;
  originalPrice?: string;
  features: string[];
  assetUrl?: string;
  urgencyText?: string;
  accentColor?: string;
}

// 13. ANIMATED_LIST
export interface ListItem {
  text: string;
  icon?: string;
  highlight?: boolean;
}

export interface AnimatedListParams {
  type: 'ANIMATED_LIST';
  duration: number;
  headline: string;
  items: ListItem[];
  listType?: 'CHECKLIST' | 'BULLETS' | 'NUMBERED';
  activeItemIndex?: number;
  accentColor?: string;
}

// 14. TIMELINE
export interface MilestoneItem {
  timeLabel: string;
  title: string;
  desc?: string;
  active?: boolean;
}

export interface TimelineParams {
  type: 'TIMELINE';
  duration: number;
  title: string;
  milestones: MilestoneItem[];
  currentMilestoneIndex: number;
  accentColor?: string;
}

// 15. CTA_ACTION
export interface CtaActionParams {
  type: 'CTA_ACTION';
  duration: number;
  headline: string;
  actionButtonText: string;
  urgencyNote?: string;
  directionArrow?: boolean;
  style?: 'PILL' | 'CARD' | 'MINIMAL_BANNER';
  accentColor?: string;
}

// Fallback: TALKING_HEAD_FOCUS
export interface TalkingHeadFocusParams {
  type: 'TALKING_HEAD_FOCUS';
  duration: number;
  framing: string;
  subtleZoom: boolean;
}

// Fallback: BROLL_CUTAWAY
export interface BrollCutawayParams {
  type: 'BROLL_CUTAWAY';
  duration: number;
  assetUrl: string;
  query: string;
  visualIntent?: string;
}

export type AnyTreatmentParams =
  | NumberCounterParams
  | PercentageGrowthParams
  | SimpleBarChartParams
  | KeywordPopParams
  | ClaimCardParams
  | ArrowFlowParams
  | ProcessStepsParams
  | IconNetworkParams
  | BeforeAfterParams
  | ScreenshotZoomParams
  | HighlightBoxParams
  | ProductCardParams
  | AnimatedListParams
  | TimelineParams
  | CtaActionParams
  | TalkingHeadFocusParams
  | BrollCutawayParams;

export interface VisualEvidenceResolution {
  status: 'EXACT_EVIDENCE' | 'RELATED_EVIDENCE' | 'NO_EVIDENCE';
  resolvedAsset: UserProofAsset | null;
  metricData?: {
    rawTranscriptText: string;
    primaryNumber?: number;
    fromValue?: string;
    toValue?: string;
    multiplier?: string;
    label?: string;
  };
  evidenceType?: string;
  confidence: number;
  reason: string;
}

export interface VisualTreatmentPlan {
  family: TreatmentFamily;
  template: TreatmentTemplateType;
  duration: number;
  params: AnyTreatmentParams;
  rationale: string;
  sourceDirective?: VisualEvidenceDirective;
  evidenceResolved: boolean;
  requiresHold: boolean;
  placement: 'CENTER' | 'UPPER_THIRD' | 'LOWER_THIRD' | 'FULL_SCREEN';
}

export interface RouteTreatmentContext {
  role: ContentRole;
  adRole?: AdRole;
  visualPurpose: VisualPurpose;
  preferredVisual: PreferredVisual;
  directive?: VisualEvidenceDirective;
  resolution: VisualEvidenceResolution;
  emphasisTarget: string | null;
  motionIntent: string;
  transcript: string;
  duration: number;
  availableUserAssets: UserProofAsset[];
  sceneIndex: number;
  totalScenes: number;
}
