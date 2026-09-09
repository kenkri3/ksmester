import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Sikkerhet: hindre directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(filepath)) {
      return new NextResponse('Bilde ikke funnet', { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filepath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return new NextResponse('Feil ved lesing av bilde', { status: 500 });
  }
}
