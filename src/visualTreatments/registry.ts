import { TreatmentFamily, TreatmentTemplateType } from './types';
import { ContentRole } from '../types';

export interface TreatmentTemplateMeta {
  template: TreatmentTemplateType;
  family: TreatmentFamily;
  name: string;
  description: string;
  supportedRoles: ContentRole[];
  requiresUserAsset: boolean;
  isProgrammaticGraphic: boolean;
  defaultDuration: number;
  defaultPlacement: 'CENTER' | 'UPPER_THIRD' | 'LOWER_THIRD' | 'FULL_SCREEN';
}

export const TREATMENT_REGISTRY: Record<TreatmentTemplateType, TreatmentTemplateMeta> = {
  // --- METRIC_ANIMATION FAMILY ---
  NUMBER_COUNTER: {
    template: 'NUMBER_COUNTER',
    family: 'METRIC_ANIMATION',
    name: 'Number Counter',
    description: 'Dynamic animated count-up with high-contrast badge for revenue, multiple, or metric milestones.',
    supportedRoles: ['proof', 'solution', 'hook'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.4,
    defaultPlacement: 'CENTER',
  },
  PERCENTAGE_GROWTH: {
    template: 'PERCENTAGE_GROWTH',
    family: 'METRIC_ANIMATION',
    name: 'Percentage Growth',
    description: 'Direct comparison animation showing baseline percentage expanding to target (e.g. 1% to 3% CTR).',
    supportedRoles: ['proof', 'solution', 'curiosity'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.6,
    defaultPlacement: 'CENTER',
  },
  SIMPLE_BAR_CHART: {
    template: 'SIMPLE_BAR_CHART',
    family: 'METRIC_ANIMATION',
    name: 'Simple Bar Chart',
    description: 'Minimalist programmatic 2-3 bar comparison chart highlighting conversion or ROAS advantage.',
    supportedRoles: ['proof', 'solution'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.8,
    defaultPlacement: 'CENTER',
  },

  // --- KINETIC_TYPOGRAPHY FAMILY ---
  KEYWORD_POP: {
    template: 'KEYWORD_POP',
    family: 'KINETIC_TYPOGRAPHY',
    name: 'Keyword Pop',
    description: 'High-energy kinetic typography punch badge designed for 0-3s hooks and emotional emphasis.',
    supportedRoles: ['hook', 'problem', 'curiosity'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 1.8,
    defaultPlacement: 'UPPER_THIRD',
  },
  CLAIM_CARD: {
    template: 'CLAIM_CARD',
    family: 'KINETIC_TYPOGRAPHY',
    name: 'Claim Card',
    description: 'Credibility statement card with verified badge and high-contrast typographic hierarchy.',
    supportedRoles: ['hook', 'proof', 'solution'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.5,
    defaultPlacement: 'UPPER_THIRD',
  },

  // --- DIAGRAM_FLOW FAMILY ---
  ARROW_FLOW: {
    template: 'ARROW_FLOW',
    family: 'DIAGRAM_FLOW',
    name: 'Arrow Flow',
    description: 'Connected node workflow demonstrating sequence of steps, causality, or progression.',
    supportedRoles: ['explanation', 'solution', 'curiosity'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.8,
    defaultPlacement: 'CENTER',
  },
  PROCESS_STEPS: {
    template: 'PROCESS_STEPS',
    family: 'DIAGRAM_FLOW',
    name: 'Process Steps',
    description: 'Sequential 1-2-3 numbered cards with progressive highlight indicating the active step.',
    supportedRoles: ['explanation', 'solution'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 3.0,
    defaultPlacement: 'CENTER',
  },

  // --- ANIMATED_ILLUSTRATION FAMILY ---
  ICON_NETWORK: {
    template: 'ICON_NETWORK',
    family: 'ANIMATED_ILLUSTRATION',
    name: 'Icon Network',
    description: 'Central concept orb with orbital feature nodes demonstrating ecosystem integration.',
    supportedRoles: ['solution', 'explanation', 'curiosity'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.8,
    defaultPlacement: 'CENTER',
  },

  // --- COMPARISON FAMILY ---
  BEFORE_AFTER: {
    template: 'BEFORE_AFTER',
    family: 'COMPARISON',
    name: 'Before / After Card',
    description: 'Side-by-side or split contrast comparing old friction vs new accelerated framework.',
    supportedRoles: ['curiosity', 'problem', 'proof', 'solution'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.8,
    defaultPlacement: 'UPPER_THIRD',
  },

  // --- SCREENSHOT_HIGHLIGHT FAMILY ---
  SCREENSHOT_ZOOM: {
    template: 'SCREENSHOT_ZOOM',
    family: 'SCREENSHOT_HIGHLIGHT',
    name: 'Screenshot Zoom',
    description: 'Framed authentic user dashboard/screenshot with subtle focal push and verified glow border.',
    supportedRoles: ['proof', 'solution'],
    requiresUserAsset: true,
    isProgrammaticGraphic: false,
    defaultDuration: 2.8,
    defaultPlacement: 'CENTER',
  },
  HIGHLIGHT_BOX: {
    template: 'HIGHLIGHT_BOX',
    family: 'SCREENSHOT_HIGHLIGHT',
    name: 'Highlight Box',
    description: 'Targeted callout highlight ring focusing viewers directly onto evidence coordinates.',
    supportedRoles: ['proof', 'explanation'],
    requiresUserAsset: true,
    isProgrammaticGraphic: false,
    defaultDuration: 2.5,
    defaultPlacement: 'CENTER',
  },

  // --- PRODUCT_SHOWCASE FAMILY ---
  PRODUCT_CARD: {
    template: 'PRODUCT_CARD',
    family: 'PRODUCT_SHOWCASE',
    name: 'Product Card',
    description: 'Structured direct-response commercial offer card with feature list and price/discount tag.',
    supportedRoles: ['solution', 'cta'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 3.0,
    defaultPlacement: 'UPPER_THIRD',
  },

  // --- CALLOUT FAMILY ---
  ANIMATED_LIST: {
    template: 'ANIMATED_LIST',
    family: 'CALLOUT',
    name: 'Animated List',
    description: 'Sequential checklist or numbered bullet cards breaking down multiple distinct points.',
    supportedRoles: ['explanation', 'problem', 'solution'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.8,
    defaultPlacement: 'CENTER',
  },

  // --- TIMELINE FAMILY ---
  TIMELINE: {
    template: 'TIMELINE',
    family: 'TIMELINE',
    name: 'Timeline Milestones',
    description: 'Chronological roadmap displaying milestone points over time (Day 1, Day 7, Day 30).',
    supportedRoles: ['explanation', 'solution', 'proof'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.8,
    defaultPlacement: 'CENTER',
  },

  // --- CTA FAMILY ---
  CTA_ACTION: {
    template: 'CTA_ACTION',
    family: 'CTA',
    name: 'CTA Action Card',
    description: 'High-conversion call-to-action banner with pulsing button and action indicator.',
    supportedRoles: ['cta'],
    requiresUserAsset: false,
    isProgrammaticGraphic: true,
    defaultDuration: 2.5,
    defaultPlacement: 'UPPER_THIRD',
  },

  // --- TALKING_HEAD & BROLL FALLBACKS ---
  TALKING_HEAD_FOCUS: {
    template: 'TALKING_HEAD_FOCUS',
    family: 'TALKING_HEAD',
    name: 'Talking Head Focus',
    description: 'Clean presenter focus with safe-zone typography and no disruptive graphics.',
    supportedRoles: ['hook', 'problem', 'curiosity', 'explanation', 'solution', 'proof', 'cta'],
    requiresUserAsset: false,
    isProgrammaticGraphic: false,
    defaultDuration: 2.0,
    defaultPlacement: 'FULL_SCREEN',
  },
  BROLL_CUTAWAY: {
    template: 'BROLL_CUTAWAY',
    family: 'BROLL',
    name: 'B-Roll Cutaway',
    description: 'Contextual b-roll overlay when visual narrative calls for relevant illustrative footage.',
    supportedRoles: ['problem', 'explanation', 'curiosity'],
    requiresUserAsset: false,
    isProgrammaticGraphic: false,
    defaultDuration: 2.2,
    defaultPlacement: 'UPPER_THIRD',
  },
};

export function getTemplateMeta(template: TreatmentTemplateType): TreatmentTemplateMeta {
  return TREATMENT_REGISTRY[template] || TREATMENT_REGISTRY.TALKING_HEAD_FOCUS;
}

export function getTemplatesForFamily(family: TreatmentFamily): TreatmentTemplateMeta[] {
  return Object.values(TREATMENT_REGISTRY).filter((t) => t.family === family);
}
