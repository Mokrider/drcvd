import { NextRequest, NextResponse } from 'next/server';
import { buildExportDocx } from '@/lib/exportCV';

export async function POST(req: NextRequest) {
  try {
    const { originalText, analysis } = await req.json();

    if (!originalText || !analysis) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const buffer = await buildExportDocx(originalText, analysis);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="DR_CVd_Improved_Resume.docx"',
        'Content-Length': uint8.length.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    console.error('Export error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
