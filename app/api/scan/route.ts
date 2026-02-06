import { NextResponse } from 'next/server';
import { scanDirectory } from '@/lib/scanner';
import { z } from 'zod';

const RequestSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().default(true),
  minSize: z.number().default(10), // MB
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path: dirPath, recursive, minSize } = RequestSchema.parse(body);

    const files = await scanDirectory(dirPath, {
      recursive,
      minSize: minSize * 1024 * 1024,
    });

    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.error('Scan API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
