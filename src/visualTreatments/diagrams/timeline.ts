import { TimelineParams, RouteTreatmentContext } from '../types';

export function buildTimelineParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<TimelineParams>
): TimelineParams {
  return {
    type: 'TIMELINE',
    duration: Math.min(ctx.duration, 3.0),
    title: 'ROADMAP EKSEKUSI',
    milestones: [
      { timeLabel: 'Hari 1', title: 'Setup & Hook', desc: 'Riset pola audiens' },
      { timeLabel: 'Hari 7', title: 'Launch Creative', desc: 'Validasi testing', active: true },
      { timeLabel: 'Hari 30', title: 'Scale Profit', desc: 'Gandakan budget stabil' },
    ],
    currentMilestoneIndex: 1,
    accentColor: '#8b5cf6',
    ...overrides,
  };
}
