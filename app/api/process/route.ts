import { NextResponse } from 'next/server';
import { processFile, type OutputMode } from '@/lib/renamer';
import { z } from 'zod';

const RequestSchema = z.object({
  file: z.any(), // Should be ScannedFile schema but simplified for API
  config: z.object({
    outputDir: z.string(),
    outputMode: z.enum(['move', 'link', 'copy', 'symlink']),
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { file, config } = RequestSchema.parse(body);

    await processFile(file, {
      outputDir: config.outputDir,
      mode: config.outputMode as OutputMode,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Process API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
