import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDestinationPath } from '@/lib/renamer/namer';
import { processFile } from '@/lib/renamer';
import fs from 'fs/promises';
import path from 'path';
import type { MediaInfo, ScannedFile } from '@/lib/ai/schema';

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    link: vi.fn(),
    symlink: vi.fn(),
    copyFile: vi.fn(),
    readdir: vi.fn(), // Added readdir to default export
  },
  // Also export named functions if needed, though lib uses default import
  readdir: vi.fn(),
}));

describe('Namer', () => {
  it('should generate correct path for Movie', () => {
    const info: MediaInfo = {
      type: 'Movie',
      title: 'Inception',
      year: 2010,
      resolution: '1080p'
    };
    const result = generateDestinationPath(info, '.mkv');
    
    // Normalize path separators for testing
    const normalized = result.split(path.sep).join('/');
    expect(normalized).toBe('Movies/Inception (2010)/Inception (2010) - [1080p].mkv');
  });

  it('should generate correct path for Series', () => {
    const info: MediaInfo = {
      type: 'Series',
      title: 'Breaking Bad',
      year: 2008,
      season: 1,
      episode: 1,
      resolution: '4k'
    };
    const result = generateDestinationPath(info, '.mp4');
    const normalized = result.split(path.sep).join('/');
    // Updated expectation to match user request: SXXEXX only
    expect(normalized).toBe('TV Shows/Breaking Bad (2008)/Season 01/S01E01.mp4');
  });
});

describe('Renamer Execution', () => {
  const mockFile: ScannedFile = {
    id: '1',
    originalPath: '/src/video.mkv',
    originalName: 'video.mkv',
    extension: '.mkv',
    size: 1000,
    status: 'pending',
    mediaInfo: {
      type: 'Movie',
      title: 'Test',
      year: 2023,
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.stat as any).mockRejectedValue({ code: 'ENOENT' }); // Default: dest doesn't exist
    (fs.readdir as any).mockResolvedValue([]); // Default: no sidecars
  });

  it('should create directory and move file', async () => {
    await processFile(mockFile, { outputDir: '/dest', mode: 'move' });
    
    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.rename).toHaveBeenCalledWith(
      '/src/video.mkv',
      expect.stringContaining(path.join('Test (2023)', 'Test (2023).mkv'))
    );
  });

  it('should handle sidecar files', async () => {
    // Mock sidecar file in source directory
    (fs.readdir as any).mockResolvedValue([
      { name: 'video.mkv', isFile: () => true },
      { name: 'video.zh.ass', isFile: () => true }, // Sidecar
      { name: 'other.txt', isFile: () => true },
    ]);

    await processFile(mockFile, { outputDir: '/dest', mode: 'move' });

    // Verify main video move
    expect(fs.rename).toHaveBeenCalledWith(
      '/src/video.mkv',
      expect.stringContaining(path.join('Test (2023)', 'Test (2023).mkv'))
    );

    // Verify sidecar move
    // The sidecar should be renamed to match the video destination base name
    // Dest: /dest/Movies/Test (2023)/Test (2023).zh.ass
    expect(fs.rename).toHaveBeenCalledWith(
      path.normalize('/src/video.zh.ass'),
      expect.stringContaining(path.join('Test (2023)', 'Test (2023).zh.ass'))
    );
  });

  it('should handle hard link failure (EXDEV)', async () => {
    (fs.link as any).mockRejectedValue({ code: 'EXDEV' });

    await expect(processFile(mockFile, { outputDir: '/dest', mode: 'link' }))
      .rejects.toThrow('Hard link failed (Cross-device or Permission error)');
  });

  it('should succeed with hard link on same drive', async () => {
    // Reset mock implementation to succeed by default for this test
    (fs.link as any).mockResolvedValue(undefined);

    await processFile(mockFile, { outputDir: '/dest', mode: 'link' });
    
    // Paths are resolved to absolute in implementation
    expect(fs.link).toHaveBeenCalledWith(
      path.resolve('/src/video.mkv'),
      expect.stringContaining(path.join('Test (2023)', 'Test (2023).mkv'))
    );
  });
});
