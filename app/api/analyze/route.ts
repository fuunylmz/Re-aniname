import { NextResponse } from 'next/server';
import { parseFilename } from '@/lib/ai/parser';
import { fetchTMDBDetails } from '@/lib/tmdb/client';
import { z } from 'zod';

const RequestSchema = z.object({
  filename: z.string().min(1),
  config: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    model: z.string().optional(),
    tmdbApiKey: z.string().optional(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, config } = RequestSchema.parse(body);

    // 1. AI Parsing
    let mediaInfo = await parseFilename(filename, config);

    // 2. TMDB Enrichment (if key provided)
    if (config?.tmdbApiKey) {
      console.log(`[Analyze] Fetching TMDB for: ${mediaInfo.title} (${mediaInfo.year})`);
      const tmdbInfo = await fetchTMDBDetails(mediaInfo, config.tmdbApiKey);
      console.log(`[Analyze] TMDB Result:`, tmdbInfo.tmdbId ? `Found ID: ${tmdbInfo.tmdbId}` : 'Not Found');
      
      // Merge TMDB info into mediaInfo
      // We prioritize TMDB title/year over AI extracted ones if found
      mediaInfo = {
        ...mediaInfo,
        ...tmdbInfo,
      };

      // Ensure season is not null for TV/Anime if we found TMDB info or just default to 1
      if ((mediaInfo.type === 'Series' || mediaInfo.type === 'Anime') && mediaInfo.season === null) {
         mediaInfo.season = 1;
      }
    } else {
      console.log('[Analyze] TMDB API Key not provided, skipping enrichment.');
    }

    return NextResponse.json({ success: true, mediaInfo });
  } catch (error: any) {
    console.error('Analyze API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
