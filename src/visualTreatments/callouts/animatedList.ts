import { AnimatedListParams, RouteTreatmentContext, ListItem } from '../types';
import { ExtractedListContent } from '../contentExtractor';

export function buildAnimatedListParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedListContent,
  overrides?: Partial<AnimatedListParams>
): AnimatedListParams {
  const headline = extracted?.headline || ctx.emphasisTarget || 'POIN UTAMA';
  const items: ListItem[] = extracted && extracted.items.length > 0
    ? extracted.items.map((text, idx) => ({
        text,
        icon: 'CHECK',
        highlight: idx === 0,
      }))
    : [{ text: ctx.emphasisTarget || 'Poin Pembahasan', icon: 'CHECK', highlight: true }];

  return {
    type: 'ANIMATED_LIST',
    duration: Math.min(ctx.duration, 3.2),
    headline,
    items,
    listType: 'CHECKLIST',
    activeItemIndex: 0,
    accentColor: '#f43f5e',
    ...overrides,
  };
}
