import { NextResponse } from 'next/server';
import { getServerConfig } from '@/lib/config-manager';
import { scanDirectory } from '@/lib/scanner';
import { parseFilename } from '@/lib/ai/parser';
import { fetchTMDBDetails } from '@/lib/tmdb/client';
import { processFile } from '@/lib/renamer';
import path from 'path';
import fs from 'fs/promises';
import type { ScannedFile } from '@/lib/ai/schema';

// This endpoint receives a POST request with { path: "..." }
// It will scan, analyze, and process files in that path using server-side config.
export async function POST(req: Request) {
  try {
    const { path: inputPath } = await req.json();

    if (!inputPath) {
      return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
    }

    console.log(`[Webhook] Received trigger for: ${inputPath}`);

    // 1. Load Config
    const config = await getServerConfig();
    if (!config || !config.apiKey) {
      console.error('[Webhook] No valid server config found');
      return NextResponse.json({ success: false, error: 'Server config not found or missing API Key' }, { status: 500 });
    }

    // 2. Scan (Treat inputPath as potential file or directory)
    // We need to check if it's a file or directory
    let filesToProcess: ScannedFile[] = [];
    try {
      const stat = await fs.stat(inputPath);
      if (stat.isDirectory()) {
         filesToProcess = await scanDirectory(inputPath, {
           recursive: true,
           minSize: (config.minSize || 10) * 1024 * 1024,
         });
      } else {
         // Single file
         // Construct a "ScannedFile" object manually since scanDirectory is for dirs
         const ext = path.extname(inputPath);
         filesToProcess = [{
           id: crypto.randomUUID(),
           originalPath: inputPath,
           originalName: path.basename(inputPath),
           extension: ext,
           size: stat.size,
           status: 'pending',
         }];
      }
    } catch (e) {
      console.error('[Webhook] File access error:', e);
      return NextResponse.json({ success: false, error: 'File access error' }, { status: 404 });
    }

    console.log(`[Webhook] Found ${filesToProcess.length} files to process`);

    // 3. Process each file (Analyze -> Enrich -> Rename)
    // Run in background? Next.js serverless might kill it if response returns.
    // Ideally we should use a job queue, but for now we'll await or rely on runtime keeping it alive.
    // We will await to ensure it completes before returning success to qBit (though qBit doesn't care about response)

    const results = [];

    for (const file of filesToProcess) {
      try {
        console.log(`[Webhook] Analyzing: ${file.originalName}`);
        
        // A. Analyze
        let mediaInfo = await parseFilename(file.originalName, config);
        
        // B. Enrich (TMDB)
        if (config.tmdbApiKey) {
           const tmdbInfo = await fetchTMDBDetails(mediaInfo, config.tmdbApiKey);
           mediaInfo = { ...mediaInfo, ...tmdbInfo };
           
           // Season fix logic
           if ((mediaInfo.type === 'Series' || mediaInfo.type === 'Anime') && mediaInfo.season === null) {
              mediaInfo.season = 1;
           }
        }

        // C. Process (Rename/Move)
        console.log(`[Webhook] Processing: ${file.originalName} -> ${config.outputMode}`);
        await processFile(
          { ...file, mediaInfo }, // Attach mediaInfo
          {
            outputDir: config.outputDir!, // Assume outputDir is set if config exists
            mode: config.outputMode || 'link',
          }
        );

        results.push({ file: file.originalName, status: 'success' });
      } catch (err: any) {
        console.error(`[Webhook] Failed to process ${file.originalName}:`, err);
        results.push({ file: file.originalName, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
