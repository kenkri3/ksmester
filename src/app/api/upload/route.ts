import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Mappe for opplastinger – kan pekes til Railway Volume via UPLOADS_PATH env var
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

export async function POST(req: NextRequest) {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    let buffer: Buffer | null = null;
    let originalName = 'upload';
    let originalSize = 0;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Ingen fil lastet opp' }, { status: 400 });
      }
      originalName = file.name;
      originalSize = file.size;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // JSON med base64
      const body = await req.json();
      if (!body.image) {
        return NextResponse.json({ error: 'Mangler bildedata (image)' }, { status: 400 });
      }
      const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      originalSize = buffer.length;
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: 'Tom fil mottatt' }, { status: 400 });
    }

    // Automatisk WebP-komprimering og smart resizing for byggedokumentasjon
    // 1. auto-rotate basert på mobilens EXIF (iPhone/Android stående/liggende)
    // 2. Maks 1920x1920 (krystallklar for TEK17 zoom, men fjerner unødige 48MP rådata)
    // 3. WebP kvalitet 80% (gir 85-95% reduksjon i filstørrelse)
    const compressedBuffer = await sharp(buffer)
      .rotate()
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 80,
        effort: 4
      })
      .toBuffer();

    const cleanId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const filename = `${cleanId}.webp`;
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.promises.writeFile(filepath, compressedBuffer);

    const compressionRatio = Math.round((1 - compressedBuffer.length / (originalSize || compressedBuffer.length)) * 100);

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${filename}`,
      filename,
      originalSize,
      compressedSize: compressedBuffer.length,
      savedPercent: Math.max(0, compressionRatio),
      format: 'image/webp'
    });
  } catch (error: any) {
    console.error('Feil ved opplasting og bildekomprimering:', error);
    return NextResponse.json({ error: error.message || 'Feil ved behandling av bilde' }, { status: 500 });
  }
}
