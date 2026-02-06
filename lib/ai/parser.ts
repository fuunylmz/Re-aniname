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
  config: AIConfig = {},
  context?: { siblingFiles?: string[], parentFolder?: string }
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

  let contextPrompt = '';
  if (context?.parentFolder) {
    contextPrompt += `
    **Context - Parent Directory**:
    The file is located in a directory named: "${context.parentFolder}". 
    Use this folder name to infer the Season (e.g. "Season 2", "S2") or the Series Name if the filename is ambiguous.
    `;
  }

  if (context?.siblingFiles && context.siblingFiles.length > 0) {
    contextPrompt += `
    **Context - Sibling Files**:
    The following files are in the same directory. Use them to infer the overall structure, season numbering, and episode count.
    ${context.siblingFiles.slice(0, 50).map(f => `- ${f}`).join('\n')}
    `;
  }

  const systemPrompt = `
    你是一个智能媒体文件解析器，专门用于整理 Emby/Plex 的媒体库。
    你的任务是分析给定的文件名（以及提供的目录结构），并提取结构化的元数据。

    ${contextPrompt}

    规则：
    1. **识别类型**：确定是电影（Movie）、剧集（Series，如美剧/韩剧等）还是动漫（Anime）。
    2. **标题**：提取主要标题。如果有中文标题，优先使用中文。如果只有英文/日文，则使用该语言。
    3. **原名**：如果有副标题（例如中文电影的英文标题，或动漫的日文标题），请提取出来。
    4. **年份**：提取发行年份。
    5. **季/集**：
       - 对于剧集/动漫：提取 'Sxx' 和 'Exx'。
       - **季度处理**：
         - 查找 "S2", "Season 2", "2nd Season", "II", "!!" (如 K-On!!), 等标识。
         - **检查目录名称**：如果文件名本身没有指示季度（例如只有 "Episode 01.mkv"），但输入上下文中包含 "Season 2/Episode 01" 或 "Anime Name S2/..." 这样的目录信息，请务必利用它来确定季度！
         - 利用你的 **内部知识**：如果标题暗示了季度（例如 "Clannad After Story" 是第二季，"K-On!!" 是第二季），请据此推断。
         - 如果没有找到季度指示符，且你的知识表明这是第一季，则默认为第 1 季。
       - **特别篇处理**：如果文件包含 "SP", "OVA", "NCOP", "NCED", "Menu", "Tokuten", "Benefits", "CM", "PV", "Trailer" 或类似的特别内容指示符：
         - 将 "season" 设置为 0 (Emby/Plex 的特别篇标准)。
         - 如果明确存在数字（如 "OVA 2"），尝试提取该数字作为 "episode"。
         - 如果没有找到数字，或为了避免冲突，请使用以下范围：
           - SP/OVA -> 1, 2...
           - NCOP/OP -> 101, 102...
           - NCED/ED -> 151, 152...
           - Menu -> 201, 202...
           - Tokuten/Benefits/Featurette -> 301, 302...
           - CM/Commercial -> 401, 402...
           - PV/Trailer/Teaser -> 501, 502...
           - 其他/未知特别篇 -> 901...
           - 尽可能确保集数唯一。
       - 如果只存在集数（例如 "One Piece - 1000"），尝试推断。
       - 如果是电影，忽略季/集信息。
    6. **分辨率/来源/制作组**：如果存在，提取技术细节。

    **常见特殊情况处理（参考自 Bangumi_Auto_Rename）：**
    0. **TMDB的第0季通常是特典或OVA集**：遇到 SP/OVA 请映射到 Season 0。
    1. **目录结构**：本地目录可能将多季合并为一个目录，或者相反。请利用完整的路径上下文。
    2. **总集数**：本地目录剧集的标号可能会是总集号（例如 Episode 26 可能实际上是 Season 2 Episode 1）。如果你知道 Season 1 的总集数，尝试正确映射。
    3. **半集号**：本地目录可能会给总集篇标注 4.5 这样的半集号，而 TMDB 会将其放在第 0 季。请将其识别为 Season 0 的 Special。
    4. **OVA/特典在季末**：OVA/特典可能被放在正片季度末尾（例如 12 集番剧的第 13 集）。如果看起来像特别篇，放入 Season 0。
    5. **同名季度**：本地目录的不同季度可能仅用名称区分（如 "Kai", "Shippuden"），没有明确季号。请根据名称推断正确的逻辑季号。
    6. **剧场版混入 TV**：剧场版有时被混在 TV 版文件夹中。如果它看起来是电影，识别为 type="Movie"（或者是 Special，如果是总集篇/番外）。

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
