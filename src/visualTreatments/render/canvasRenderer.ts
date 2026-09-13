import { VisualTreatmentPlan } from '../types';
import { drawCoverVideo } from '../../engine/renderFrame';

export function drawVisualTreatmentOnCanvas(
  ctx: CanvasRenderingContext2D,
  plan: VisualTreatmentPlan,
  timeInScene: number,
  preloadedImages?: Record<string, HTMLImageElement>,
  isSafeMode: boolean = false,
  targetW: number = 720,
  targetH: number = 1280
) {
  if (!plan || plan.family === 'TALKING_HEAD') return;

  const duration = Math.max(0.1, plan.duration);
  if (timeInScene < 0 || timeInScene > duration + 0.3) return;

  // Entrance & Exit Alpha
  let alpha = 1;
  if (timeInScene < 0.22) {
    alpha = Math.min(1, timeInScene / 0.22);
  } else if (timeInScene > duration - 0.25) {
    alpha = Math.max(0, (duration + 0.25 - timeInScene) / 0.25);
  }
  if (alpha <= 0) return;

  const progress = Math.min(1, Math.max(0, timeInScene / duration));

  ctx.save();
  ctx.globalAlpha = alpha;

  const p = plan.params;

  switch (p.type) {
    case 'NUMBER_COUNTER': {
      const cardW = 380;
      const cardH = 100;
      const cardX = (720 - cardW) / 2;
      const cardY = plan.placement === 'UPPER_THIRD' ? 80 : 200;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 16;
      }
      ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.strokeStyle = p.accentColor || '#34d399';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      // Badge
      ctx.fillStyle = p.accentColor || '#34d399';
      ctx.font = '900 11px "Montserrat", sans-serif';
      ctx.fillText(p.badgeText || 'VERIFIED DATA', cardX + 20, cardY + 28);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px "Montserrat", sans-serif';
      ctx.fillText(p.label, cardX + 20, cardY + 48);

      // Counter animation
      const countProgress = Math.min(1, progress * 1.3);
      const currentVal = Math.round(p.fromValue + (p.toValue - p.fromValue) * countProgress);
      const formatted = countProgress >= 1
        ? p.formattedTarget
        : `${p.prefix || ''}${currentVal.toLocaleString('id-ID')}${p.suffix || ''}`;

      ctx.fillStyle = p.accentColor || '#34d399';
      ctx.font = '900 28px "Montserrat", sans-serif';
      ctx.fillText(formatted, cardX + 20, cardY + 84);
      break;
    }

    case 'PERCENTAGE_GROWTH': {
      const cardW = 420;
      const cardH = 105;
      const cardX = (720 - cardW) / 2;
      const cardY = 200;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      // Title & Growth Badge
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px "Montserrat", sans-serif';
      ctx.fillText(p.primaryText.toUpperCase(), cardX + 20, cardY + 28);

      // Growth Multiplier Tag
      if (p.growthMultiplier) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(cardX + cardW - 100, cardY + 14, 84, 22, [11]);
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.font = '900 11px "Montserrat", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.growthMultiplier, cardX + cardW - 58, cardY + 29);
        ctx.textAlign = 'left';
      }

      // Comparison Display: fromValue -> toValue
      ctx.fillStyle = '#64748b';
      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillText(p.fromValue, cardX + 20, cardY + 70);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 22px "Montserrat", sans-serif';
      ctx.fillText('➔', cardX + 110, cardY + 68);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 32px "Montserrat", sans-serif';
      ctx.fillText(p.toValue, cardX + 150, cardY + 72);

      // Subtext
      if (p.subtext) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px "Montserrat", sans-serif';
        ctx.fillText(p.subtext, cardX + 20, cardY + 94);
      }
      break;
    }

    case 'SIMPLE_BAR_CHART': {
      const cardW = 420;
      const cardH = 140;
      const cardX = (720 - cardW) / 2;
      const cardY = 190;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 16;
      }
      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = '900 12px "Montserrat", sans-serif';
      ctx.fillText(p.title.toUpperCase(), cardX + 20, cardY + 26);

      const barCount = p.bars.length;
      const totalBarW = 340;
      const barSpacing = totalBarW / barCount;
      const maxVal = Math.max(...p.bars.map(b => b.value), 1);

      p.bars.forEach((bar, idx) => {
        const bx = cardX + 30 + idx * barSpacing;
        const barH = (bar.value / maxVal) * 58 * Math.min(1, progress * 1.4);
        const by = cardY + 105 - barH;

        ctx.fillStyle = bar.highlight ? '#10b981' : (bar.color || '#475569');
        ctx.beginPath();
        ctx.roundRect(bx, by, barSpacing - 24, barH, [6, 6, 0, 0]);
        ctx.fill();

        ctx.fillStyle = bar.highlight ? '#a7f3d0' : '#cbd5e1';
        ctx.font = '900 11px "Montserrat", sans-serif';
        ctx.fillText(bar.displayValue, bx, by - 6);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 9px "Montserrat", sans-serif';
        ctx.fillText(bar.label.slice(0, 12), bx, cardY + 122);
      });
      break;
    }

    case 'KEYWORD_POP': {
      const cardW = 360;
      const cardH = 80;
      const cardX = (720 - cardW) / 2;
      const cardY = 110;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.textAlign = 'center';
      ctx.font = '900 32px "Montserrat", sans-serif';
      ctx.fillText(p.mainWord, 360, cardY + 44);

      if (p.supportingText) {
        ctx.font = '900 11px "Montserrat", sans-serif';
        ctx.fillText(p.supportingText.toUpperCase(), 360, cardY + 66);
      }
      ctx.textAlign = 'left';
      break;
    }

    case 'CLAIM_CARD': {
      const cardW = 440;
      const cardH = 92;
      const cardX = (720 - cardW) / 2;
      const cardY = 100;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#818cf8';
      ctx.font = '900 10px "Montserrat", sans-serif';
      ctx.fillText(`✓ ${p.verifiedBadge || 'VERIFIED INSIGHT'}`, cardX + 18, cardY + 26);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Montserrat", sans-serif';
      ctx.fillText(`"${p.claim}"`, cardX + 18, cardY + 54);

      if (p.authorOrSource) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px "Montserrat", sans-serif';
        ctx.fillText(`— ${p.authorOrSource}`, cardX + 18, cardY + 76);
      }
      break;
    }

    case 'ARROW_FLOW': {
      const cardW = 460;
      const cardH = 95;
      const cardX = (720 - cardW) / 2;
      const cardY = 200;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 10px "Montserrat", sans-serif';
      ctx.fillText(p.title || 'SYSTEM WORKFLOW', cardX + 18, cardY + 24);

      const nodeCount = p.nodes.length;
      const stepW = 120;
      p.nodes.forEach((node, i) => {
        const nx = cardX + 20 + i * 140;
        ctx.fillStyle = node.highlight ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)';
        ctx.strokeStyle = node.highlight ? '#38bdf8' : '#475569';
        ctx.beginPath();
        ctx.roundRect(nx, cardY + 36, stepW, 46, [10]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = node.highlight ? '#ffffff' : '#cbd5e1';
        ctx.font = '900 11px "Montserrat", sans-serif';
        ctx.fillText(node.label, nx + 10, cardY + 54);

        if (node.sublabel) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 9px "Montserrat", sans-serif';
          ctx.fillText(node.sublabel, nx + 10, cardY + 70);
        }

        if (i < nodeCount - 1) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = '900 14px "Montserrat", sans-serif';
          ctx.fillText('→', nx + stepW + 6, cardY + 62);
        }
      });
      break;
    }

    case 'PROCESS_STEPS': {
      const cardW = 440;
      const cardH = 115;
      const cardX = (720 - cardW) / 2;
      const cardY = 190;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = '900 11px "Montserrat", sans-serif';
      ctx.fillText(p.title || '3 LANGKAH SISTEM', cardX + 20, cardY + 26);

      const stepW = 124;
      p.steps.forEach((step, i) => {
        const sx = cardX + 16 + i * 138;
        const isActive = step.status === 'ACTIVE' || i + 1 === p.activeStep;
        ctx.fillStyle = isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.6)';
        ctx.strokeStyle = isActive ? '#10b981' : '#475569';
        ctx.beginPath();
        ctx.roundRect(sx, cardY + 38, stepW, 62, [10]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isActive ? '#34d399' : '#64748b';
        ctx.font = '900 12px "Montserrat", sans-serif';
        ctx.fillText(`0${step.stepNumber}`, sx + 10, cardY + 56);

        ctx.fillStyle = isActive ? '#ffffff' : '#cbd5e1';
        ctx.font = 'bold 11px "Montserrat", sans-serif';
        ctx.fillText(step.title, sx + 10, cardY + 74);

        if (step.desc) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 8px "Montserrat", sans-serif';
          ctx.fillText(step.desc.slice(0, 18), sx + 10, cardY + 89);
        }
      });
      break;
    }

    case 'BEFORE_AFTER': {
      const cardW = 460;
      const cardH = 92;
      const cardX = (720 - cardW) / 2;
      const cardY = 85;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      // Before Section
      ctx.fillStyle = '#fda4af';
      ctx.font = '900 10px "Montserrat", sans-serif';
      ctx.fillText(p.beforeLabel, cardX + 18, cardY + 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Montserrat", sans-serif';
      ctx.fillText(p.beforeText.slice(0, 20), cardX + 18, cardY + 54);

      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(cardX + 220, cardY + 15);
      ctx.lineTo(cardX + 220, cardY + 77);
      ctx.stroke();

      // After Section
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '900 10px "Montserrat", sans-serif';
      ctx.fillText(p.afterLabel, cardX + 235, cardY + 28);
      ctx.fillStyle = '#34d399';
      ctx.font = '900 13px "Montserrat", sans-serif';
      ctx.fillText(p.afterText.slice(0, 20), cardX + 235, cardY + 54);

      if (p.improvementMetric) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px "Montserrat", sans-serif';
        ctx.fillText(`⚡ ${p.improvementMetric}`, cardX + 235, cardY + 76);
      }
      break;
    }

    case 'SCREENSHOT_ZOOM': {
      const cardW = 440;
      const cardH = 140;
      const cardX = (720 - cardW) / 2;
      const cardY = 170;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
      ctx.strokeStyle = p.borderGlow || '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = p.borderGlow || '#10b981';
      ctx.font = '900 11px "Montserrat", sans-serif';
      ctx.fillText(p.badge || 'VERIFIED USER PROOF', cardX + 20, cardY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Montserrat", sans-serif';
      ctx.fillText(p.caption, cardX + 20, cardY + 54);

      // Asset Image slot if preloaded
      const assetImg = preloadedImages?.[p.assetUrl];
      if (assetImg && assetImg.complete && assetImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX + cardW - 130, cardY + 15, 115, 110, [10]);
        ctx.clip();
        drawCoverVideo(ctx, assetImg, assetImg.naturalWidth, assetImg.naturalHeight, 115, 110);
        ctx.restore();
      }
      break;
    }

    case 'PRODUCT_CARD': {
      const cardW = 420;
      const cardH = 120;
      const cardX = (720 - cardW) / 2;
      const cardY = 85;

      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#020617';
      ctx.font = '900 11px "Montserrat", sans-serif';
      ctx.fillText(p.badge.toUpperCase(), cardX + 20, cardY + 28);

      ctx.font = '900 22px "Montserrat", sans-serif';
      ctx.fillText(p.productName, cardX + 20, cardY + 58);

      if (p.offerPrice) {
        ctx.font = '900 20px "Montserrat", sans-serif';
        ctx.fillText(p.offerPrice, cardX + 20, cardY + 86);
        if (p.originalPrice) {
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 13px "Montserrat", sans-serif';
          ctx.fillText(p.originalPrice, cardX + 160, cardY + 86);
        }
      }
      break;
    }

    case 'ANIMATED_LIST': {
      const cardW = 440;
      const cardH = 135;
      const cardX = (720 - cardW) / 2;
      const cardY = 180;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fb7185';
      ctx.font = '900 11px "Montserrat", sans-serif';
      ctx.fillText(p.headline.toUpperCase(), cardX + 20, cardY + 26);

      p.items.forEach((item, idx) => {
        const iy = cardY + 52 + idx * 26;
        ctx.fillStyle = item.highlight ? '#fda4af' : '#94a3b8';
        ctx.font = 'bold 12px "Montserrat", sans-serif';
        ctx.fillText(`✕  ${item.text}`, cardX + 20, iy);
      });
      break;
    }

    case 'TIMELINE': {
      const cardW = 440;
      const cardH = 100;
      const cardX = (720 - cardW) / 2;
      const cardY = 200;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a78bfa';
      ctx.font = '900 11px "Montserrat", sans-serif';
      ctx.fillText(p.title.toUpperCase(), cardX + 20, cardY + 24);

      // Connecting line
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cardX + 40, cardY + 55);
      ctx.lineTo(cardX + cardW - 40, cardY + 55);
      ctx.stroke();

      const mCount = p.milestones.length;
      p.milestones.forEach((m, idx) => {
        const mx = cardX + 40 + idx * ((cardW - 80) / (mCount - 1));
        const isCurrent = idx === p.currentMilestoneIndex;

        ctx.fillStyle = isCurrent ? '#8b5cf6' : '#334155';
        ctx.beginPath();
        ctx.arc(mx, cardY + 55, isCurrent ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isCurrent ? '#ffffff' : '#94a3b8';
        ctx.font = isCurrent ? '900 11px "Montserrat", sans-serif' : 'bold 9px "Montserrat", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.timeLabel, mx, cardY + 75);
        ctx.fillText(m.title, mx, cardY + 89);
        ctx.textAlign = 'left';
      });
      break;
    }

    case 'CTA_ACTION': {
      const cardW = 420;
      const cardH = 90;
      const cardX = (720 - cardW) / 2;
      const cardY = 85;

      ctx.fillStyle = 'rgba(79, 70, 229, 0.96)';
      ctx.strokeStyle = '#c7d2fe';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px "Montserrat", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.headline.toUpperCase(), 360, cardY + 32);

      // Action button pill
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(360 - 120, cardY + 44, 240, 32, [16]);
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.font = '900 12px "Montserrat", sans-serif';
      ctx.fillText(p.actionButtonText, 360, cardY + 65);
      ctx.textAlign = 'left';
      break;
    }

    default:
      break;
  }

  ctx.restore();
}
