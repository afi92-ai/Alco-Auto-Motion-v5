import { matchAssetForScene, calculateAssetRelevanceScore, recordAssetUsage, DEFAULT_MIN_RELEVANCE_SCORE } from '../assetMatcher';
import { UserProofAsset, AssetUsageHistory } from '../../types';

function runTests() {
  console.log('=== RUNNING ASSET MATCHER TEST SUITE ===');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  // Assets definitions
  const assetDashboardSales: UserProofAsset = {
    id: 'asset-1',
    name: 'Dashboard Penjualan Revenue',
    label: 'Grafik Omset Bulanan',
    type: 'dashboard',
    url: 'https://example.com/sales.png',
  };

  const assetLogo: UserProofAsset = {
    id: 'asset-2',
    name: 'Logo Alco Official',
    label: 'Brand Mark',
    type: 'logo',
    url: 'https://example.com/logo.png',
  };

  const assetProductSerum: UserProofAsset = {
    id: 'asset-3',
    name: 'Foto Produk Serum Wajah Glow',
    label: 'Kemasan Botol Serum',
    type: 'product',
    url: 'https://example.com/serum.png',
  };

  const assetUnrelatedScreenshot: UserProofAsset = {
    id: 'asset-4',
    name: 'Screenshot Game Offline',
    label: 'Gameplay Score',
    type: 'screenshot',
    url: 'https://example.com/game.png',
  };

  const assetDashboardServer: UserProofAsset = {
    id: 'asset-5',
    name: 'Dashboard Server CPU Load',
    label: 'DevOps Metrics',
    type: 'dashboard',
    url: 'https://example.com/server.png',
  };

  // CASE A: "Penjualan meningkat 37 persen."
  {
    const assets = [assetLogo, assetUnrelatedScreenshot, assetDashboardSales, assetProductSerum];
    const res = matchAssetForScene(
      { transcript: 'Penjualan meningkat 37 persen dalam sebulan.', role: 'proof', sceneIndex: 3 },
      assets
    );
    assert(
      res.asset?.id === 'asset-1',
      'CASE A: Proof Scene with Sales & 37%',
      `Expected asset-1 (Dashboard Penjualan), got ${res.asset?.name} with score ${res.score}`
    );
    assert(
      res.matchedKeywords.length > 0 && res.matchedKeywords.includes('penjualan'),
      'CASE A: Keyword overlap detected',
      `Matched keywords: ${res.matchedKeywords.join(', ')}`
    );
  }

  // CASE B: "Ini produk yang saya gunakan."
  {
    const assets = [assetDashboardSales, assetProductSerum, assetLogo];
    const res = matchAssetForScene(
      { transcript: 'Ini produk serum wajah yang saya gunakan sehari-hari.', role: 'solution', sceneIndex: 2 },
      assets
    );
    assert(
      res.asset?.id === 'asset-3',
      'CASE B: Solution Scene with Product explanation',
      `Expected asset-3 (Foto Produk Serum), got ${res.asset?.name} with score ${res.score}`
    );
  }

  // CASE C: "Klik link dan mulai sekarang."
  {
    const assets = [assetDashboardSales, assetLogo, assetUnrelatedScreenshot];
    const res = matchAssetForScene(
      { transcript: 'Klik link di bawah dan mulai sekarang bersama official brand.', role: 'cta', sceneIndex: 5 },
      assets
    );
    assert(
      res.asset?.id === 'asset-2',
      'CASE C: CTA scene selects Brand Logo over random dashboard',
      `Expected asset-2 (Logo Alco), got ${res.asset?.name} with score ${res.score}`
    );
  }

  // CASE D: 5 assets with same type ('dashboard') but different content
  {
    const d1: UserProofAsset = { id: 'd-1', name: 'Dashboard Crypto Trading', url: 'u1', type: 'dashboard' };
    const d2: UserProofAsset = { id: 'd-2', name: 'Dashboard Game Highscore', url: 'u2', type: 'dashboard' };
    const d3: UserProofAsset = { id: 'd-3', name: 'Dashboard Omset Penjualan Toko Online', url: 'u3', type: 'dashboard' };
    const d4: UserProofAsset = { id: 'd-4', name: 'Dashboard Weather Cuaca', url: 'u4', type: 'dashboard' };
    const d5: UserProofAsset = { id: 'd-5', name: 'Dashboard Nilai Ujian Siswa', url: 'u5', type: 'dashboard' };

    const assets = [d1, d2, d3, d4, d5];
    const res = matchAssetForScene(
      { transcript: 'Ini bukti omset penjualan toko online kita yang tembus rekor.', role: 'proof', sceneIndex: 2 },
      assets
    );
    assert(
      res.asset?.id === 'd-3',
      'CASE D: Same type, best keyword matching wins over 1st array item',
      `Expected d-3, got ${res.asset?.name} with score ${res.score}`
    );
  }

  // CASE E: Reuse penalty test
  {
    const d1: UserProofAsset = { id: 'd-1', name: 'Dashboard Omset Toko', url: 'u1', type: 'dashboard' };
    const d2: UserProofAsset = { id: 'd-2', name: 'Screenshot Bukti Rekening Transfer Omset', url: 'u2', type: 'screenshot' };

    let history: AssetUsageHistory = {};
    // Asset d1 was used in scene 2
    history = recordAssetUsage(history, 'd-1', 2);

    // In scene 3 (distance = 1, consecutive scene):
    const res = matchAssetForScene(
      { transcript: 'Bukti transfer omset masuk setiap hari.', role: 'proof', sceneIndex: 3 },
      [d1, d2],
      history
    );

    assert(
      res.asset?.id === 'd-2',
      'CASE E: Immediate reuse penalty shifts selection to alternative qualified asset',
      `Expected d-2, got ${res.asset?.name} (d1 reusePenalty: ${res.allRanked?.find(r => r.asset.id === 'd-1')?.reusePenalty})`
    );
  }

  // CASE F: All assets irrelevant
  {
    const irrelevantAssets: UserProofAsset[] = [
      { id: 'irr-1', name: 'Kucing Lucu Tidur', url: 'u1', type: 'product', label: 'Hewan Peliharaan' },
      { id: 'irr-2', name: 'Langit Sore Indah', url: 'u2', type: 'screenshot', label: 'Pemandangan Senja' },
    ];
    const res = matchAssetForScene(
      { transcript: 'Banyak orang boncos bakar uang tanpa tahu masalah fatal ini.', role: 'problem', sceneIndex: 1 },
      irrelevantAssets,
      {},
      { minRelevanceScore: 0.45 }
    );

    assert(
      res.asset === null,
      'CASE F: Irrelevant assets rejected below minimum threshold',
      `Expected null, got ${res.asset ? (res.asset as any).name : 'null'} with score ${res.score}`
    );
  }

  // CASE G: No assets provided
  {
    const res = matchAssetForScene(
      { transcript: 'Banyak orang boncos bakar uang tanpa tahu masalah fatal ini.', role: 'problem', sceneIndex: 1 },
      []
    );
    assert(
      res.asset === null && res.score === 0,
      'CASE G: No assets provided returns null with 0 score'
    );
  }

  console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed\n`);
  return failed === 0;
}

runTests();
