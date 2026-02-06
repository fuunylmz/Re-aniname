import path from 'path';
import type { MediaInfo } from '../ai/schema';

function sanitize(str: string): string {
  // Remove illegal characters for filenames
  return str.replace(/[<>:"/\\|?*]/g, '').trim();
}

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

export function generateDestinationPath(
  info: MediaInfo,
  extension: string
): string {
  const cleanTitle = sanitize(info.title);
  const cleanOriginalTitle = info.originalTitle ? sanitize(info.originalTitle) : '';
  const year = info.year || 0; // Fallback for unknown year
  const resolution = info.resolution ? ` - [${info.resolution}]` : '';
  
  // Construct the folder name: "Title (Year)"
  const folderName = year > 0 ? `${cleanTitle} (${year})` : cleanTitle;

  if (info.type === 'Movie') {
    // Movies/Title (Year)/Title (Year) - [Resolution].ext
    const fileName = year > 0 
      ? `${cleanTitle} (${year})${resolution}${extension}`
      : `${cleanTitle}${resolution}${extension}`;
    return path.join('Movies', folderName, fileName);
  } 
  
  if (info.type === 'Series' || info.type === 'Anime') {
    // TV Shows/Title (Year)/Season XX/Title - SXXEXX - [Resolution].ext
    // or Anime/Title (Year)/Season XX/...
    
    // Default to "TV Shows" for Series, "Anime" for Anime if we want to separate,
    // but standard Emby structure often puts Anime in TV Shows or separate lib.
    // Let's use the type as the root folder for flexibility.
    const root = info.type === 'Anime' ? 'Anime' : 'TV Shows';
    
    const season = info.season ?? 1;
    const episode = info.episode ?? 1;
    
    const seasonFolder = `Season ${pad(season)}`;
    // SXXEXX format as requested
    const sxxexx = `S${pad(season)}E${pad(episode)}`;
    
    // User requested "S0XEXX" format for video files
    // Usually it's "Title - SXXEXX - [Resolution].ext"
    // But user explicitly asked for "S0XEXX.mkv" only
    const fileName = `${sxxexx}${extension}`;
    
    return path.join(root, folderName, seasonFolder, fileName);
  }

  throw new Error(`Unknown media type: ${info.type}`);
}
