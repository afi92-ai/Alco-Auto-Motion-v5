/**
 * ALCO Auto Motion - Rendering Utilities
 * Shared helper functions for canvas and frame rendering.
 * Decouples renderFrame from canvasRenderer to prevent circular dependencies.
 */

export function drawCoverVideo(
  ctx: CanvasRenderingContext2D,
  imgOrVideo: CanvasImageSource,
  srcW: number,
  srcH: number,
  destW: number = 720,
  destH: number = 1280
) {
  if (!srcW || !srcH) {
    ctx.drawImage(imgOrVideo, 0, 0, destW, destH);
    return;
  }
  const srcAspect = srcW / srcH;
  const destAspect = destW / destH;

  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (srcAspect > destAspect) {
    drawH = destH;
    drawW = destH * srcAspect;
    drawX = (destW - drawW) / 2;
    drawY = 0;
  } else {
    drawW = destW;
    drawH = destW / srcAspect;
    drawX = 0;
    drawY = (destH - drawH) / 2;
  }

  ctx.drawImage(imgOrVideo, drawX, drawY, drawW, drawH);
}
