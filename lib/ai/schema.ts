import { z } from 'zod';

export const MediaTypeSchema = z.enum(['Movie', 'Series', 'Anime']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const MediaInfoSchema = z.object({
  type: MediaTypeSchema.describe('媒体类型：Movie(电影), Series(剧集), Anime(番剧)'),
  title: z.string().describe('主要标题 (通常是中文名，如果没有则使用原名)'),
  originalTitle: z.string().nullable().optional().describe('原名 (英文名/日文名/罗马音)'),
  year: z.number().int().nullable().describe('上映年份 (YYYY)'), // Some files might not have year, allow null but try to extract
  season: z.number().int().nullable().optional().describe('季号 (数字)，例如 1 代表第一季。如果是电影则不需要。'),
  episode: z.number().int().nullable().optional().describe('集号 (数字)，例如 1 代表第一集。如果是电影则不需要。'),
  resolution: z.string().nullable().optional().describe('分辨率 (e.g. 1080p, 4k, 720p)'),
  source: z.string().nullable().optional().describe('来源 (e.g. Web-DL, BluRay, HDTV)'),
  group: z.string().nullable().optional().describe('制作组/压制组名称'),
  tmdbInfo: z.any().optional().describe('TMDB API 返回的完整原始数据'),
});

export type MediaInfo = z.infer<typeof MediaInfoSchema>;

// 用于前端显示和处理的文件对象
export interface ScannedFile {
  id: string; // UUID
  originalPath: string;
  originalName: string;
  extension: string;
  size: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  mediaInfo?: MediaInfo;
  outputPath?: string; // 预计或实际的输出路径
  error?: string;
}
