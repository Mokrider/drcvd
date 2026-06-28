# DR. CV'd — Vercel Deployment Guide

## Step 1 — Upload to Vercel

1. Go to https://vercel.com and sign in (or create a free account)
2. Click **"Add New Project"**
3. Click **"Upload"** (or connect GitHub if you push the code there)
4. Drag and drop the entire `drcvd` folder — Vercel auto-detects Next.js

## Step 2 — Set Environment Variables

In Vercel → Your Project → Settings → Environment Variables, add these:

| Variable | Value |
|---|---|
| `DARAJA_CONSUMER_KEY` | rnJk5EJm9sWomHyU7gGiBedlovJl6IYqwgDIyXulzK4k9O5j |
| `DARAJA_CONSUMER_SECRET` | LakDUGHgC2Gbtswn9aNupGAtiy5Xq5UkY0qhPBpqv59Uj9S8zUIoZaTaZgyDf6J6 |
| `DARAJA_TILL_NUMBER` | 6095820 |
| `DARAJA_ENV` | production |
| `NEXT_PUBLIC_BASE_URL` | https://YOUR-APP-NAME.vercel.app ← replace with your actual Vercel URL |

## Step 3 — Deploy

Click **Deploy**. Vercel builds and deploys automatically (~2 minutes).

## Step 4 — Update BASE_URL

After first deploy, Vercel gives you a URL like `https://drcvd.vercel.app`.
Go back to Environment Variables, update `NEXT_PUBLIC_BASE_URL` to that URL, then **Redeploy**.

## Step 5 — Register Callback URL with Safaricom

Log into https://developer.safaricom.co.ke and register:
`https://YOUR-APP-NAME.vercel.app/api/mpesa/callback`
as your callback URL for your production app.

## That's it — your site is live!

---

## How the product works

1. User uploads PDF or DOCX
2. Server extracts text
3. Puter.js AI (client-side, free) analyzes the CV and returns scores + suggestions
4. User sees: overall score, section scores, ATS keywords missing, before/after rewrites
5. User clicks "Export" → enters Safaricom number → gets M-Pesa STK Push prompt
6. After KES 99 payment confirmed → improved CV downloads as .docx

## Support
- Puter.js docs: https://docs.puter.com
- Daraja API: https://developer.safaricom.co.ke/Documentation
