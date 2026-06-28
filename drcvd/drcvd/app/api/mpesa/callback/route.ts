import { NextRequest, NextResponse } from 'next/server';

// Safaricom calls this endpoint after payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('M-Pesa callback:', JSON.stringify(body, null, 2));
    // In production, store payment confirmation in a database here
    // For now, we rely on the STK query polling approach
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
