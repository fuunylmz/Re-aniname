import fs from 'fs/promises';
import path from 'path';
import type { ScannedFile } from '../ai/schema';
import { generateDestinationPath } from './namer';

export type OutputMode = 'move' | 'link' | 'copy' | 'symlink';

export interface ProcessOptions {
  outputDir: string;
  mode: OutputMode;
  overwrite?: boolean;
}

const SUBTITLE_EXTENSIONS = new Set([
  '.srt', '.ass', '.ssa', '.sub', '.vtt', '.smi', '.idx'
]);

async function performOperation(
  src: string,
  dest: string,
  mode: OutputMode,
  overwrite: boolean = false
) {
  const destDir = path.dirname(dest);
  await fs.mkdir(destDir, { recursive: true });

  try {
    await fs.stat(dest);
    if (!overwrite) {
      // Skip if exists
      return;
    }
    await fs.unlink(dest).catch(() => {});
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  switch (mode) {
    case 'move':
      await fs.rename(src, dest);
      break;
    case 'link':
      try {
        const absSrc = path.resolve(src);
        const absDest = path.resolve(dest);
        await fs.link(absSrc, absDest);
      } catch (err: any) {
        if (err.code === 'EXDEV' || err.code === 'EPERM') {
          throw new Error(`Hard link failed (Cross-device or Permission error). Source and destination MUST be on the same drive/partition for hard links. \nSource: ${src}\nDest: ${dest}`);
        }
        throw err;
      }
      break;
    case 'symlink':
      await fs.symlink(src, dest);
      break;
    case 'copy':
      await fs.copyFile(src, dest);
      break;
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}

async function processSidecars(
  file: ScannedFile,
  destVideoPath: string,
  options: ProcessOptions
) {
  try {
    const srcDir = path.dirname(file.originalPath);
    const srcExt = file.extension;
    const srcBase = path.basename(file.originalPath, srcExt);
    
    // List all files in source directory
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    
    // Find files that start with the same basename and have subtitle extensions
    // Note: strict check "startsWith" might be too loose if filename is "Movie" and there is "Movie 2".
    // Better to check if the file is exactly "basename.ext" or "basename.lang.ext"
    const sidecars = entries.filter(entry => {
      if (!entry.isFile()) return false;
      const entryExt = path.extname(entry.name).toLowerCase();
      if (!SUBTITLE_EXTENSIONS.has(entryExt)) return false;
      
      const entryBase = path.basename(entry.name, entryExt);
      // Check if it matches exactly or is a language variant (e.g. Movie.en.srt)
      return entryBase === srcBase || entryBase.startsWith(`${srcBase}.`);
    });

    const destBase = path.join(
      path.dirname(destVideoPath),
      path.basename(destVideoPath, path.extname(destVideoPath))
    );

    for (const sidecar of sidecars) {
      const sidecarSrc = path.join(srcDir, sidecar.name);
      
      // Construct destination name
      // If src is "Movie.en.srt", and destBase is "NewName", we want "NewName.en.srt"
      // We need to extract the suffix after the base name
      const suffix = sidecar.name.slice(srcBase.length); // e.g. ".en.srt" or ".srt"
      const sidecarDest = `${destBase}${suffix}`;

      try {
        await performOperation(sidecarSrc, sidecarDest, options.mode, options.overwrite);
        console.log(`Processed sidecar: ${sidecar.name} -> ${path.basename(sidecarDest)}`);
      } catch (err) {
        console.error(`Failed to process sidecar ${sidecar.name}`, err);
      }
    }
  } catch (error) {
    console.error('Error processing sidecars:', error);
  }
}

export async function processFile(
  file: ScannedFile,
  options: ProcessOptions
): Promise<void> {
  if (!file.mediaInfo) {
    throw new Error(`File ${file.originalName} has no media info`);
  }

  const relativePath = generateDestinationPath(file.mediaInfo, file.extension);
  const destPath = path.join(options.outputDir, relativePath);

  try {
    await performOperation(file.originalPath, destPath, options.mode, options.overwrite);
    
    // Process subtitle sidecars
    await processSidecars(file, destPath, options);
    
  } catch (error) {
    console.error(`Failed to process file ${file.originalPath} to ${destPath}`, error);
    throw error;
  }
}
