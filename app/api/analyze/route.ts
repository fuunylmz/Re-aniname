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

      // Try to correct season number using TMDB data if available
      if ((mediaInfo.type === 'Series' || mediaInfo.type === 'Anime') && tmdbInfo.tmdbInfo?.seasons) {
         const seasons = tmdbInfo.tmdbInfo.seasons as any[];
         // If AI detected a season, verify if it exists in TMDB
         if (mediaInfo.season) {
            const seasonExists = seasons.some(s => s.season_number === mediaInfo.season);
            // If the season detected by AI doesn't exist in TMDB (e.g. AI says S2, but TMDB only has S1),
            // and it's not a special (S0), we might need to adjust.
            // BUT, sometimes "Season 2" in anime is a separate entry in TMDB with 1 season.
            // So if we found a TMDB entry, it's likely the correct one for that "Season".
            // If the TMDB entry only has 1 season (plus specials), and AI detected Season 2,
            // it's highly likely that this TMDB entry IS the Season 2 itself, so we should treat it as Season 1 of this specific TMDB ID.
            // UNLESS it's a long running show.
            
            // Logic: If TMDB entry has only 1 main season (season_number > 0), and AI detected Season > 1,
            // we force it to Season 1, assuming the user matched the specific season's TMDB entry.
            const regularSeasons = seasons.filter(s => s.season_number > 0);
            if (regularSeasons.length === 1 && mediaInfo.season > 1) {
               console.log(`[Analyze] Correcting Season ${mediaInfo.season} -> 1 based on TMDB data (Single season entry)`);
               mediaInfo.season = 1;
            }
         }
      }

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
