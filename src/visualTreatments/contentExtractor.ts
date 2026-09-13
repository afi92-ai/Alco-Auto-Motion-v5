/**
 * ALCO Auto Motion - Content Extraction Layer
 * Deterministic extraction of structured content from transcript and metadata.
 * Strictly forbids fabricated facts, business claims, fake numbers, or invented problems/benefits.
 */

export interface ExtractedMetricContent {
  label: string | null;
  fromValue: string | null;
  toValue: string | null;
  singleValue: string | null;
  numericValue: number | null;
  multiplier: string | null;
  isPercentageGrowth: boolean;
  isComparison: boolean;
  confidence: number;
}

export interface ExtractedListContent {
  headline: string | null;
  items: string[];
  confidence: number;
}

export interface ExtractedBeforeAfterContent {
  beforeText: string | null;
  afterText: string | null;
  beforeLabel: string;
  afterLabel: string;
  improvementMetric: string | null;
  confidence: number;
}

export interface ExtractedStepItem {
  stepNumber: number;
  title: string;
  desc?: string;
}

export interface ExtractedProcessContent {
  title: string | null;
  steps: ExtractedStepItem[];
  confidence: number;
}

export interface ExtractedTimelineItem {
  timeLabel: string;
  title: string;
}

export interface ExtractedTimelineContent {
  title: string | null;
  milestones: ExtractedTimelineItem[];
  confidence: number;
}

export interface ExtractedCtaContent {
  headline: string;
  actionButtonText: string;
  urgencyNote?: string;
  confidence: number;
}

export interface ExtractedProductContent {
  productName: string | null;
  badge: string | null;
  offerPrice: string | null;
  originalPrice: string | null;
  features: string[];
  urgencyText?: string;
  confidence: number;
}

export interface ExtractedClaimContent {
  title: string;
  claim: string;
  confidence: number;
}

// -------------------------------------------------------------
// 1. METRIC CONTENT EXTRACTOR
// -------------------------------------------------------------

/**
 * Extracts real metric numbers, percentage growth, and multipliers from transcript.
 * Guarantees that "Hasilnya lebih bagus" or "Saya bekerja 3 tahun" does NOT yield numeric proof.
 */
export function extractMetricContent(transcript: string): ExtractedMetricContent {
  if (!transcript || typeof transcript !== 'string') {
    return {
      label: null,
      fromValue: null,
      toValue: null,
      singleValue: null,
      numericValue: null,
      multiplier: null,
      isPercentageGrowth: false,
      isComparison: false,
      confidence: 0,
    };
  }

  const text = transcript.trim();
  const textUpper = text.toUpperCase();

  // Guard against personal duration storytelling without business metrics
  // e.g. "Saya bekerja selama 3 tahun", "Saya tinggal 5 tahun"
  if (
    /BEKERJA|TINGGAL|HIDUP|SEKOLAH|KULIAH/i.test(textUpper) &&
    /\b\d+\s*(TAHUN|BULAN|MINGGU)\b/i.test(textUpper) &&
    !/CTR|ROAS|OMSET|PROFIT|CONVERSION|KONVERSI|REVENUE|PENJUALAN|SCALE|LEAD|VIEW|KLIK|PERCENT|%/i.test(textUpper)
  ) {
    return {
      label: null,
      fromValue: null,
      toValue: null,
      singleValue: null,
      numericValue: null,
      multiplier: null,
      isPercentageGrowth: false,
      isComparison: false,
      confidence: 0,
    };
  }

  // Detect metric label if present
  let metricLabel: string | null = null;
  if (/CTR/i.test(textUpper)) metricLabel = 'CTR';
  else if (/ROAS/i.test(textUpper)) metricLabel = 'ROAS';
  else if (/OMSET|OMZET/i.test(textUpper)) metricLabel = 'Omset';
  else if (/PROFIT/i.test(textUpper)) metricLabel = 'Profit';
  else if (/KONVERSI|CONVERSION/i.test(textUpper)) metricLabel = 'Konversi';
  else if (/LEAD/i.test(textUpper)) metricLabel = 'Leads';
  else if (/ORDER|PENJUALAN/i.test(textUpper)) metricLabel = 'Order';
  else if (/TRAFFIC|PENGUNJUNG/i.test(textUpper)) metricLabel = 'Traffic';
  else if (/RETENSI|RETENTION/i.test(textUpper)) metricLabel = 'Retensi';

  // 1A. Detect Percentage Growth: "naik dari X% menjadi/ke Y%" or "dari X% ke Y%"
  const growthMatch = text.match(
    /(?:naik|tumbuh|meningkat|dari)?\s*(\d+(?:[.,]\d+)?\s*%)\s*(?:menjadi|ke|sampai|hingga)\s*(\d+(?:[.,]\d+)?\s*%)/i
  );

  if (growthMatch) {
    const fromStr = growthMatch[1].replace(/\s+/g, '');
    const toStr = growthMatch[2].replace(/\s+/g, '');
    const fromNum = parseFloat(fromStr.replace(',', '.'));
    const toNum = parseFloat(toStr.replace(',', '.'));

    let multiplier: string | null = null;
    if (!isNaN(fromNum) && !isNaN(toNum) && fromNum > 0) {
      const growthPct = Math.round(((toNum - fromNum) / fromNum) * 100);
      multiplier = growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`;
    }

    return {
      label: metricLabel || 'Growth',
      fromValue: fromStr,
      toValue: toStr,
      singleValue: toStr,
      numericValue: toNum,
      multiplier,
      isPercentageGrowth: true,
      isComparison: true,
      confidence: 0.95,
    };
  }

  // 1B. Detect General From-To Growth: "dari Rp X ke Rp Y" or "dari X ke Y"
  const generalGrowthMatch = text.match(
    /(?:dari|sebelumnya)\s+([A-Za-z$€£Rp]*\s*\d+(?:[.,]\d+)?(?:\s*[a-zA-Z%]+)?)\s+(?:menjadi|ke|sampai|hingga)\s+([A-Za-z$€£Rp]*\s*\d+(?:[.,]\d+)?(?:\s*[a-zA-Z%]+)?)/i
  );

  if (generalGrowthMatch) {
    const fromStr = generalGrowthMatch[1].trim();
    const toStr = generalGrowthMatch[2].trim();
    const numMatch = toStr.match(/\d+(?:[.,]\d+)?/);
    const toNum = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;

    return {
      label: metricLabel || 'Peningkatan',
      fromValue: fromStr,
      toValue: toStr,
      singleValue: toStr,
      numericValue: toNum,
      multiplier: null,
      isPercentageGrowth: /%/.test(toStr),
      isComparison: true,
      confidence: 0.88,
    };
  }

  // 1C. Detect Multiplier: "4.2x" or "10x" or "3 kali lipat"
  const multMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:x|X|\s*kali(?:\s*lipat)?)/i);
  if (multMatch) {
    const val = parseFloat(multMatch[1].replace(',', '.'));
    const single = `${multMatch[1]}x`;
    return {
      label: metricLabel || 'Multiplier',
      fromValue: null,
      toValue: single,
      singleValue: single,
      numericValue: val,
      multiplier: single,
      isPercentageGrowth: false,
      isComparison: /BANDING|LEBIH|SEBELUM/i.test(textUpper),
      confidence: 0.9,
    };
  }

  // 1D. Detect Currency Metric: "Rp 500.000" or "100 juta" or "50 ribu"
  const currencyMatch = text.match(/(?:Rp\.?\s*(\d+(?:[.,]\d+)*)|\b(\d+(?:[.,]\d+)?)\s*(?:juta|ribu|miliar|k|m)\b)/i);
  if (currencyMatch) {
    const rawMatch = currencyMatch[0].trim();
    const cleanNum = rawMatch.replace(/[^\d.,]/g, '').replace(',', '.');
    const val = parseFloat(cleanNum) || 0;
    return {
      label: metricLabel || 'Nilai',
      fromValue: null,
      toValue: rawMatch,
      singleValue: rawMatch,
      numericValue: val,
      multiplier: null,
      isPercentageGrowth: false,
      isComparison: false,
      confidence: 0.85,
    };
  }

  // 1E. Detect Single Percentage: "35%" or "80 %"
  const pctMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pctMatch) {
    const val = parseFloat(pctMatch[1].replace(',', '.'));
    const str = `${pctMatch[1]}%`;
    return {
      label: metricLabel || 'Persentase',
      fromValue: null,
      toValue: str,
      singleValue: str,
      numericValue: val,
      multiplier: null,
      isPercentageGrowth: true,
      isComparison: false,
      confidence: 0.85,
    };
  }

  // 1F. Detect Standalone Numeric Achievement: "mencapai 500 order", "tembus 1000", "angka 4.5"
  const achievedMatch = text.match(/(?:mencapai|tembus|sebanyak|total|angka)\s+(\d+(?:[.,]\d+)?)/i);
  if (achievedMatch) {
    const val = parseFloat(achievedMatch[1].replace(',', '.'));
    return {
      label: metricLabel || 'Total',
      fromValue: null,
      toValue: achievedMatch[1],
      singleValue: achievedMatch[1],
      numericValue: val,
      multiplier: null,
      isPercentageGrowth: false,
      isComparison: false,
      confidence: 0.8,
    };
  }

  // No verified numeric data found in transcript
  return {
    label: null,
    fromValue: null,
    toValue: null,
    singleValue: null,
    numericValue: null,
    multiplier: null,
    isPercentageGrowth: false,
    isComparison: false,
    confidence: 0,
  };
}

// -------------------------------------------------------------
// 2. LIST ITEMS EXTRACTOR
// -------------------------------------------------------------

/**
 * Extracts structured list items. Requires explicit enumeration or multiple extractable items.
 * Ensures "Saya bekerja 3 tahun" yields 0 confidence.
 */
export function extractListItems(transcript: string): ExtractedListContent {
  if (!transcript || typeof transcript !== 'string') {
    return { headline: null, items: [], confidence: 0 };
  }

  const text = transcript.trim();
  const textUpper = text.toUpperCase();

  // Exclude purely chronological/temporal expressions like "3 tahun" without list structure
  if (
    /\b\d+\s*(tahun|bulan|minggu|hari|jam|detik)\b/i.test(text) &&
    !text.includes(':') &&
    !/pertama|kedua|yaitu|adalah|kesalahan|alasan|faktor|tips|poin/i.test(text)
  ) {
    return { headline: null, items: [], confidence: 0 };
  }

  // Pattern A: Colon separated list with headline
  // e.g. "Ada 3 kesalahan: targeting buruk, hook lemah, proof tidak ada"
  const colonMatch = text.match(/([^:]+):\s*(.+)/);
  if (colonMatch) {
    const lead = colonMatch[1].trim();
    const rawItems = colonMatch[2];
    const parts = rawItems
      .split(/[,;\n]|(?:\s+dan\s+)/i)
      .map(s => s.trim().replace(/^[-*•\d.)]\s*/, ''))
      .filter(s => s.length > 2);

    if (parts.length >= 2) {
      let headline = lead;
      if (headline.length > 30) {
        const words = headline.split(/\s+/);
        headline = words.slice(-4).join(' ');
      }
      return {
        headline: headline.replace(/^(ada|inilah|berikut)\s+/i, '').trim(),
        items: parts.slice(0, 4),
        confidence: 0.92,
      };
    }
  }

  // Pattern B: Explicit sequential markers (Pertama ..., kedua ..., ketiga ...)
  if (/pertama/i.test(text) && /kedua/i.test(text)) {
    const parts: string[] = [];
    const firstMatch = text.match(/pertama[:\s,]+([^,;.]+)/i);
    const secondMatch = text.match(/kedua[:\s,]+([^,;.]+)/i);
    const thirdMatch = text.match(/ketiga[:\s,]+([^,;.]+)/i);

    if (firstMatch) parts.push(firstMatch[1].trim());
    if (secondMatch) parts.push(secondMatch[1].trim());
    if (thirdMatch) parts.push(thirdMatch[1].trim());

    if (parts.length >= 2) {
      return {
        headline: 'Poin Penting',
        items: parts,
        confidence: 0.9,
      };
    }
  }

  // Pattern C: Explicit enumeration with "yaitu / adalah":
  // e.g. "Tiga hal utama yaitu riset audiens, testing hook, dan evaluasi CTR"
  const listIntroMatch = text.match(/(?:ada\s+)?(\d+|tiga|empat|lima)\s+(kesalahan|alasan|faktor|langkah|tips|rahasia|poin|hal)[^:]*?(?:yaitu|adalah|berupa)\s+(.+)/i);
  if (listIntroMatch) {
    const numWord = listIntroMatch[1];
    const topic = listIntroMatch[2];
    const rawItems = listIntroMatch[3];
    const parts = rawItems
      .split(/[,;\n]|(?:\s+dan\s+)/i)
      .map(s => s.trim().replace(/^[-*•\d.)]\s*/, ''))
      .filter(s => s.length > 2);

    if (parts.length >= 2) {
      return {
        headline: `${numWord} ${topic}`.toUpperCase(),
        items: parts.slice(0, 4),
        confidence: 0.88,
      };
    }
  }

  // Pattern D: Explicit numbered list "1. ... 2. ..."
  const numberedMatches = text.match(/\b\d+[.)]\s*([^0-9.]+)/g);
  if (numberedMatches && numberedMatches.length >= 2) {
    const items = numberedMatches.map(m => m.replace(/^\d+[.)]\s*/, '').trim()).filter(s => s.length > 2);
    if (items.length >= 2) {
      return {
        headline: 'Daftar Poin',
        items: items.slice(0, 4),
        confidence: 0.85,
      };
    }
  }

  // No reliable list found
  return { headline: null, items: [], confidence: 0 };
}

// -------------------------------------------------------------
// 3. BEFORE / AFTER EXTRACTOR
// -------------------------------------------------------------

/**
 * Extracts real contrast between past/former state and present/new state.
 * Never invents fabricated claims like "+250% Growth" or "Budget Terbakar".
 */
export function extractBeforeAfterContent(transcript: string): ExtractedBeforeAfterContent {
  if (!transcript || typeof transcript !== 'string') {
    return {
      beforeText: null,
      afterText: null,
      beforeLabel: 'SEBELUM',
      afterLabel: 'SESUDAH',
      improvementMetric: null,
      confidence: 0,
    };
  }

  const text = transcript.trim();

  // Pattern 1: Dulu X, sekarang Y / Dulu X, tapi sekarang Y
  const duluMatch = text.match(/dulu\s+(.+?)(?:,|\s+tapi|\s+sedangkan|\s+kini)?\s+sekarang\s+(.+)/i);
  if (duluMatch) {
    const beforePart = cleanText(duluMatch[1], 40);
    const afterPart = cleanText(duluMatch[2], 40);

    if (beforePart.length >= 2 && afterPart.length >= 2) {
      const metric = extractMetricContent(text);
      return {
        beforeText: beforePart,
        afterText: afterPart,
        beforeLabel: 'DULU',
        afterLabel: 'SEKARANG',
        improvementMetric: metric.multiplier || null,
        confidence: 0.92,
      };
    }
  }

  // Pattern 2: Sebelum / Sebelumnya X, sesudah / sekarang Y
  const sebelumMatch = text.match(/sebelum(?:nya)?\s+(.+?)(?:,|\s+lalu|\s+tapi)?\s+(?:sekarang|sesudahnya|setelahnya)\s+(.+)/i);
  if (sebelumMatch) {
    const beforePart = cleanText(sebelumMatch[1], 40);
    const afterPart = cleanText(sebelumMatch[2], 40);

    if (beforePart.length >= 2 && afterPart.length >= 2) {
      const metric = extractMetricContent(text);
      return {
        beforeText: beforePart,
        afterText: afterPart,
        beforeLabel: 'SEBELUM',
        afterLabel: 'SESUDAH',
        improvementMetric: metric.multiplier || null,
        confidence: 0.9,
      };
    }
  }

  // Pattern 3: Cara lama X vs cara baru Y
  const caraMatch = text.match(/cara\s+lama\s+(.+?)(?:\s+vs\s+|\s+dibanding\s+)?cara\s+baru\s+(.+)/i);
  if (caraMatch) {
    const beforePart = cleanText(caraMatch[1], 40);
    const afterPart = cleanText(caraMatch[2], 40);
    if (beforePart.length >= 2 && afterPart.length >= 2) {
      return {
        beforeText: beforePart,
        afterText: afterPart,
        beforeLabel: 'CARA LAMA',
        afterLabel: 'CARA BARU',
        improvementMetric: null,
        confidence: 0.88,
      };
    }
  }

  // Pattern 4: Explicit "Bedanya dulu ... sekarang ..."
  const bedaMatch = text.match(/bedanya\s+(.+?)\s+(?:dengan|dibanding)\s+(.+)/i);
  if (bedaMatch) {
    const beforePart = cleanText(bedaMatch[1], 40);
    const afterPart = cleanText(bedaMatch[2], 40);
    if (beforePart.length >= 2 && afterPart.length >= 2) {
      return {
        beforeText: beforePart,
        afterText: afterPart,
        beforeLabel: 'SEBELUM',
        afterLabel: 'SESUDAH',
        improvementMetric: null,
        confidence: 0.82,
      };
    }
  }

  // No real contrast found
  return {
    beforeText: null,
    afterText: null,
    beforeLabel: 'SEBELUM',
    afterLabel: 'SESUDAH',
    improvementMetric: null,
    confidence: 0,
  };
}

// -------------------------------------------------------------
// 4. PROCESS STEPS EXTRACTOR
// -------------------------------------------------------------

export function extractProcessSteps(transcript: string): ExtractedProcessContent {
  if (!transcript) return { title: null, steps: [], confidence: 0 };

  const text = transcript.trim();

  // Match step markers
  const stepMatches = text.match(/(?:langkah|step|tahap)\s*(\d+)[:\s]+([^,;.]+)/gi);
  if (stepMatches && stepMatches.length >= 2) {
    const steps: ExtractedStepItem[] = stepMatches.map((m, idx) => {
      const parts = m.replace(/^(?:langkah|step|tahap)\s*\d+[:\s]*/i, '').trim();
      return {
        stepNumber: idx + 1,
        title: cleanText(parts, 25),
      };
    });
    return {
      title: 'LANGKAH SISTEM',
      steps,
      confidence: 0.88,
    };
  }

  return { title: null, steps: [], confidence: 0 };
}

// -------------------------------------------------------------
// 5. TIMELINE EXTRACTOR
// -------------------------------------------------------------

export function extractTimelineContent(transcript: string): ExtractedTimelineContent {
  if (!transcript) return { title: null, milestones: [], confidence: 0 };

  const text = transcript.trim();
  const timeMatches = text.match(/\b(hari\s+\d+|minggu\s+\d+|bulan\s+\d+|hari\s+ke-\d+)[:\s]+([^,;.]+)/gi);
  if (timeMatches && timeMatches.length >= 2) {
    const milestones: ExtractedTimelineItem[] = timeMatches.map(m => {
      const match = m.match(/\b(hari\s+\d+|minggu\s+\d+|bulan\s+\d+|hari\s+ke-\d+)[:\s]+(.+)/i);
      if (match) {
        return {
          timeLabel: match[1].toUpperCase(),
          title: cleanText(match[2], 25),
        };
      }
      return {
        timeLabel: 'TAHAP',
        title: cleanText(m, 25),
      };
    });

    return {
      title: 'TIMELINE EKSEKUSI',
      milestones,
      confidence: 0.85,
    };
  }

  return { title: null, milestones: [], confidence: 0 };
}

// -------------------------------------------------------------
// 6. CTA CONTENT EXTRACTOR
// -------------------------------------------------------------

export function extractCtaContent(transcript: string, emphasisTarget?: string | null): ExtractedCtaContent {
  const textUpper = (transcript || '').toUpperCase();

  let actionText = 'AMBIL SEKARANG';
  if (/BIO|LINK/i.test(textUpper)) actionText = 'KLIK LINK DI BIO';
  else if (/DAFTAR|REGISTER/i.test(textUpper)) actionText = 'DAFTAR SEKARANG';
  else if (/DOWNLOAD|UNDUH/i.test(textUpper)) actionText = 'DOWNLOAD SEKARANG';
  else if (/DM|CHAT|WHATSAPP|WA\b/i.test(textUpper)) actionText = 'CHAT SEKARANG';
  else if (/BELI|ORDER|PESAN/i.test(textUpper)) actionText = 'PESAN SEKARANG';

  // Only attach urgency note if explicitly stated in transcript
  let urgencyNote: string | undefined;
  if (/HARI INI/i.test(textUpper)) urgencyNote = 'Berlaku Hari Ini';
  else if (/SLOT TERBATAS|KUOTA TERBATAS/i.test(textUpper)) urgencyNote = 'Slot Terbatas';
  else if (/TERAKHIR/i.test(textUpper)) urgencyNote = 'Kesempatan Terakhir';

  const headline = emphasisTarget || actionText;

  return {
    headline,
    actionButtonText: `${actionText} 👉`,
    urgencyNote,
    confidence: 0.9,
  };
}

// -------------------------------------------------------------
// 7. PRODUCT CONTENT EXTRACTOR
// -------------------------------------------------------------

export function extractProductContent(transcript: string, emphasisTarget?: string | null): ExtractedProductContent {
  const text = transcript || '';
  const textUpper = text.toUpperCase();

  // Extract prices if present
  let offerPrice: string | null = null;
  const priceMatch = text.match(/(?:Rp\.?\s*(\d+(?:[.,]\d+)*)|\b(\d+)\s*(?:ribu|juta)\b)/i);
  if (priceMatch) {
    offerPrice = priceMatch[0].trim();
  }

  // Extract discount badge if present
  let badge: string | null = null;
  const discountMatch = text.match(/(?:diskon|potongan|hemat)\s*(\d+%)/i);
  if (discountMatch) {
    badge = `DISKON ${discountMatch[1]}`;
  } else if (/PROMO|PENAWARAN/i.test(textUpper)) {
    badge = 'PENAWARAN';
  }

  let urgencyText: string | undefined;
  if (/HARI INI/i.test(textUpper)) urgencyText = 'Khusus Hari Ini';

  return {
    productName: emphasisTarget || null,
    badge,
    offerPrice,
    originalPrice: null,
    features: [],
    urgencyText,
    confidence: offerPrice || badge || emphasisTarget ? 0.75 : 0.2,
  };
}

// -------------------------------------------------------------
// 8. CLAIM CONTENT EXTRACTOR
// -------------------------------------------------------------

export function extractClaimContent(transcript: string, emphasisTarget?: string | null): ExtractedClaimContent {
  const text = (transcript || '').trim();
  const shortClaim = text.length > 55 ? `${text.slice(0, 52)}...` : text;

  return {
    title: emphasisTarget ? emphasisTarget.toUpperCase() : 'POIN UTAMA',
    claim: shortClaim || 'Fokus Pada Solusi',
    confidence: 0.85,
  };
}

// Helper to sanitize snippet length
function cleanText(s: string, maxLen: number): string {
  const clean = s.trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 3)}...`;
}
