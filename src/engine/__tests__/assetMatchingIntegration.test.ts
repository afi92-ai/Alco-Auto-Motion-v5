import { buildIntelligentEditPlan } from '../index';
import { TranscriptSegment, UserProofAsset } from '../../types';

function runIntegrationTest() {
  console.log('=== RUNNING ASSET MATCHING E2E INTEGRATION TEST ===');

  const segments: TranscriptSegment[] = [
    { id: 1, start: 0, end: 3, text: 'Stop buang uang iklan tanpa tahu rahasia ini.' },
    { id: 2, start: 3, end: 6, text: 'Banyak creator boncos karena tidak punya sistem riset modul konten.' },
    { id: 3, start: 6, end: 9, text: 'Lihat perbedaannya sebelum dan sesudah transformasi metode baru.' },
    { id: 4, start: 9, end: 12, text: 'Ini modul software template yang tinggal Anda pasang.' },
    { id: 5, start: 12, end: 15, text: 'Hasil penjualan tembus omset 140 juta dan ROAS 5x lipat.' },
    { id: 6, start: 15, end: 18, text: 'Klik link di bio dan join official brand Alco Motion sekarang.' },
  ];

  const userAssets: UserProofAsset[] = [
    {
      id: 'asset-sales-dash',
      name: 'Dashboard Penjualan Omset ROAS',
      label: 'Grafik Omset 140 Juta',
      type: 'dashboard',
      url: 'https://cdn.example.com/omset.png',
    },
    {
      id: 'asset-software-demo',
      name: 'Modul Software Template Alco',
      label: 'Demo Workflow Template',
      type: 'screen_recording',
      url: 'https://cdn.example.com/demo.mp4',
    },
    {
      id: 'asset-comparison',
      name: 'Before After Transformasi Konten',
      label: 'Grafik Perbedaan Cara Lama vs Baru',
      type: 'before_after',
      url: 'https://cdn.example.com/compare.png',
    },
    {
      id: 'asset-brand-logo',
      name: 'Official Logo Alco Motion',
      label: 'Brand CTA Logo',
      type: 'logo',
      url: 'https://cdn.example.com/logo.png',
    },
  ];

  const project = buildIntelligentEditPlan(segments, [], 'meta_ads', '', '', 18, 'verbatim', userAssets);

  console.log(`Generated ${project.scenes.length} scenes.`);
  project.scenes.forEach((s, idx) => {
    console.log(`\nScene ${idx + 1} (${s.role}):`);
    console.log(`  visualDecision:`, s.visualDecision);
    console.log(`  brollNeedScore:`, s.brollNeedScore);
    console.log(`  brollNeedReasons:`, s.brollNeedReasons);
    console.log(`  broll:`, s.broll);
    console.log(`  visual_evidence:`, s.visual_evidence);
    console.log(`  asset_match:`, s.asset_match);
  });

  let passCount = 0;
  let failCount = 0;

  function verify(cond: boolean, desc: string, detail?: string) {
    if (cond) {
      console.log(`[PASS] ${desc}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${desc} - ${detail || ''}`);
      failCount++;
    }
  }

  // Scene 1 (Hook): Should keep clean A-roll eye-contact
  const scene1 = project.scenes[0];
  verify(
    scene1.broll === null,
    'Scene 1 (Hook): B-roll is null to protect 0-3s talking head eye-contact',
    `broll: ${JSON.stringify(scene1.broll)}`
  );

  // Scene 3 (Curiosity / Before After): Should match before_after comparison asset
  const scene3 = project.scenes[2];
  verify(
    scene3.broll?.sourceUrl === 'https://cdn.example.com/compare.png' ||
      scene3.visual_evidence?.userAssetUrl === 'https://cdn.example.com/compare.png',
    'Scene 3 (Curiosity): Matched Before-After comparison asset',
    `broll url: ${scene3.broll?.sourceUrl}, evidence url: ${scene3.visual_evidence?.userAssetUrl}`
  );

  // Scene 4 (Solution / Demo): Should match software template demo asset
  const scene4 = project.scenes[3];
  verify(
    scene4.broll?.sourceUrl === 'https://cdn.example.com/demo.mp4' ||
      scene4.visual_evidence?.userAssetUrl === 'https://cdn.example.com/demo.mp4',
    'Scene 4 (Solution): Matched Software demo asset',
    `broll url: ${scene4.broll?.sourceUrl}, evidence url: ${scene4.visual_evidence?.userAssetUrl}`
  );

  // Scene 5 (Proof / Sales): Should match dashboard sales asset
  const scene5 = project.scenes[4];
  verify(
    scene5.broll?.sourceUrl === 'https://cdn.example.com/omset.png' ||
      scene5.visual_evidence?.userAssetUrl === 'https://cdn.example.com/omset.png',
    'Scene 5 (Proof): Matched Omset / ROAS dashboard asset',
    `broll url: ${scene5.broll?.sourceUrl}, evidence url: ${scene5.visual_evidence?.userAssetUrl}`
  );

  // Scene 6 (CTA): Should match Brand CTA Logo asset
  const scene6 = project.scenes[5];
  verify(
    scene6.broll?.sourceUrl === 'https://cdn.example.com/logo.png' ||
      scene6.visual_evidence?.userAssetUrl === 'https://cdn.example.com/logo.png',
    'Scene 6 (CTA): Matched Brand CTA Logo asset',
    `broll url: ${scene6.broll?.sourceUrl}, evidence url: ${scene6.visual_evidence?.userAssetUrl}`
  );

  // Verification of asset_match presence
  const hasAssetMatchMeta = project.scenes.some(s => s.asset_match !== undefined);
  verify(hasAssetMatchMeta, 'Scene Edit Plan includes asset_match metadata');

  console.log(`\nINTEGRATION TEST SUMMARY: ${passCount} Passed, ${failCount} Failed\n`);
  return failCount === 0;
}

runIntegrationTest();
