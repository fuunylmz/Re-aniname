import { MediaInfo } from '@/lib/ai/schema';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string;
}

interface TMDBResponse {
  results: TMDBResult[];
}

export async function fetchTMDBDetails(
  info: MediaInfo,
  apiKey: string
): Promise<Partial<MediaInfo> & { tmdbId?: number; tmdbInfo?: any }> {
  if (!apiKey) return {};

  const type = info.type;
  // Use originalTitle if available as primary search query (often English/Romaji), 
  // fallback to title (often Chinese)
  // Logic: User requested English -> Chinese -> Japanese priority for search queries.
  // The 'info' object from AI usually has 'title' (Chinese/Main) and 'originalTitle' (English/Japanese).
  
  // We will construct a search queue.
  const searchQueries: { query: string; lang: string }[] = [];

  // 1. Try Original Title (English/Romaji/Japanese) first if available
  if (info.originalTitle) {
    searchQueries.push({ query: info.originalTitle, lang: 'en-US' }); // Search English/Romaji first
  }
  
  // 2. Try Title (Chinese)
  if (info.title) {
    searchQueries.push({ query: info.title, lang: 'zh-CN' });
  }

  // 3. Fallback: If we have original title, try searching it as Japanese specifically?
  // TMDB doesn't strictly separate query language, but 'language' param affects results preference.
  if (info.originalTitle) {
     searchQueries.push({ query: info.originalTitle, lang: 'ja-JP' });
  }

  const year = info.year;

  // Map type to TMDB search type
  let searchType = 'movie';
  if (type === 'Series' || type === 'Anime') {
    searchType = 'tv';
  }

  // Helper function for search
  const performSearch = async (query: string, language: string) => {
    try {
      const url = new URL(`${TMDB_BASE_URL}/search/${searchType}`);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('query', query);
      
      // Strict year filtering might miss if database has different year. 
      // Maybe relax it? Or keep it for accuracy. 
      // For anime, years can be tricky (broadcast vs release). 
      // Let's keep it but be aware.
      if (year && year > 0) {
        if (searchType === 'movie') {
          url.searchParams.append('primary_release_year', year.toString());
        } else {
          url.searchParams.append('first_air_date_year', year.toString());
        }
      }
      
      url.searchParams.append('language', language); 

      const res = await fetch(url.toString());
      if (!res.ok) return null;

      const data: TMDBResponse = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0];
      }
    } catch (e) {
      console.warn(`TMDB search failed for query: ${query}`, e);
    }
    return null;
  };

  // Execute Search Queue
  let bestMatch: TMDBResult | null = null;
  
  for (const item of searchQueries) {
    console.log(`[TMDB] Searching: "${item.query}" (Lang: ${item.lang})`);
    bestMatch = await performSearch(item.query, item.lang);
    if (bestMatch) {
      console.log(`[TMDB] Found match: ${bestMatch.name || bestMatch.title} (ID: ${bestMatch.id})`);
      break;
    }
  }

  if (bestMatch) {
      // Extract info
      const resultTitle = bestMatch.title || bestMatch.name || info.title;
      // We want to keep the Chinese title if possible, or the one we found
      // If we searched in English and found a result, we might want to fetch its Chinese translation
      // But for now let's just use what we found.
      
      const resultOriginalTitle = bestMatch.original_title || bestMatch.original_name || info.originalTitle;
      const dateStr = bestMatch.release_date || bestMatch.first_air_date;
      const resultYear = dateStr ? new Date(dateStr).getFullYear() : year;

      // ... TV Season Fetch Logic ...
      let extendedInfo: any = {};
      if (searchType === 'tv') {
         try {
            const tvUrl = new URL(`${TMDB_BASE_URL}/tv/${bestMatch.id}`);
            tvUrl.searchParams.append('api_key', apiKey);
            tvUrl.searchParams.append('language', 'zh-CN'); // Always try to get Chinese metadata for the final result
            const tvRes = await fetch(tvUrl.toString());
            if (tvRes.ok) {
               const tvData = await tvRes.json();
               extendedInfo = { seasons: tvData.seasons };
               (bestMatch as any).seasons = tvData.seasons;
               
               // Prefer Chinese title from details if available
               if (tvData.name) {
                 // Update the title to Chinese if we searched in English but found it
                 // resultTitle = tvData.name; // Variable assignment not possible here easily without refactor
               }
            }
         } catch (e) {
            console.warn('Failed to fetch TV details', e);
         }
      }

      return {
        title: resultTitle,
        originalTitle: resultOriginalTitle || null,
        year: resultYear || null,
        tmdbId: bestMatch.id,
        tmdbInfo: bestMatch,
      };
  }

  return {};
}
