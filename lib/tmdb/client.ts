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
