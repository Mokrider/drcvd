const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET!;
const TILL_NUMBER = process.env.DARAJA_TILL_NUMBER!;
const BASE_URL = 'https://api.safaricom.co.ke';

export async function getDarajaToken(): Promise<string> {
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to get Daraja token');
  const data = await res.json();
  return data.access_token;
}

export async function initiateStkPush(phone: string, amount: number, sessionId: string): Promise<{ CheckoutRequestID: string; ResponseCode: string }> {
  const token = await getDarajaToken();
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/callback`;

  // Format phone: 0712345678 → 254712345678
  const formatted = phone.startsWith('+') ? phone.slice(1) : phone.startsWith('0') ? '254' + phone.slice(1) : phone;

  const body = {
    BusinessShortCode: TILL_NUMBER,
    Password: Buffer.from(`${TILL_NUMBER}${TILL_NUMBER}${new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)}`).toString('base64'),
    Timestamp: new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14),
    TransactionType: 'CustomerBuyGoodsOnline',
    Amount: amount,
    PartyA: formatted,
    PartyB: TILL_NUMBER,
    PhoneNumber: formatted,
    CallBackURL: callbackUrl,
    AccountReference: `DRCVD-${sessionId}`,
    TransactionDesc: 'DR.CVd Export',
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`STK Push failed: ${err}`);
  }

  return res.json();
}

export async function queryStkStatus(checkoutRequestId: string): Promise<{ ResultCode: string; ResultDesc: string }> {
  const token = await getDarajaToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

  const body = {
    BusinessShortCode: TILL_NUMBER,
    Password: Buffer.from(`${TILL_NUMBER}${TILL_NUMBER}${timestamp}`).toString('base64'),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Status query failed');
  return res.json();
}
