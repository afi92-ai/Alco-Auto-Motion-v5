import React from 'react';
import {
  TrendingUp,
  Check,
  Shield,
  Star,
  Target,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Zap,
  Award,
  Layers,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { VisualTreatmentPlan } from '../types';

interface VisualTreatmentOverlayProps {
  plan?: VisualTreatmentPlan;
  currentTimeInScene: number;
}

export const VisualTreatmentOverlay: React.FC<VisualTreatmentOverlayProps> = ({
  plan,
  currentTimeInScene,
}) => {
  if (!plan || plan.family === 'TALKING_HEAD') return null;

  const duration = Math.max(0.1, plan.duration);
  if (currentTimeInScene < 0 || currentTimeInScene > duration + 0.3) {
    return null;
  }

  // Fade and scale calculation
  let opacity = 1;
  if (currentTimeInScene < 0.22) {
    opacity = Math.min(1, currentTimeInScene / 0.22);
  } else if (currentTimeInScene > duration - 0.25) {
    opacity = Math.max(0, (duration + 0.25 - currentTimeInScene) / 0.25);
  }

  const progress = Math.min(1, Math.max(0, currentTimeInScene / duration));
  const p = plan.params;

  // Placement class
  const positionClass =
    plan.placement === 'UPPER_THIRD'
      ? 'top-8 sm:top-10'
      : plan.placement === 'LOWER_THIRD'
      ? 'bottom-20'
      : 'top-20 sm:top-24';

  return (
    <div
      className={`absolute ${positionClass} inset-x-3 z-35 pointer-events-none transition-opacity duration-150 flex flex-col items-center`}
      style={{ opacity }}
    >
      {/* 1. NUMBER_COUNTER */}
      {p.type === 'NUMBER_COUNTER' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-emerald-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="bg-emerald-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block">
              {p.badgeText || 'VERIFIED DATA'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {p.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {progress >= 0.85
                ? p.formattedTarget
                : `${p.prefix || ''}${Math.round(p.fromValue + (p.toValue - p.fromValue) * Math.min(1, progress * 1.3)).toLocaleString('id-ID')}${p.suffix || ''}`}
            </p>
          </div>
        </div>
      )}

      {/* 2. PERCENTAGE_GROWTH */}
      {p.type === 'PERCENTAGE_GROWTH' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-cyan-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide">
              {p.primaryText}
            </span>
            {p.growthMultiplier && (
              <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                {p.growthMultiplier}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-slate-400 font-mono line-through opacity-70">
              {p.fromValue}
            </span>
            <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-2xl font-black text-cyan-300 font-mono animate-pulse">
              {p.toValue}
            </span>
          </div>
          {p.subtext && (
            <p className="text-[9px] text-slate-400 mt-1 font-medium">{p.subtext}</p>
          )}
        </div>
      )}

      {/* 3. SIMPLE_BAR_CHART */}
      {p.type === 'SIMPLE_BAR_CHART' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-emerald-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
              {p.title}
            </span>
            {p.comparisonNote && (
              <span className="text-[9px] font-bold text-slate-300">{p.comparisonNote}</span>
            )}
          </div>
          <div className="flex items-end justify-around gap-2 h-14 pt-1">
            {p.bars.map((bar, i) => {
              const maxVal = Math.max(...p.bars.map((b) => b.value), 1);
              const barH = Math.round((bar.value / maxVal) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      bar.highlight ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {bar.displayValue}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      bar.highlight
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : 'bg-slate-700'
                    }`}
                    style={{ height: `${Math.max(12, Math.round(barH * progress))}%` }}
                  />
                  <span className="text-[8px] font-medium text-slate-400 truncate max-w-full">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. KEYWORD_POP */}
      {p.type === 'KEYWORD_POP' && (
        <div className="bg-amber-400 text-slate-950 px-5 py-2 rounded-2xl shadow-2xl border-2 border-white flex flex-col items-center animate-bounce-short">
          <span
            className="text-2xl sm:text-3xl font-black uppercase tracking-wider drop-shadow-sm"
            style={{ fontFamily: "'Bebas Neue', 'Montserrat', sans-serif" }}
          >
            {p.mainWord}
          </span>
          {p.supportingText && (
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 mt-0.5">
              {p.supportingText}
            </span>
          )}
        </div>
      )}

      {/* 5. CLAIM_CARD */}
      {p.type === 'CLAIM_CARD' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-indigo-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-wide">
              {p.verifiedBadge || 'VERIFIED INSIGHT'}
            </span>
          </div>
          <p className="text-xs font-bold text-white leading-snug">"{p.claim}"</p>
          {p.authorOrSource && (
            <span className="text-[9px] text-slate-400 block mt-1 font-mono">
              — {p.authorOrSource}
            </span>
          )}
        </div>
      )}

      {/* 6. ARROW_FLOW */}
      {p.type === 'ARROW_FLOW' && (
        <div className="w-full max-w-[330px] bg-slate-950/95 border-2 border-sky-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <span className="text-[9px] font-black text-sky-400 uppercase tracking-wide block mb-2">
            {p.title || 'WORKFLOW SISTEM'}
          </span>
          <div className="flex items-center justify-between gap-1">
            {p.nodes.map((n, i) => (
              <React.Fragment key={i}>
                <div
                  className={`flex-1 p-1.5 rounded-lg border text-center ${
                    n.highlight
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <p className="text-[9px] font-black truncate">{n.label}</p>
                  {n.sublabel && (
                    <p className="text-[7px] text-slate-400 truncate">{n.sublabel}</p>
                  )}
                </div>
                {i < p.nodes.length - 1 && (
                  <span className="text-sky-400 text-xs font-bold shrink-0">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* 7. PROCESS_STEPS */}
      {p.type === 'PROCESS_STEPS' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-emerald-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wide block mb-2">
            {p.title || '3 LANGKAH SISTEM'}
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {p.steps.map((s, i) => {
              const isActive = i + 1 === p.activeStep;
              return (
                <div
                  key={i}
                  className={`p-1.5 rounded-lg border text-left ${
                    isActive
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-xs'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-[8px] font-black font-mono block">0{s.stepNumber}</span>
                  <p className="text-[9px] font-bold leading-tight truncate">{s.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. BEFORE_AFTER */}
      {p.type === 'BEFORE_AFTER' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-purple-400 p-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-[8px] text-rose-400 font-black uppercase tracking-tight block">
              {p.beforeLabel}
            </span>
            <p className="text-[10px] text-slate-200 font-bold truncate leading-tight mt-0.5">
              {p.beforeText}
            </p>
          </div>
          <div className="w-px h-7 bg-slate-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[8px] text-emerald-400 font-black uppercase tracking-tight block">
              {p.afterLabel}
            </span>
            <p className="text-[10px] text-emerald-300 font-black truncate leading-tight mt-0.5">
              {p.afterText}
            </p>
            {p.improvementMetric && (
              <span className="text-[8px] text-cyan-300 font-extrabold block">
                ⚡ {p.improvementMetric}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 9. SCREENSHOT_ZOOM */}
      {p.type === 'SCREENSHOT_ZOOM' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-emerald-400 p-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <span className="bg-emerald-400 text-slate-950 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block mb-1">
              {p.badge || 'VERIFIED USER ASSET'}
            </span>
            <p className="text-xs font-bold text-white truncate">{p.caption}</p>
          </div>
          {p.assetUrl && (
            <div className="w-14 h-12 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
              <img
                src={p.assetUrl}
                alt="Verified Screenshot"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* 10. PRODUCT_CARD */}
      {p.type === 'PRODUCT_CARD' && (
        <div className="w-full max-w-[320px] bg-amber-400 text-slate-950 border-2 border-white p-3 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="bg-slate-950 text-amber-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
              {p.badge}
            </span>
            {p.offerPrice && (
              <span className="text-sm font-black font-mono">{p.offerPrice}</span>
            )}
          </div>
          <p className="text-xs font-black uppercase tracking-tight">{p.productName}</p>
          {p.features && p.features.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[9px] font-bold">
              {p.features.slice(0, 2).map((feat, i) => (
                <li key={i} className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-slate-950 shrink-0" />
                  <span className="truncate">{feat}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 11. ANIMATED_LIST */}
      {p.type === 'ANIMATED_LIST' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-rose-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wide block mb-1.5">
            {p.headline}
          </span>
          <div className="space-y-1">
            {p.items.map((it, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 p-1 rounded-md text-[10px] font-bold ${
                  it.highlight ? 'bg-rose-500/20 text-rose-200' : 'text-slate-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">{it.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. TIMELINE */}
      {p.type === 'TIMELINE' && (
        <div className="w-full max-w-[320px] bg-slate-950/95 border-2 border-violet-400 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <span className="text-[10px] font-black text-violet-400 uppercase tracking-wide block mb-2">
            {p.title}
          </span>
          <div className="flex items-center justify-between gap-1">
            {p.milestones.map((m, i) => {
              const isCurr = i === p.currentMilestoneIndex;
              return (
                <div key={i} className="flex-1 flex flex-col items-center text-center">
                  <div
                    className={`w-3 h-3 rounded-full mb-1 ${
                      isCurr ? 'bg-violet-400 ring-2 ring-violet-200 animate-ping' : 'bg-slate-700'
                    }`}
                  />
                  <span
                    className={`text-[8px] font-black ${
                      isCurr ? 'text-violet-300' : 'text-slate-400'
                    }`}
                  >
                    {m.timeLabel}
                  </span>
                  <span className="text-[8px] text-slate-300 font-bold truncate max-w-full">
                    {m.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 13. CTA_ACTION */}
      {p.type === 'CTA_ACTION' && (
        <div className="w-full max-w-[320px] bg-indigo-600 border-2 border-indigo-300 p-3 rounded-2xl shadow-2xl text-center animate-pulse">
          <p className="text-xs font-black text-white uppercase tracking-wider mb-1.5">
            {p.headline}
          </p>
          <div className="bg-amber-400 text-slate-950 py-1 px-3 rounded-full font-black text-xs shadow inline-flex items-center gap-1">
            <span>{p.actionButtonText}</span>
          </div>
          {p.urgencyNote && (
            <p className="text-[8px] text-indigo-200 mt-1 font-mono">{p.urgencyNote}</p>
          )}
        </div>
      )}
    </div>
  );
};
