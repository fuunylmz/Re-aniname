import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { ScannedFile } from '../ai/schema';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.iso'
]);

export interface ScanOptions {
  recursive?: boolean;
  minSize?: number; // bytes, default 10MB to skip samples
}

export async function scanDirectory(
  dirPath: string, 
  options: ScanOptions = {}
): Promise<ScannedFile[]> {
  const { recursive = true, minSize = 10 * 1024 * 1024 } = options;
  const results: ScannedFile[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          const subResults = await scanDirectory(fullPath, options);
          results.push(...subResults);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (VIDEO_EXTENSIONS.has(ext)) {
          try {
            const stats = await fs.stat(fullPath);
            
            if (stats.size >= minSize) {
              results.push({
                id: randomUUID(),
                originalPath: fullPath,
                originalName: entry.name,
                extension: ext,
                size: stats.size,
                status: 'pending',
              });
            }
          } catch (err) {
            console.error(`Failed to stat file: ${fullPath}`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan directory: ${dirPath}`, error);
    throw error;
  }

  return results;
}
