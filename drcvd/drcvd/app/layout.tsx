import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DR. CV\'d — AI Resume Doctor',
  description: 'Upload your CV and get instant AI-powered feedback, scoring, and improvements. Pay KES 99 to export your polished resume.',
  keywords: 'resume review, CV feedback, AI resume, job application, Kenya, M-Pesa',
  openGraph: {
    title: "DR. CV'd — AI Resume Doctor",
    description: 'Get your CV diagnosed and fixed by AI in seconds.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
