import {
  classifyFfmpegBinaryValidation,
  getCandidateType,
} from '../../server/mp4Renderer';
import {
  runRenderCertification,
  canProceedToRendererExport,
  canProceedToRenderExport,
} from '../renderCertification';
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
  console.log('=== RUNNING STEP 9.7.2.1 FFMPEG RESOLUTION & PLACEHOLDER TEST SUITE ===\n');

  // -------------------------------------------------------------------------
  // MANDATORY TEST 1: Explicit path missing
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Explicit Path Missing ---');
  {
    const res = classifyFfmpegBinaryValidation(
      '/path/to/nonexistent/ffmpeg',
      false, // fileExists
      0,     // fileSizeBytes
      false, // versionCheckSucceeded
      'EXPLICIT_PATH'
    );

    assert(res.available === false, 'TEST 1.1: Missing explicit binary available is false');
    assert(res.isPlaceholder === false, 'TEST 1.2: Missing explicit binary isPlaceholder is false');
    assert(res.path === null, 'TEST 1.3: Missing explicit binary path is null');
    assert(res.reason === 'binary missing', 'TEST 1.4: Reason indicates binary missing');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 2: Explicit tiny stub (<100KB)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Explicit Tiny Stub (<100KB) ---');
  {
    const res = classifyFfmpegBinaryValidation(
      '/project/resources/ffmpeg/ffmpeg.exe',
      true,  // fileExists
      34,    // fileSizeBytes
      false, // versionCheckSucceeded
      'EXPLICIT_PATH'
    );

    assert(res.available === false, 'TEST 2.1: Stub binary available is false');
    assert(res.isPlaceholder === true, 'TEST 2.2: Stub binary isPlaceholder is true');
    assert(res.path === '/project/resources/ffmpeg/ffmpeg.exe', 'TEST 2.3: Candidate path preserved');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 3: Explicit corrupt executable (-version fails)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Explicit Corrupt Executable (-version fails) ---');
  {
    const res = classifyFfmpegBinaryValidation(
      '/usr/local/bin/ffmpeg',
      true,       // fileExists
      50 * 1024 * 1024, // fileSizeBytes
      false,      // versionCheckSucceeded
      'EXPLICIT_PATH'
    );

    assert(res.available === false, 'TEST 3.1: Execution failure available is false');
    assert(res.isPlaceholder === true, 'TEST 3.2: Execution failure isPlaceholder is true');
    assert(res.reason?.includes('failed runtime validation') === true, 'TEST 3.3: Reason indicates failed runtime validation');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 4: Explicit valid executable (-version succeeds)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Explicit Valid Executable (-version succeeds) ---');
  {
    const res = classifyFfmpegBinaryValidation(
      '/usr/bin/ffmpeg',
      true,       // fileExists
      75 * 1024 * 1024, // fileSizeBytes
      true,       // versionCheckSucceeded
      'EXPLICIT_PATH'
    );

    assert(res.available === true, 'TEST 4.1: Valid explicit binary available is true');
    assert(res.isPlaceholder === false, 'TEST 4.2: Valid explicit binary isPlaceholder is false');
    assert(res.path === '/usr/bin/ffmpeg', 'TEST 4.3: Valid binary path returned');
    assert(res.reason === 'valid binary', 'TEST 4.4: Reason indicates valid binary');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 5: System PATH command "ffmpeg" (-version succeeds)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: System PATH Command "ffmpeg" (-version succeeds) ---');
  {
    assert(getCandidateType('ffmpeg') === 'SYSTEM_PATH_COMMAND', 'TEST 5.1: "ffmpeg" identified as SYSTEM_PATH_COMMAND');
    const res = classifyFfmpegBinaryValidation(
      'ffmpeg',
      false, // fileExists
      0,     // fileSizeBytes
      true,  // versionCheckSucceeded
      'SYSTEM_PATH_COMMAND'
    );

    assert(res.available === true, 'TEST 5.2: System PATH command available is true when version check succeeds');
    assert(res.isPlaceholder === false, 'TEST 5.3: System PATH command isPlaceholder is false');
    assert(res.path === 'ffmpeg', 'TEST 5.4: Command name returned as path');
    assert(res.reason === 'valid system path command', 'TEST 5.5: Reason indicates valid system path command');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 6: System PATH command "ffmpeg" (-version fails)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: System PATH Command "ffmpeg" (-version fails) ---');
  {
    const res = classifyFfmpegBinaryValidation(
      'ffmpeg',
      false, // fileExists
      0,     // fileSizeBytes
      false, // versionCheckSucceeded
      'SYSTEM_PATH_COMMAND'
    );

    assert(res.available === false, 'TEST 6.1: Unavailable system PATH command available is false');
    assert(res.isPlaceholder === false, 'TEST 6.2: Unavailable system PATH command isPlaceholder is false');
    assert(res.reason === 'command unavailable from system PATH', 'TEST 6.3: Reason indicates command unavailable from system PATH');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 7: Bundled placeholder exists but later System PATH ffmpeg succeeds
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Bundled Placeholder Fallback to System PATH FFmpeg ---');
  {
    const candidates = [
      'resources/ffmpeg/ffmpeg.exe',
      'ffmpeg',
    ];

    let resolvedFfmpeg: string | null = null;
    let ffmpegPlaceholderDetected = false;

    for (const p of candidates) {
      const candType = getCandidateType(p);
      const isExplicit = candType === 'EXPLICIT_PATH';
      const fileExists = isExplicit;
      const fileSizeBytes = isExplicit ? 34 : 0;
      const versionOk = candType === 'SYSTEM_PATH_COMMAND';

      const classification = classifyFfmpegBinaryValidation(p, fileExists, fileSizeBytes, versionOk, candType);

      if (classification.available) {
        resolvedFfmpeg = p;
        break;
      } else if (classification.isPlaceholder) {
        ffmpegPlaceholderDetected = true;
      }
    }

    const ffmpegAvailable = !!resolvedFfmpeg;
    const ffmpegPlaceholder = ffmpegPlaceholderDetected && !ffmpegAvailable;

    assert(ffmpegAvailable === true, 'TEST 7.1: FFmpeg resolved from system PATH');
    assert(resolvedFfmpeg === 'ffmpeg', 'TEST 7.2: Resolved path is "ffmpeg"');
    assert(ffmpegPlaceholder === false, 'TEST 7.3: ffmpegPlaceholder is false because valid binary was found');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 8: Bundled ffprobe placeholder but PATH ffprobe succeeds
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: Bundled FFprobe Placeholder Fallback to System PATH FFprobe ---');
  {
    const candidates = [
      'resources/ffmpeg/ffprobe.exe',
      'ffprobe',
    ];

    let resolvedFfprobe: string | null = null;
    let ffprobePlaceholderDetected = false;

    for (const p of candidates) {
      const candType = getCandidateType(p);
      const isExplicit = candType === 'EXPLICIT_PATH';
      const fileExists = isExplicit;
      const fileSizeBytes = isExplicit ? 34 : 0;
      const versionOk = candType === 'SYSTEM_PATH_COMMAND';

      const classification = classifyFfmpegBinaryValidation(p, fileExists, fileSizeBytes, versionOk, candType);

      if (classification.available) {
        resolvedFfprobe = p;
        break;
      } else if (classification.isPlaceholder) {
        ffprobePlaceholderDetected = true;
      }
    }

    const ffprobeAvailable = !!resolvedFfprobe;
    const ffprobePlaceholder = ffprobePlaceholderDetected && !ffprobeAvailable;

    assert(ffprobeAvailable === true, 'TEST 8.1: FFprobe resolved from system PATH');
    assert(resolvedFfprobe === 'ffprobe', 'TEST 8.2: Resolved path is "ffprobe"');
    assert(ffprobePlaceholder === false, 'TEST 8.3: ffprobePlaceholder is false because valid binary was found');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 9: FFmpeg valid from PATH, FFprobe valid from explicit path
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9: Mixed Source Binary Resolution ---');
  {
    const ffmpegRes = classifyFfmpegBinaryValidation('ffmpeg', false, 0, true, 'SYSTEM_PATH_COMMAND');
    const ffprobeRes = classifyFfmpegBinaryValidation('/usr/bin/ffprobe', true, 50 * 1024 * 1024, true, 'EXPLICIT_PATH');

    const renderMp4Available = ffmpegRes.available && ffprobeRes.available;
    const isPlaceholder = ffmpegRes.isPlaceholder || ffprobeRes.isPlaceholder;

    assert(renderMp4Available === true, 'TEST 9.1: renderMp4Available is true for mixed sources');
    assert(isPlaceholder === false, 'TEST 9.2: isPlaceholder is false when both sources are valid');
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 10: Both PATH commands valid
  // -------------------------------------------------------------------------
  console.log('\n--- Test 10: Both PATH Commands Valid ---');
  {
    const ffmpegRes = classifyFfmpegBinaryValidation('ffmpeg', false, 0, true, 'SYSTEM_PATH_COMMAND');
    const ffprobeRes = classifyFfmpegBinaryValidation('ffprobe', false, 0, true, 'SYSTEM_PATH_COMMAND');

    const renderMp4Available = ffmpegRes.available && ffprobeRes.available;
    const isPlaceholder = ffmpegRes.isPlaceholder || ffprobeRes.isPlaceholder;

    assert(renderMp4Available === true, 'TEST 10.1: renderMp4Available is true for PATH commands');
    assert(isPlaceholder === false, 'TEST 10.2: isPlaceholder is false for PATH commands');
  }

  // -------------------------------------------------------------------------
  // TEST 11: Render Certification Hardening on PLACEHOLDER
  // -------------------------------------------------------------------------
  console.log('\n--- Test 11: Render Certification Hardening on PLACEHOLDER ---');
  {
    const scene = createMockScene({ id: 1, start: 0, end: 3.0 });
    const project: Partial<AlcoEditingProject> = {
      total_duration: 3.0,
      scenes: [scene],
    };

    const report = runRenderCertification(project, {
      mp4RuntimeVerification: 'PLACEHOLDER',
    });

    assert(report.mp4Verified === false, 'TEST 11.1: mp4Verified is false');
    assert(report.mp4Pass === false, 'TEST 11.2: mp4Pass is false');
    assert(report.fullParityVerified === false, 'TEST 11.3: fullParityVerified is false');
    assert(canProceedToRendererExport(report, 'MP4') === false, 'TEST 11.4: MP4 export blocked');
    assert(canProceedToRendererExport(report, 'WEBM') === true, 'TEST 11.5: WebM export allowed');
    assert(canProceedToRenderExport(report) === true, 'TEST 11.6: Overall render allowed (via WebM/Canvas fallback)');

    const issue = report.issues.find((i) => i.code === 'MP4_FFMPEG_PLACEHOLDER');
    assert(issue !== undefined, 'TEST 11.7: MP4_FFMPEG_PLACEHOLDER issue recorded');
  }

  console.log(`\n=== STEP 9.7.2.1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Run test if invoked directly
runFfmpegPlaceholderClassificationTestSuite();
