import { TimelineParams, RouteTreatmentContext, MilestoneItem } from '../types';
import { ExtractedTimelineContent } from '../contentExtractor';

export function buildTimelineParams(
  ctx: RouteTreatmentContext,
  extracted?: ExtractedTimelineContent,
  overrides?: Partial<TimelineParams>
): TimelineParams {
  const milestones: MilestoneItem[] = extracted && extracted.milestones.length >= 2
    ? extracted.milestones.map((m, idx) => ({
        timeLabel: m.timeLabel,
        title: m.title,
        active: idx === 0,
      }))
    : [
        { timeLabel: 'TAHAP 1', title: 'Tahap Awal' },
        { timeLabel: 'TAHAP 2', title: 'Eksekusi', active: true },
        { timeLabel: 'TAHAP 3', title: 'Hasil' },
      ];

  return {
    type: 'TIMELINE',
    duration: Math.min(ctx.duration, 3.0),
    title: extracted?.title || 'ROADMAP EKSEKUSI',
    milestones,
    currentMilestoneIndex: 1,
    accentColor: '#8b5cf6',
    ...overrides,
  };
}
