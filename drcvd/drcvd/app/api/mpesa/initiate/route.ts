import { NextRequest, NextResponse } from 'next/server';
import { initiateStkPush } from '@/lib/daraja';

export async function POST(req: NextRequest) {
  try {
    const { phone, sessionId } = await req.json();

    if (!phone || !sessionId) {
      return NextResponse.json({ error: 'Phone and sessionId required' }, { status: 400 });
    }

    const phoneClean = phone.replace(/\s/g, '');
    const phoneRegex = /^(\+?254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phoneClean)) {
      return NextResponse.json({ error: 'Enter a valid Safaricom number (e.g. 0712345678)' }, { status: 400 });
    }

    const result = await initiateStkPush(phoneClean, 99, sessionId);

    if (result.ResponseCode !== '0') {
      return NextResponse.json({ error: 'Payment initiation failed. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ checkoutRequestId: result.CheckoutRequestID });
  } catch (err: any) {
    console.error('M-Pesa initiate error:', err);
    return NextResponse.json({ error: err.message || 'Payment failed' }, { status: 500 });
  }
}
