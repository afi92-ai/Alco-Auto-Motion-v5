# Bundled FFmpeg Binaries for ALCO Auto Motion Desktop

This directory contains native production FFmpeg binaries for standalone desktop distribution:

- **Windows x64**:
  - `resources/ffmpeg/ffmpeg.exe` (156.64 MB)
  - `resources/ffmpeg/ffprobe.exe` (156.44 MB)
  - `resources/ffmpeg/LICENSE.txt` (GNU GPL v3.0)

## Distribution Metadata
- **Source**: BtbN FFmpeg-Builds (`ffmpeg-master-latest-win64-gpl`)
- **Target Platform**: Windows x64 (PE32+ console executable)
- **License**: GNU General Public License v3.0 (GPLv3)

## Automatic Detection Architecture

When the Electron application boots:
1. `electron/main.cjs` checks if `ffmpeg.exe` / `ffprobe.exe` exist in this `resources/ffmpeg/` directory (or in `process.resourcesPath/ffmpeg`).
2. If found, Electron sets `process.env.FFMPEG_PATH` and `process.env.FFPROBE_PATH` for the child server process.
3. `src/server/mp4Renderer.ts` resolves these environment variables with highest priority.
4. If not bundled, the server falls back to:
   - System PATH (`ffmpeg`, `ffprobe`)
   - Standard OS installation paths (`/usr/bin/ffmpeg`, `C:\ffmpeg\bin\ffmpeg.exe`, etc.)
   - FFmpeg.wasm browser fallback (`public/ffmpeg/ffmpeg-core.*`)

