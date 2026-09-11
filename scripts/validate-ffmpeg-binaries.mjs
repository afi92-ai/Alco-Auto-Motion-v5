import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Build-time validator for production FFmpeg & FFprobe binaries in resources/ffmpeg/
 * Strictly prevents packaging placeholder or corrupt binaries into Electron installer.
 */
async function validateFfmpegBinaries() {
  console.log('=== ALCO AUTO MOTION — PRODUCTION FFMPEG BINARY VALIDATION ===\n');

  const rootDir = process.cwd();
  const ffmpegExePath = path.join(rootDir, 'resources', 'ffmpeg', 'ffmpeg.exe');
  const ffprobeExePath = path.join(rootDir, 'resources', 'ffmpeg', 'ffprobe.exe');

  console.log(`Checking FFmpeg binary:  ${ffmpegExePath}`);
  console.log(`Checking FFprobe binary: ${ffprobeExePath}\n`);

  // 1. Existence check
  if (!fs.existsSync(ffmpegExePath)) {
    console.error('❌ ERROR: FFMPEG PRODUCTION BINARY MISSING');
    console.error(`Target file does not exist: ${ffmpegExePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(ffprobeExePath)) {
    console.error('❌ ERROR: FFPROBE PRODUCTION BINARY MISSING');
    console.error(`Target file does not exist: ${ffprobeExePath}`);
    process.exit(1);
  }

  // 2. File size check (>= 100 KB)
  const ffmpegSize = fs.statSync(ffmpegExePath).size;
  const ffprobeSize = fs.statSync(ffprobeExePath).size;

  const minSizeBytes = 100 * 1024; // 100 KB threshold

  console.log(`FFmpeg file size:  ${ffmpegSize} bytes (${(ffmpegSize / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`FFprobe file size: ${ffprobeSize} bytes (${(ffprobeSize / (1024 * 1024)).toFixed(2)} MB)\n`);

  if (ffmpegSize < minSizeBytes) {
    console.error('❌ ERROR: FFMPEG PRODUCTION BINARY INVALID');
    console.error(`File size (${ffmpegSize} bytes) is below plausible threshold (100 KB).`);
    console.error('File appears to be a placeholder or stub binary.');
    process.exit(1);
  }

  if (ffprobeSize < minSizeBytes) {
    console.error('❌ ERROR: FFPROBE PRODUCTION BINARY INVALID');
    console.error(`File size (${ffprobeSize} bytes) is below plausible threshold (100 KB).`);
    console.error('File appears to be a placeholder or stub binary.');
    process.exit(1);
  }

  // 3. Runtime execution check (-version)
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    try {
      const { stdout: ffmpegVer } = await execFileAsync(ffmpegExePath, ['-version']);
      console.log(`[PASS] FFmpeg execution successful:\n  ${ffmpegVer.split('\n')[0]}`);
    } catch (err) {
      console.error('❌ ERROR: FFMPEG BINARY RUNTIME EXECUTION FAILED');
      console.error(`Failed to execute 'ffmpeg.exe -version': ${err.message}`);
      process.exit(1);
    }

    try {
      const { stdout: ffprobeVer } = await execFileAsync(ffprobeExePath, ['-version']);
      console.log(`[PASS] FFprobe execution successful:\n  ${ffprobeVer.split('\n')[0]}`);
    } catch (err) {
      console.error('❌ ERROR: FFPROBE BINARY RUNTIME EXECUTION FAILED');
      console.error(`Failed to execute 'ffprobe.exe -version': ${err.message}`);
      process.exit(1);
    }
  } else {
    // Non-Windows build host (e.g. Linux container packaging Windows x64 build)
    console.log(`[NOTICE] Host platform is ${process.platform}. Target binaries are Windows PE x64 executables.`);
    console.log(`[PASS] File existence verified for ffmpeg.exe & ffprobe.exe.`);
    console.log(`[PASS] Size threshold verified (FFmpeg: ${(ffmpegSize / (1024 * 1024)).toFixed(2)} MB, FFprobe: ${(ffprobeSize / (1024 * 1024)).toFixed(2)} MB >= 100 KB).`);
    console.log(`[PASS] Binary header signature check:`);
    
    // Verify PE magic bytes (MZ)
    const ffmpegBuf = Buffer.alloc(2);
    const ffprobeBuf = Buffer.alloc(2);
    const fdFfmpeg = fs.openSync(ffmpegExePath, 'r');
    const fdFfprobe = fs.openSync(ffprobeExePath, 'r');
    fs.readSync(fdFfmpeg, ffmpegBuf, 0, 2, 0);
    fs.readSync(fdFfprobe, ffprobeBuf, 0, 2, 0);
    fs.closeSync(fdFfmpeg);
    fs.closeSync(fdFfprobe);

    if (ffmpegBuf.toString('ascii') === 'MZ' && ffprobeBuf.toString('ascii') === 'MZ') {
      console.log(`  - ffmpeg.exe: Valid Portable Executable magic bytes 'MZ' confirmed.`);
      console.log(`  - ffprobe.exe: Valid Portable Executable magic bytes 'MZ' confirmed.`);
    } else {
      console.error('❌ ERROR: INVALID BINARY HEADER');
      console.error('Files do not contain valid Portable Executable (MZ) header.');
      process.exit(1);
    }
  }

  console.log('\n✅ FFMPEG PRODUCTION BINARY VALIDATION PASSED SUCCESSFULLY.');
}

validateFfmpegBinaries().catch((err) => {
  console.error('❌ Unexpected validation script error:', err);
  process.exit(1);
});
