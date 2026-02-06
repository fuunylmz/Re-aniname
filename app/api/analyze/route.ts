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

// Simple in-memory cache for TMDB results to ensure consistency across a batch
// Key: Normalized title + year
// Value: TMDB result
const TMDB_CACHE = new Map<string, any>();
const TMDB_ID_CACHE = new Map<number, any>(); // Secondary cache: ID -> Metadata

// Helper to normalize cache key
function getCacheKey(title: string, year: number | null | undefined) {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normalizedTitle}-${year || 'any'}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, config } = RequestSchema.parse(body);

    // 1. AI Parsing
    let mediaInfo = await parseFilename(filename, config);

    // 2. TMDB Enrichment (if key provided)
    if (config?.tmdbApiKey) {
      console.log(`[Analyze] Fetching TMDB for: ${mediaInfo.title} (${mediaInfo.year})`);
      
      const cacheKey = getCacheKey(mediaInfo.title, mediaInfo.year);
      let tmdbInfo = null;

      // 1. Check title-based cache first
      if (mediaInfo.title.length > 2 && TMDB_CACHE.has(cacheKey)) {
         console.log(`[Analyze] TMDB Cache HIT for: ${cacheKey}`);
         tmdbInfo = TMDB_CACHE.get(cacheKey);
      } else {
         // 2. Perform fresh search
         tmdbInfo = await fetchTMDBDetails(mediaInfo, config.tmdbApiKey);
         
         // 3. Cache valid results
         if (tmdbInfo.tmdbId) {
            // Check if we already have a canonical metadata for this TMDB ID
            if (TMDB_ID_CACHE.has(tmdbInfo.tmdbId)) {
               console.log(`[Analyze] TMDB ID HIT (${tmdbInfo.tmdbId}). Unifying metadata.`);
               // Use the canonical metadata (Title/Year) from the ID cache to ensure folder consistency
               // even if the search result returned slightly different aliases.
               const cachedMetadata = TMDB_ID_CACHE.get(tmdbInfo.tmdbId);
               tmdbInfo = { ...tmdbInfo, title: cachedMetadata.title, year: cachedMetadata.year, originalTitle: cachedMetadata.originalTitle };
            } else {
               // Store this result as the canonical metadata for this ID
               TMDB_ID_CACHE.set(tmdbInfo.tmdbId, tmdbInfo);
            }

            // Update title-based cache
            if (mediaInfo.title.length > 2) {
               TMDB_CACHE.set(cacheKey, tmdbInfo);
               // Also cache by Original Title if available to link them
               if (mediaInfo.originalTitle) {
                  const originalKey = getCacheKey(mediaInfo.originalTitle, mediaInfo.year);
                  TMDB_CACHE.set(originalKey, tmdbInfo);
               }
            }
         }
      }

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
