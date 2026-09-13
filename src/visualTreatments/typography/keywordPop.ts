import { KeywordPopParams, RouteTreatmentContext } from '../types';

export function buildKeywordPopParams(
  ctx: RouteTreatmentContext,
  overrides?: Partial<KeywordPopParams>
): KeywordPopParams {
  let word = ctx.emphasisTarget;
  if (!word) {
    const textUpper = ctx.transcript.toUpperCase();
    const words = textUpper.split(/\s+/).filter(w => w.length > 3);
    const candidate = words.find(w => /STOP|SALAH|PROFIT|RAHASIA|JANGAN|RUGI|BOOM|METRIC|HASIL|HATI-HATI/i.test(w));
    word = candidate || words[0] || 'PERHATIKAN';
  }

  return {
    type: 'KEYWORD_POP',
    duration: Math.min(ctx.duration, 2.0),
    mainWord: word.toUpperCase(),
    supportingText: 'Kunci Utama Meta Ads',
    style: 'PUNCH',
    accentColor: '#f59e0b',
    ...overrides,
  };
}
