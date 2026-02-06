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
  const title = info.title;
  const year = info.year;

  // Map type to TMDB search type
  let searchType = 'movie';
  if (type === 'Series' || type === 'Anime') {
    searchType = 'tv';
  }

  try {
    const url = new URL(`${TMDB_BASE_URL}/search/${searchType}`);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('query', title);
    if (year && year > 0) {
      // For movies, use primary_release_year
      // For TV, use first_air_date_year
      if (searchType === 'movie') {
        url.searchParams.append('primary_release_year', year.toString());
      } else {
        url.searchParams.append('first_air_date_year', year.toString());
      }
    }
    url.searchParams.append('language', 'zh-CN'); // Prefer Chinese

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn(`TMDB API Error: ${res.status} ${res.statusText}`);
      return {};
    }

    const data: TMDBResponse = await res.json();
    
    if (data.results && data.results.length > 0) {
      const bestMatch = data.results[0];
      
      // Extract info
      const resultTitle = bestMatch.title || bestMatch.name || title;
      const resultOriginalTitle = bestMatch.original_title || bestMatch.original_name || info.originalTitle;
      const dateStr = bestMatch.release_date || bestMatch.first_air_date;
      const resultYear = dateStr ? new Date(dateStr).getFullYear() : year;

      // If it's a TV show, try to fetch season details to see if we can map seasons
      // But TMDB search result doesn't give season details directly.
      // We would need a second call to /tv/{id} to get season info if we really want to validate seasons.
      // For now, we just return the basic info.
      // Actually, let's do a quick fetch for TV details to get season info if possible
      let extendedInfo: any = {};
      if (searchType === 'tv') {
         try {
            const tvUrl = new URL(`${TMDB_BASE_URL}/tv/${bestMatch.id}`);
            tvUrl.searchParams.append('api_key', apiKey);
            tvUrl.searchParams.append('language', 'zh-CN');
            const tvRes = await fetch(tvUrl.toString());
            if (tvRes.ok) {
               const tvData = await tvRes.json();
               extendedInfo = { seasons: tvData.seasons };
               // Merge season info into bestMatch for reference
               (bestMatch as any).seasons = tvData.seasons;
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
        tmdbInfo: bestMatch, // Store full raw response
      };
    }
  } catch (error) {
    console.error('TMDB Fetch Error:', error);
  }

  return {};
}
