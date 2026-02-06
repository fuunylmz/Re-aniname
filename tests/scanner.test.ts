import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanDirectory } from '@/lib/scanner';
import fs from 'fs/promises';

vi.mock('fs/promises', () => {
  return {
    default: {
      readdir: vi.fn(),
      stat: vi.fn(),
    },
    readdir: vi.fn(),
    stat: vi.fn(),
  };
});
// Removed crypto mock to use real implementation


describe('Scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scan video files recursively', async () => {
    // Mock readdir for root
    (fs.readdir as any).mockImplementation(async (path: string) => {
      if (path === '/test/media') {
        return [
          { name: 'movie.mkv', isDirectory: () => false, isFile: () => true },
          { name: 'subdir', isDirectory: () => true, isFile: () => false },
          { name: 'readme.txt', isDirectory: () => false, isFile: () => true },
        ];
      }
      if (path.includes('subdir')) {
        return [
          { name: 'episode.mp4', isDirectory: () => false, isFile: () => true },
        ];
      }
      return [];
    });

    // Mock stat
    (fs.stat as any).mockResolvedValue({ size: 20 * 1024 * 1024 }); // 20MB

    const results = await scanDirectory('/test/media');

    expect(results).toHaveLength(2);
    expect(results.map(f => f.originalName)).toContain('movie.mkv');
    expect(results.map(f => f.originalName)).toContain('episode.mp4');
    expect(results.map(f => f.originalName)).not.toContain('readme.txt');
  });

  it('should filter small files', async () => {
    (fs.readdir as any).mockResolvedValue([
      { name: 'sample.mkv', isDirectory: () => false, isFile: () => true },
    ]);

    (fs.stat as any).mockResolvedValue({ size: 1 * 1024 * 1024 }); // 1MB

    const results = await scanDirectory('/test/media', { minSize: 10 * 1024 * 1024 });

    expect(results).toHaveLength(0);
  });
});
