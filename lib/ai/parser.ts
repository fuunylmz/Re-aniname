import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { MediaInfoSchema, type MediaInfo } from './schema';

export interface AIConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export async function parseFilename(
  filename: string, 
  config: AIConfig = {}
): Promise<MediaInfo> {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  const baseURL = config.baseUrl || process.env.OPENAI_BASE_URL;
  const modelName = config.model || process.env.AI_MODEL || 'gpt-3.5-turbo';

  if (!apiKey) {
    throw new Error('Missing OpenAI API Key. Please set it in the configuration.');
  }

  const openai = createOpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });

  const systemPrompt = `
    You are an intelligent media file parser designed to organize libraries for Emby/Plex.
    Your task is to analyze the given filename and extract structured metadata.

    Rules:
    1. **Identify Type**: Determine if it's a Movie, Series (Western/Korean/etc. TV shows), or Anime.
    2. **Title**: Extract the main title. If a Chinese title exists, prioritize it. If only English/Japanese, use that.
    3. **Original Title**: If there's a secondary title (e.g., English title for a Chinese movie, or Japanese for Anime), extract it.
    4. **Year**: Extract the release year.
    5. **Season/Episode**:
       - For Series/Anime: Extract 'Sxx' and 'Exx'.
       - **SPECIALS HANDLING**: If the file contains "SP", "OVA", "NCOP", "NCED", or similar special content indicators:
         - Set "season" to 0 (Emby/Plex standard for Specials).
         - Try to extract a number for "episode", otherwise default to 1 or incrementing.
       - If only episode number exists (e.g., "One Piece - 1000"), try to infer.
       - If it's a movie, ignore season/episode.
    6. **Resolution/Source/Group**: Extract technical details if present.

    IMPORTANT: You MUST return a valid JSON object. Do not include markdown code blocks (like \`\`\`json). Just the raw JSON.
    
    Expected JSON Structure:
    {
      "type": "Movie" | "Series" | "Anime",
      "title": "string",
      "originalTitle": "string | null",
      "year": number | null,
      "season": number | null,
      "episode": number | null,
      "resolution": "string | null",
      "source": "string | null",
      "group": "string | null"
    }
    
    Note: If a field cannot be found or inferred, return null instead of omitting it.

    Input Filename: "${filename}"
  `;

  try {
    // Downgrade to generateText to avoid /v1/responses endpoint issues with 3rd party providers
    // Use .chat() explicitly to force /chat/completions endpoint instead of /responses
    const { text } = await generateText({
      model: openai.chat(modelName),
      prompt: systemPrompt,
      temperature: 0.1,
    });

    // Clean up response if it contains markdown blocks
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    
    const rawObject = JSON.parse(cleanJson);
    
    // Validate with Zod
    const object = MediaInfoSchema.parse(rawObject);

    return object;
  } catch (error) {
    console.error('AI Parsing failed:', error);
    throw new Error(`Failed to parse filename: ${filename}`);
  }
}
