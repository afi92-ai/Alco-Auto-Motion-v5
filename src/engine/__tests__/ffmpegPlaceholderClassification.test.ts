import { classifyFfmpegBinaryValidation } from '../../server/mp4Renderer';
import { runRenderCertification, canProceedToRendererExport, canProceedToRenderExport } from '../renderCertification';
import { AlcoEditingProject, SceneEditPlan, Mp4RuntimeVerification } from '../../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

function createMockScene(overrides: Partial<SceneEditPlan>): SceneEditPlan {
  return {
    id: 1,
    start: 0,
    end: 3.0,
    script: 'Hook opening test script for validation.',
    role: 'hook',
    visualDecision: 'TALKING_HEAD',
    brollFormat: 'typography',
    motion: 'normal',
    motion_scale: 1.0,
    requiresVisualHold: false,
    ...overrides,
  } as SceneEditPlan;
}

export function runFfmpegPlaceholderClassificationTestSuite(): void {
  console.log('=== RUNNING STEP 9.7.2 FFMPEG PLACEHOLDER CLASSIFICATION TEST SUITE ===\n');

  // -------------------------------------------------------------------------
  // TEST 1: File missing
  // -------------------------------------------------------------------------
  console.log('--- Test 1: File Missing Classification ---');
  {
    const res = classifyFfmpegBinaryValidation(
      '/path/to/nonexistent/ffmpeg',
      false, // fileExists
      0,     // fileSizeBytes
      false  // versionCheckSucceeded
    );

    assert(res.available === false, 'TEST 1.1: Missing binary available is false');
    assert(res.isPlaceholder === false, 'TEST 1.2: Missing binary isPlaceholder is false');
    assert(res.path === null, 'TEST 1.3: Missing binary path is null');
    assert(res.reason === 'binary missing', 'TEST 1.4: Reason indicates binary missing');
  }

  // -------------------------------------------------------------------------
  // TEST 2: Tiny executable / stub file (<100KB)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Tiny Executable / Stub File (<100KB) ---');
  {
    // E.g. resources/ffmpeg/ffmpeg.exe (34 bytes stub)
    const res = classifyFfmpegBinaryValidation(
      '/project/resources/ffmpeg/ffmpeg.exe',
      true,  // fileExists
      34,    // fileSizeBytes (34 bytes)
      false  // versionCheckSucceeded
    );

    assert(res.available === false, 'TEST 2.1: Stub binary available is false');
    assert(res.isPlaceholder === true, 'TEST 2.2: Stub binary isPlaceholder is true');
    assert(res.path === '/project/resources/ffmpeg/ffmpeg.exe', 'TEST 2.3: Candidate path preserved');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Binary exists but -version fails (corrupt / incompatible architecture)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Binary Exists But Execution Fails ---');
  {
    const res = classifyFfmpegBinaryValidation(
      '/usr/local/bin/ffmpeg',
      true,       // fileExists
      50 * 1024 * 1024, // fileSizeBytes (50 MB)
      false       // versionCheckSucceeded
    );

    assert(res.available === false, 'TEST 3.1: Execution failure available is false');
    assert(res.isPlaceholder === true, 'TEST 3.2: Execution failure isPlaceholder is true');
    assert(res.reason?.includes('failed runtime validation') === true, 'TEST 3.3: Reason mentions runtime validation failure');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Real valid executable
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Real Valid Executable ---');
  {
    const res = classifyFfmpegBinaryValidation(
      '/usr/bin/ffmpeg',
      true,       // fileExists
      75 * 1024 * 1024, // fileSizeBytes (75 MB)
      true        // versionCheckSucceeded
    );

    assert(res.available === true, 'TEST 4.1: Valid binary available is true');
    assert(res.isPlaceholder === false, 'TEST 4.2: Valid binary isPlaceholder is false');
    assert(res.path === '/usr/bin/ffmpeg', 'TEST 4.3: Valid binary path returned');
    assert(res.reason === 'valid binary', 'TEST 4.4: Reason indicates valid binary');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Health endpoint response contract simulation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Health Endpoint Response Contract Mapping ---');
  {
    // Case 5A: Placeholder detected
    const mockBinsPlaceholder = {
      ffmpegPath: null,
      ffprobePath: null,
      ffmpegAvailable: false,
      ffprobeAvailable: false,
      ffmpegPlaceholder: true,
      ffprobePlaceholder: true,
      isPlaceholder: true,
      validationReason: 'Bundled FFmpeg executables exist but failed runtime validation.',
    };

    const healthResponsePlaceholder = {
      success: true,
      mode: 'server',
      renderMp4Available: mockBinsPlaceholder.ffmpegAvailable && mockBinsPlaceholder.ffprobeAvailable,
      ffmpegAvailable: mockBinsPlaceholder.ffmpegAvailable,
      ffprobeAvailable: mockBinsPlaceholder.ffprobeAvailable,
      isPlaceholder: mockBinsPlaceholder.isPlaceholder === true,
      ffmpegPlaceholder: mockBinsPlaceholder.ffmpegPlaceholder === true,
      ffprobePlaceholder: mockBinsPlaceholder.ffprobePlaceholder === true,
      validationReason: mockBinsPlaceholder.validationReason,
    };

    assert(healthResponsePlaceholder.renderMp4Available === false, 'TEST 5.1: Placeholder renderMp4Available is false');
    assert(healthResponsePlaceholder.isPlaceholder === true, 'TEST 5.2: Placeholder isPlaceholder is true');
    assert(healthResponsePlaceholder.ffmpegPlaceholder === true, 'TEST 5.3: ffmpegPlaceholder is true');

    // Case 5B: Valid binaries
    const mockBinsValid = {
      ffmpegPath: '/usr/bin/ffmpeg',
      ffprobePath: '/usr/bin/ffprobe',
      ffmpegAvailable: true,
      ffprobeAvailable: true,
      ffmpegPlaceholder: false,
      ffprobePlaceholder: false,
      isPlaceholder: false,
      validationReason: 'Valid FFmpeg and FFprobe binaries verified.',
    };

    const healthResponseValid = {
      success: true,
      mode: 'server',
      renderMp4Available: mockBinsValid.ffmpegAvailable && mockBinsValid.ffprobeAvailable,
      ffmpegAvailable: mockBinsValid.ffmpegAvailable,
      ffprobeAvailable: mockBinsValid.ffprobeAvailable,
      isPlaceholder: mockBinsValid.isPlaceholder === true,
      ffmpegPlaceholder: mockBinsValid.ffmpegPlaceholder === true,
      ffprobePlaceholder: mockBinsValid.ffprobePlaceholder === true,
      validationReason: mockBinsValid.validationReason,
    };

    assert(healthResponseValid.renderMp4Available === true, 'TEST 5.4: Valid renderMp4Available is true');
    assert(healthResponseValid.isPlaceholder === false, 'TEST 5.5: Valid isPlaceholder is false');

    // Case 5C: Missing binaries
    const mockBinsMissing = {
      ffmpegPath: null,
      ffprobePath: null,
      ffmpegAvailable: false,
      ffprobeAvailable: false,
      ffmpegPlaceholder: false,
      ffprobePlaceholder: false,
      isPlaceholder: false,
      validationReason: 'FFmpeg binary missing in runtime environment.',
    };

    const healthResponseMissing = {
      success: true,
      mode: 'server',
      renderMp4Available: mockBinsMissing.ffmpegAvailable && mockBinsMissing.ffprobeAvailable,
      ffmpegAvailable: mockBinsMissing.ffmpegAvailable,
      ffprobeAvailable: mockBinsMissing.ffprobeAvailable,
      isPlaceholder: mockBinsMissing.isPlaceholder === true,
      ffmpegPlaceholder: mockBinsMissing.ffmpegPlaceholder === true,
      ffprobePlaceholder: mockBinsMissing.ffprobePlaceholder === true,
      validationReason: mockBinsMissing.validationReason,
    };

    assert(healthResponseMissing.renderMp4Available === false, 'TEST 5.6: Missing renderMp4Available is false');
    assert(healthResponseMissing.isPlaceholder === false, 'TEST 5.7: Missing isPlaceholder is false');
  }

  // -------------------------------------------------------------------------
  // TEST 6: ExportModal Evaluation Order Contract (Placeholder never becomes VERIFIED)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: ExportModal Evaluation Order Safety ---');
  {
    // Simulating health check results where HTTP status is 200 and JSON is valid
    const simulateExportModalEvaluation = (healthData: any, pingSuccess: boolean) => {
      const isPlaceholder =
        healthData?.isPlaceholder === true ||
        healthData?.ffmpegPlaceholder === true ||
        healthData?.ffprobePlaceholder === true;

      const healthSuccess =
        healthData?.success === true &&
        healthData?.renderMp4Available === true &&
        healthData?.ffmpegAvailable === true &&
        healthData?.ffprobeAvailable === true &&
        !healthData?.isPlaceholder &&
        !healthData?.ffmpegPlaceholder &&
        !healthData?.ffprobePlaceholder;

      let verificationStatus: Mp4RuntimeVerification = 'NOT_VERIFIED';
      let backendMode = 'missing';

      if (isPlaceholder) {
        verificationStatus = 'PLACEHOLDER';
        backendMode = 'ffmpeg_missing';
      } else if (healthSuccess && pingSuccess) {
        verificationStatus = 'VERIFIED';
        backendMode = 'available';
      } else if (healthData && healthData.success === true && (healthData.ffmpegAvailable === false || healthData.ffprobeAvailable === false)) {
        verificationStatus = 'UNAVAILABLE';
        backendMode = 'ffmpeg_missing';
      } else {
        verificationStatus = 'NOT_VERIFIED';
        backendMode = 'missing';
      }

      return { verificationStatus, backendMode };
    };

    // Placeholder payload
    const evalPlaceholder = simulateExportModalEvaluation(
      {
        success: true,
        renderMp4Available: false,
        ffmpegAvailable: false,
        ffprobeAvailable: false,
        isPlaceholder: true,
        ffmpegPlaceholder: true,
        ffprobePlaceholder: true,
      },
      true // ping endpoint also responded 200
    );

    assert(evalPlaceholder.verificationStatus === 'PLACEHOLDER', 'TEST 6.1: Placeholder evaluated to PLACEHOLDER');
    assert(evalPlaceholder.backendMode === 'ffmpeg_missing', 'TEST 6.2: Placeholder backendMode is ffmpeg_missing (NOT available)');

    // Valid payload
    const evalValid = simulateExportModalEvaluation(
      {
        success: true,
        renderMp4Available: true,
        ffmpegAvailable: true,
        ffprobeAvailable: true,
        isPlaceholder: false,
      },
      true
    );

    assert(evalValid.verificationStatus === 'VERIFIED', 'TEST 6.3: Valid runtime evaluated to VERIFIED');
    assert(evalValid.backendMode === 'available', 'TEST 6.4: Valid runtime backendMode is available');
  }

  // -------------------------------------------------------------------------
  // TEST 7: Render Certification Hardening with PLACEHOLDER
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Render Certification Hardening on PLACEHOLDER ---');
  {
    const scene = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [scene],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'PLACEHOLDER',
    });

    assert(report.mp4Verified === false, 'TEST 7.1: mp4Verified is false');
    assert(report.mp4Pass === false, 'TEST 7.2: mp4Pass is false');
    assert(report.fullParityVerified === false, 'TEST 7.3: fullParityVerified is false');
    assert(canProceedToRendererExport(report, 'MP4') === false, 'TEST 7.4: MP4 export blocked');
    assert(canProceedToRendererExport(report, 'WEBM') === true, 'TEST 7.5: WebM export allowed');
    assert(canProceedToRenderExport(report) === true, 'TEST 7.6: Overall render allowed (via WebM/Canvas fallback)');

    const issue = report.issues.find((i) => i.code === 'MP4_FFMPEG_PLACEHOLDER');
    assert(issue !== undefined, 'TEST 7.7: MP4_FFMPEG_PLACEHOLDER issue recorded');
  }

  console.log(`\n=== STEP 9.7.2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Run test if invoked directly
runFfmpegPlaceholderClassificationTestSuite();
