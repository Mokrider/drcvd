import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/parseCV';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });

    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported.' }, { status: 400 });
    }

    const text = await extractTextFromFile(file);

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract text. Try a different file format.' }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err: any) {
    console.error('Parse error:', err);
    return NextResponse.json({ error: err.message || 'Failed to parse file' }, { status: 500 });
  }
}
