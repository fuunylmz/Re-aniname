import { describe, it, expect, vi } from 'vitest';
import { parseFilename } from '@/lib/ai/parser';
import { generateObject } from 'ai';

// Mock the 'ai' module
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

// Mock process.env
vi.stubGlobal('process', {
  env: {
    OPENAI_API_KEY: 'mock-key',
  },
});

describe('AI Parser', () => {
  it('should parse a standard movie filename', async () => {
    const mockData = {
      type: 'Movie',
      title: '盗梦空间',
      originalTitle: 'Inception',
      year: 2010,
      resolution: '1080p',
      source: 'BluRay',
      group: 'Wiki',
    };

    (generateObject as any).mockResolvedValue({ object: mockData });

    const result = await parseFilename('Inception.2010.1080p.BluRay.x264-Wiki.mkv');
    
    expect(result.type).toBe('Movie');
    expect(result.title).toBe('盗梦空间');
    expect(result.year).toBe(2010);
    // Verify that generateObject was called
    expect(generateObject).toHaveBeenCalled();
  });

  it('should parse an anime episode with season', async () => {
    const mockData = {
      type: 'Anime',
      title: '鬼灭之刃',
      year: 2019,
      season: 1,
      episode: 1,
      group: 'Bahamut',
    };

    (generateObject as any).mockResolvedValue({ object: mockData });

    const result = await parseFilename('[Bahamut] Kimetsu no Yaiba - 01 [1080p].mp4');

    expect(result.type).toBe('Anime');
    expect(result.episode).toBe(1);
    expect(result.season).toBe(1);
  });

  it('should handle errors gracefully', async () => {
    (generateObject as any).mockRejectedValue(new Error('API Error'));

    await expect(parseFilename('bad-file.mkv')).rejects.toThrow('Failed to parse filename');
  });
});
