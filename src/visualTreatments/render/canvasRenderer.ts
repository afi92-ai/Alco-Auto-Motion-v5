import { VisualTreatmentPlan } from '../types';
import { drawCoverVideo } from '../../engine/renderUtils';
import { getPlacementRect, getResponsiveCardSize } from '../layout';

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
  const scale = targetW / 720;

  ctx.save();
  ctx.globalAlpha = alpha;

  const p = plan.params;

  switch (p.type) {
    case 'NUMBER_COUNTER': {
      const size = getResponsiveCardSize('NUMBER_COUNTER', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 16 * scale;
      }
      ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.strokeStyle = p.accentColor || '#34d399';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      // Badge
      ctx.fillStyle = p.accentColor || '#34d399';
      ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.badgeText || 'METRIC', cardX + 20 * scale, cardY + 28 * scale);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.round(12 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.label, cardX + 20 * scale, cardY + 48 * scale);

      // Counter animation
      const countProgress = Math.min(1, progress * 1.3);
      const currentVal = Math.round(p.fromValue + (p.toValue - p.fromValue) * countProgress);
      const formatted = countProgress >= 1
        ? p.formattedTarget
        : `${p.prefix || ''}${currentVal.toLocaleString('id-ID')}${p.suffix || ''}`;

      ctx.fillStyle = p.accentColor || '#34d399';
      ctx.font = `900 ${Math.round(28 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(formatted, cardX + 20 * scale, cardY + 84 * scale);
      break;
    }

    case 'PERCENTAGE_GROWTH': {
      const size = getResponsiveCardSize('PERCENTAGE_GROWTH', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
        ctx.shadowBlur = 18 * scale;
      }
      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      // Title & Growth Badge
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.primaryText.toUpperCase(), cardX + 20 * scale, cardY + 28 * scale);

      // Growth Multiplier Tag
      if (p.growthMultiplier) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(cardX + cardW - 100 * scale, cardY + 14 * scale, 84 * scale, 22 * scale, [11 * scale]);
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.growthMultiplier, cardX + cardW - 58 * scale, cardY + 29 * scale);
        ctx.textAlign = 'left';
      }

      // Comparison Display: fromValue -> toValue
      ctx.fillStyle = '#64748b';
      ctx.font = `900 ${Math.round(24 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.fromValue, cardX + 20 * scale, cardY + 70 * scale);

      ctx.fillStyle = '#38bdf8';
      ctx.font = `900 ${Math.round(22 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText('➔', cardX + 110 * scale, cardY + 68 * scale);

      ctx.fillStyle = '#38bdf8';
      ctx.font = `900 ${Math.round(32 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.toValue, cardX + 150 * scale, cardY + 72 * scale);

      // Subtext
      if (p.subtext) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(p.subtext, cardX + 20 * scale, cardY + 94 * scale);
      }
      break;
    }

    case 'SIMPLE_BAR_CHART': {
      const size = getResponsiveCardSize('SIMPLE_BAR_CHART', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 16 * scale;
      }
      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = `900 ${Math.round(12 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.title.toUpperCase(), cardX + 20 * scale, cardY + 26 * scale);

      const barCount = p.bars.length;
      const totalBarW = cardW - 80 * scale;
      const barSpacing = totalBarW / Math.max(1, barCount);
      const maxVal = Math.max(...p.bars.map(b => b.value), 1);

      p.bars.forEach((bar, idx) => {
        const bx = cardX + 30 * scale + idx * barSpacing;
        const barH = (bar.value / maxVal) * (58 * scale) * Math.min(1, progress * 1.4);
        const by = cardY + 105 * scale - barH;

        ctx.fillStyle = bar.highlight ? '#10b981' : (bar.color || '#475569');
        ctx.beginPath();
        ctx.roundRect(bx, by, Math.max(12 * scale, barSpacing - 24 * scale), barH, [6 * scale, 6 * scale, 0, 0]);
        ctx.fill();

        ctx.fillStyle = bar.highlight ? '#a7f3d0' : '#cbd5e1';
        ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(bar.displayValue, bx, by - 6 * scale);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(9 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(bar.label.slice(0, 12), bx, cardY + 122 * scale);
      });
      break;
    }

    case 'KEYWORD_POP': {
      const size = getResponsiveCardSize('KEYWORD_POP', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        ctx.shadowBlur = 20 * scale;
      }
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(32 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.mainWord, cardX + cardW / 2, cardY + 44 * scale);

      if (p.supportingText) {
        ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(p.supportingText.toUpperCase(), cardX + cardW / 2, cardY + 66 * scale);
      }
      ctx.textAlign = 'left';
      break;
    }

    case 'CLAIM_CARD': {
      const size = getResponsiveCardSize('CLAIM_CARD', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 14 * scale;
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#818cf8';
      ctx.font = `900 ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(`✓ ${p.verifiedBadge || 'INSIGHT'}`, cardX + 18 * scale, cardY + 26 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(13 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(`"${p.claim}"`, cardX + 18 * scale, cardY + 54 * scale);

      if (p.authorOrSource) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(`— ${p.authorOrSource}`, cardX + 18 * scale, cardY + 76 * scale);
      }
      break;
    }

    case 'ARROW_FLOW': {
      const size = getResponsiveCardSize('ARROW_FLOW', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = `900 ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.title || 'SYSTEM WORKFLOW', cardX + 18 * scale, cardY + 24 * scale);

      const nodeCount = p.nodes.length;
      const stepGap = 20 * scale;
      const availableW = cardW - 40 * scale - Math.max(0, nodeCount - 1) * stepGap;
      const stepW = availableW / Math.max(1, nodeCount);

      p.nodes.forEach((node, i) => {
        const nx = cardX + 20 * scale + i * (stepW + stepGap);
        ctx.fillStyle = node.highlight ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)';
        ctx.strokeStyle = node.highlight ? '#38bdf8' : '#475569';
        ctx.beginPath();
        ctx.roundRect(nx, cardY + 36 * scale, stepW, 46 * scale, [10 * scale]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = node.highlight ? '#ffffff' : '#cbd5e1';
        ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(node.label, nx + 10 * scale, cardY + 54 * scale);

        if (node.sublabel) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `bold ${Math.round(9 * scale)}px "Montserrat", sans-serif`;
          ctx.fillText(node.sublabel, nx + 10 * scale, cardY + 70 * scale);
        }

        if (i < nodeCount - 1) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = `900 ${Math.round(14 * scale)}px "Montserrat", sans-serif`;
          ctx.fillText('→', nx + stepW + 4 * scale, cardY + 62 * scale);
        }
      });
      break;
    }

    case 'ICON_NETWORK': {
      const isMultiRow = p.orbitNodes.length > 3;
      const size = getResponsiveCardSize('ICON_NETWORK', plan.variant ?? 'BOLD', targetW);
      const adjustedH = isMultiRow ? Math.round(size.height * 1.15) : size.height;
      const rect = getPlacementRect(plan.placement, size.width, adjustedH, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      // Header: HUB INTEGRASI & Center Node Label
      ctx.fillStyle = '#a5b4fc';
      ctx.font = `900 ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText('HUB INTEGRASI', cardX + 18 * scale, cardY + 22 * scale);

      // Center Node Badge Pill
      ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX + cardW - 140 * scale, cardY + 10 * scale, 122 * scale, 20 * scale, [10 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e0e7ff';
      ctx.font = `900 ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.centerNode.label.slice(0, 14), cardX + cardW - 79 * scale, cardY + 24 * scale);
      ctx.textAlign = 'left';

      // Orbit Nodes Layout (3 to 6 nodes)
      const nodeCount = p.orbitNodes.length;
      if (nodeCount <= 3) {
        const itemW = (cardW - 40 * scale - Math.max(0, nodeCount - 1) * 12 * scale) / Math.max(1, nodeCount);
        p.orbitNodes.forEach((node, i) => {
          const nx = cardX + 20 * scale + i * (itemW + 12 * scale);
          const ny = cardY + 38 * scale;
          ctx.fillStyle = node.highlight ? 'rgba(99, 102, 241, 0.25)' : 'rgba(30, 41, 59, 0.7)';
          ctx.strokeStyle = node.highlight ? '#818cf8' : '#475569';
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.roundRect(nx, ny, itemW, 46 * scale, [10 * scale]);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = node.highlight ? '#ffffff' : '#cbd5e1';
          ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
          ctx.fillText(node.label.slice(0, 14), nx + 10 * scale, ny + 28 * scale);
        });
      } else {
        const cols = nodeCount === 4 ? 2 : 3;
        const itemW = (cardW - 40 * scale - (cols - 1) * 10 * scale) / cols;
        const itemH = 38 * scale;
        p.orbitNodes.forEach((node, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const nx = cardX + 20 * scale + col * (itemW + 10 * scale);
          const ny = cardY + 38 * scale + row * (itemH + 8 * scale);

          ctx.fillStyle = node.highlight ? 'rgba(99, 102, 241, 0.25)' : 'rgba(30, 41, 59, 0.7)';
          ctx.strokeStyle = node.highlight ? '#818cf8' : '#475569';
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.roundRect(nx, ny, itemW, itemH, [8 * scale]);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = node.highlight ? '#ffffff' : '#cbd5e1';
          ctx.font = `900 ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
          ctx.fillText(node.label.slice(0, 14), nx + 8 * scale, ny + 24 * scale);
        });
      }
      break;
    }

    case 'PROCESS_STEPS': {
      const size = getResponsiveCardSize('PROCESS_STEPS', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.title || '3 LANGKAH SISTEM', cardX + 20 * scale, cardY + 26 * scale);

      const stepCount = p.steps.length;
      const stepGap = 14 * scale;
      const availableW = cardW - 32 * scale - Math.max(0, stepCount - 1) * stepGap;
      const stepW = availableW / Math.max(1, stepCount);

      p.steps.forEach((step, i) => {
        const sx = cardX + 16 * scale + i * (stepW + stepGap);
        const isActive = step.status === 'ACTIVE' || i + 1 === p.activeStep;
        ctx.fillStyle = isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.6)';
        ctx.strokeStyle = isActive ? '#10b981' : '#475569';
        ctx.beginPath();
        ctx.roundRect(sx, cardY + 38 * scale, stepW, 62 * scale, [10 * scale]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isActive ? '#34d399' : '#64748b';
        ctx.font = `900 ${Math.round(12 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(`0${step.stepNumber}`, sx + 10 * scale, cardY + 56 * scale);

        ctx.fillStyle = isActive ? '#ffffff' : '#cbd5e1';
        ctx.font = `bold ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(step.title, sx + 10 * scale, cardY + 74 * scale);

        if (step.desc) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `bold ${Math.round(8 * scale)}px "Montserrat", sans-serif`;
          ctx.fillText(step.desc.slice(0, 18), sx + 10 * scale, cardY + 89 * scale);
        }
      });
      break;
    }

    case 'BEFORE_AFTER': {
      const size = getResponsiveCardSize('BEFORE_AFTER', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      // Before Section
      ctx.fillStyle = '#fda4af';
      ctx.font = `900 ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.beforeLabel, cardX + 18 * scale, cardY + 28 * scale);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(12 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.beforeText.slice(0, 20), cardX + 18 * scale, cardY + 54 * scale);

      // Divider
      const midX = cardX + cardW / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(midX, cardY + 15 * scale);
      ctx.lineTo(midX, cardY + cardH - 15 * scale);
      ctx.stroke();

      // After Section
      ctx.fillStyle = '#a7f3d0';
      ctx.font = `900 ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.afterLabel, midX + 15 * scale, cardY + 28 * scale);

      ctx.fillStyle = '#34d399';
      ctx.font = `900 ${Math.round(13 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.afterText.slice(0, 20), midX + 15 * scale, cardY + 54 * scale);

      if (p.improvementMetric) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.round(10 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(`⚡ ${p.improvementMetric}`, midX + 15 * scale, cardY + 76 * scale);
      }
      break;
    }

    case 'SCREENSHOT_ZOOM': {
      const size = getResponsiveCardSize('SCREENSHOT_ZOOM', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
      ctx.strokeStyle = p.borderGlow || '#10b981';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = p.borderGlow || '#10b981';
      ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.badge || 'VERIFIED USER PROOF', cardX + 20 * scale, cardY + 28 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(14 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.caption, cardX + 20 * scale, cardY + 54 * scale);

      // Asset Image slot if preloaded
      const assetImg = preloadedImages?.[p.assetUrl];
      if (assetImg && assetImg.complete && assetImg.naturalWidth > 0) {
        const slotW = 115 * scale;
        const slotH = cardH - 30 * scale;
        const slotX = cardX + cardW - slotW - 15 * scale;
        const slotY = cardY + 15 * scale;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotW, slotH, [10 * scale]);
        ctx.clip();
        drawCoverVideo(ctx, assetImg, assetImg.naturalWidth, assetImg.naturalHeight, slotW, slotH);
        ctx.restore();
      }
      break;
    }

    case 'HIGHLIGHT_BOX': {
      const hasAsset = Boolean(p.assetUrl && preloadedImages?.[p.assetUrl]);
      const size = getResponsiveCardSize('HIGHLIGHT_BOX', plan.variant ?? 'BOLD', targetW);
      const adjustedH = hasAsset ? Math.round(size.height * 1.25) : size.height;
      const rect = getPlacementRect(plan.placement, size.width, adjustedH, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      if (!isSafeMode) {
        ctx.shadowColor = 'rgba(34, 211, 238, 0.4)';
        ctx.shadowBlur = 18 * scale;
      }
      ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
      ctx.strokeStyle = p.highlightColor || '#22d3ee';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      // Badge
      ctx.fillStyle = p.highlightColor || '#22d3ee';
      ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.targetLabel.toUpperCase(), cardX + 20 * scale, cardY + 28 * scale);

      // Callout text
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(13 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.calloutText, cardX + 20 * scale, cardY + 52 * scale);

      const assetImg = p.assetUrl ? preloadedImages?.[p.assetUrl] : null;
      if (assetImg && assetImg.complete && assetImg.naturalWidth > 0) {
        const imgX = cardX + 20 * scale;
        const imgY = cardY + 64 * scale;
        const imgW = cardW - 40 * scale;
        const imgH = cardH - 78 * scale;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, [8 * scale]);
        ctx.clip();
        drawCoverVideo(ctx, assetImg, assetImg.naturalWidth, assetImg.naturalHeight, imgW, imgH);

        // Pulsing highlight box inside asset
        const hlX = imgX + (p.highlightArea.xPercent / 100) * imgW;
        const hlY = imgY + (p.highlightArea.yPercent / 100) * imgH;
        const hlW = (p.highlightArea.widthPercent / 100) * imgW;
        const hlH = (p.highlightArea.heightPercent / 100) * imgH;

        ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.roundRect(hlX, hlY, hlW, hlH, [4 * scale]);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        // Clean callout focus box
        ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.roundRect(cardX + 20 * scale, cardY + 60 * scale, cardW - 40 * scale, 26 * scale, [8 * scale]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a5f3fc';
        ctx.font = `bold ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(`⚡ ${p.calloutText}`, cardX + 30 * scale, cardY + 77 * scale);
      }
      break;
    }

    case 'PRODUCT_CARD': {
      const size = getResponsiveCardSize('PRODUCT_CARD', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#020617';
      ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.badge.toUpperCase(), cardX + 20 * scale, cardY + 28 * scale);

      ctx.font = `900 ${Math.round(22 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.productName, cardX + 20 * scale, cardY + 58 * scale);

      if (p.offerPrice) {
        ctx.font = `900 ${Math.round(20 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(p.offerPrice, cardX + 20 * scale, cardY + 86 * scale);
        if (p.originalPrice) {
          ctx.fillStyle = '#475569';
          ctx.font = `bold ${Math.round(13 * scale)}px "Montserrat", sans-serif`;
          ctx.fillText(p.originalPrice, cardX + 160 * scale, cardY + 86 * scale);
        }
      }
      break;
    }

    case 'ANIMATED_LIST': {
      const size = getResponsiveCardSize('ANIMATED_LIST', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fb7185';
      ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.headline.toUpperCase(), cardX + 20 * scale, cardY + 26 * scale);

      p.items.forEach((item, idx) => {
        const iy = cardY + 52 * scale + idx * 26 * scale;
        ctx.fillStyle = item.highlight ? '#fda4af' : '#94a3b8';
        ctx.font = `bold ${Math.round(12 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText(`✕  ${item.text}`, cardX + 20 * scale, iy);
      });
      break;
    }

    case 'TIMELINE': {
      const size = getResponsiveCardSize('TIMELINE', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a78bfa';
      ctx.font = `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.title.toUpperCase(), cardX + 20 * scale, cardY + 24 * scale);

      // Connecting line
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cardX + 40 * scale, cardY + 55 * scale);
      ctx.lineTo(cardX + cardW - 40 * scale, cardY + 55 * scale);
      ctx.stroke();

      const mCount = p.milestones.length;
      p.milestones.forEach((m, idx) => {
        const mx = cardX + 40 * scale + idx * ((cardW - 80 * scale) / Math.max(1, mCount - 1));
        const isCurrent = idx === p.currentMilestoneIndex;

        ctx.fillStyle = isCurrent ? '#8b5cf6' : '#334155';
        ctx.beginPath();
        ctx.arc(mx, cardY + 55 * scale, (isCurrent ? 8 : 5) * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isCurrent ? '#ffffff' : '#94a3b8';
        ctx.font = isCurrent
          ? `900 ${Math.round(11 * scale)}px "Montserrat", sans-serif`
          : `bold ${Math.round(9 * scale)}px "Montserrat", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(m.timeLabel, mx, cardY + 75 * scale);
        ctx.fillText(m.title, mx, cardY + 89 * scale);
        ctx.textAlign = 'left';
      });
      break;
    }

    case 'CTA_ACTION': {
      const size = getResponsiveCardSize('CTA_ACTION', plan.variant ?? 'BOLD', targetW);
      const rect = getPlacementRect(plan.placement, size.width, size.height, targetW, targetH);
      const cardX = rect.x;
      const cardY = rect.y;
      const cardW = rect.width;
      const cardH = rect.height;

      ctx.fillStyle = 'rgba(79, 70, 229, 0.96)';
      ctx.strokeStyle = '#c7d2fe';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, [16 * scale]);
      ctx.fill();
      ctx.stroke();

      const centerX = cardX + cardW / 2;
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(14 * scale)}px "Montserrat", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.headline.toUpperCase(), centerX, cardY + 32 * scale);

      // Action button pill
      const btnW = 240 * scale;
      const btnH = 32 * scale;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(centerX - btnW / 2, cardY + 44 * scale, btnW, btnH, [16 * scale]);
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.font = `900 ${Math.round(12 * scale)}px "Montserrat", sans-serif`;
      ctx.fillText(p.actionButtonText, centerX, cardY + 65 * scale);
      ctx.textAlign = 'left';
      break;
    }

    default:
      break;
  }

  ctx.restore();
}
