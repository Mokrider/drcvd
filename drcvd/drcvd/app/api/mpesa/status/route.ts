import { NextRequest, NextResponse } from 'next/server';
import { queryStkStatus } from '@/lib/daraja';

export async function POST(req: NextRequest) {
  try {
    const { checkoutRequestId } = await req.json();
    if (!checkoutRequestId) return NextResponse.json({ error: 'Missing checkoutRequestId' }, { status: 400 });

    const result = await queryStkStatus(checkoutRequestId);

    // ResultCode 0 = success, 1032 = cancelled, 1037 = timeout
    return NextResponse.json({
      paid: result.ResultCode === '0',
      cancelled: result.ResultCode === '1032',
      pending: !['0', '1032', '1037'].includes(result.ResultCode),
      message: result.ResultDesc,
    });
  } catch (err: any) {
    console.error('Status check error:', err);
    // Treat errors as still pending (Daraja can be slow)
    return NextResponse.json({ paid: false, pending: true, message: 'Checking...' });
  }
}
