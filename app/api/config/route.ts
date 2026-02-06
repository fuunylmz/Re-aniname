import { NextResponse } from 'next/server';
import { getServerConfig, saveServerConfig } from '@/lib/config-manager';

export async function GET() {
  const config = await getServerConfig();
  return NextResponse.json(config || {});
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await saveServerConfig(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
