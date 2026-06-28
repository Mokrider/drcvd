'use client';
import { useState, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────
interface SectionFeedback {
  title: string;
  score: number;
  issues: string[];
  bullets: string[];
}
interface ImprovedBullet {
  original: string;
  improved: string;
}
interface CVAnalysis {
  name?: string;
  overall_score: number;
  summary_feedback: string;
  ats_keywords_missing: string[];
  ats_keywords_found: string[];
  sections: SectionFeedback[];
  improved_bullets: ImprovedBullet[];
  top_priorities: string[];
}

type Step = 'upload' | 'analyzing' | 'results' | 'payment' | 'done';

// ── Score Ring ─────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          className="score-ring"
        />
        <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="700" fill={color}>{score}</text>
        <text x="70" y="85" textAnchor="middle" fontSize="12" fill="#6b7280">/100</text>
      </svg>
      <p className="text-sm font-medium mt-1" style={{ color }}>
        {score >= 75 ? 'Strong CV' : score >= 50 ? 'Needs work' : 'Weak CV'}
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [cvText, setCvText] = useState('');
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState('Reading your CV...');
  const [phone, setPhone] = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── File handling ────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setError('');
    setFileName(file.name);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/parse-cv', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCvText(data.text);
      runAnalysis(data.text);
    } catch (e: any) {
      setError(e.message || 'Failed to read file');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  // ── Puter.js AI Analysis ─────────────────────────────────────
  const runAnalysis = async (text: string) => {
    setStep('analyzing');
    const messages = [
      'Reading your CV...', 'Checking ATS compatibility...', 
      'Scoring each section...', 'Finding improvements...', 'Almost done...'
    ];
    let i = 0;
    const ticker = setInterval(() => {
      i = (i + 1) % messages.length;
      setAnalysisProgress(messages[i]);
    }, 2200);

    try {
      // Puter.js is loaded client-side via CDN
      const puter = (window as any).puter;
      if (!puter) throw new Error('AI not loaded. Please refresh.');

      const prompt = `You are a senior professional CV coach and ATS expert. Analyze this CV and return ONLY valid JSON (no markdown, no backticks).

CV TEXT:
${text.slice(0, 6000)}

Return this exact JSON structure:
{
  "name": "candidate full name or empty string",
  "overall_score": <integer 0-100>,
  "summary_feedback": "<2-3 sentence overall assessment>",
  "ats_keywords_missing": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "ats_keywords_found": ["keyword1", "keyword2", "keyword3"],
  "top_priorities": ["Most urgent fix", "Second fix", "Third fix"],
  "sections": [
    {
      "title": "Section name (e.g. Experience, Skills, Summary)",
      "score": <integer 0-100>,
      "issues": ["Issue 1", "Issue 2"],
      "bullets": ["existing bullet 1", "existing bullet 2"]
    }
  ],
  "improved_bullets": [
    {
      "original": "weak bullet from CV",
      "improved": "stronger rewritten version with action verb and metric"
    }
  ]
}

Be honest and specific. Score genuinely — most CVs score 40-70. Provide at least 3 sections, 3 improved bullets, and 3 ATS keywords missing.`;

      const response = await puter.ai.chat(prompt);
      clearInterval(ticker);

      let raw = typeof response === 'string' ? response : response?.message?.content || response?.content || '';
      raw = raw.replace(/```json|```/g, '').trim();

      const parsed: CVAnalysis = JSON.parse(raw);
      setAnalysis(parsed);
      setStep('results');
    } catch (e: any) {
      clearInterval(ticker);
      setError('AI analysis failed: ' + (e.message || 'Unknown error'));
      setStep('upload');
    }
  };

  // ── M-Pesa Payment ───────────────────────────────────────────
  const initiatePayment = async () => {
    setError('');
    setPayStatus('Sending payment request...');
    const sessionId = Math.random().toString(36).slice(2, 10);

    try {
      const res = await fetch('/api/mpesa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCheckoutId(data.checkoutRequestId);
      setPayStatus('Check your phone — enter your M-Pesa PIN to pay KES 99');
      pollPayment(data.checkoutRequestId);
    } catch (e: any) {
      setPayStatus('');
      setError(e.message || 'Payment failed');
    }
  };

  const pollPayment = (cid: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 24) { // 2 min timeout
        clearInterval(pollRef.current!);
        setPayStatus('Payment timed out. Try again.');
        return;
      }
      try {
        const res = await fetch('/api/mpesa/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutRequestId: cid }),
        });
        const data = await res.json();
        if (data.paid) {
          clearInterval(pollRef.current!);
          setPaid(true);
          setPayStatus('Payment confirmed!');
          setStep('done');
        } else if (data.cancelled) {
          clearInterval(pollRef.current!);
          setPayStatus('Payment cancelled. Try again.');
        }
      } catch {}
    }, 5000);
  };

  // ── Export DOCX ───────────────────────────────────────────────
  const exportCV = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: cvText, analysis }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DR_CVd_Improved_Resume.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Puter.js CDN */}
      <script src="https://js.puter.com/v2/" async></script>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Nav */}
        <nav className="brand-gradient text-white px-6 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
              <span className="text-blue-700 font-bold text-sm">DR</span>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">DR. CV&apos;d</span>
              <span className="ml-2 text-blue-200 text-xs">AI Resume Doctor</span>
            </div>
          </div>
          <div className="text-sm text-blue-100 hidden sm:block">Free analysis · KES 99 to export</div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 py-10">
          {/* ── UPLOAD STEP ── */}
          {step === 'upload' && (
            <div className="fade-in">
              <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">Your CV, diagnosed.</h1>
                <p className="text-lg text-gray-500 max-w-lg mx-auto">
                  Upload your CV and get instant AI feedback — scores, ATS keywords, and rewrite suggestions. Free to analyze. KES 99 to export.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
              )}

              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-700 mb-1">Drop your CV here</p>
                <p className="text-sm text-gray-400">or click to browse · PDF or DOCX · Max 5MB</p>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {/* How it works */}
              <div className="mt-10 grid grid-cols-3 gap-4">
                {[
                  { icon: '📄', title: 'Upload', desc: 'PDF or DOCX, any format' },
                  { icon: '🤖', title: 'AI Analysis', desc: 'Score + fix suggestions in seconds' },
                  { icon: '📥', title: 'Export', desc: 'Download improved CV for KES 99' },
                ].map((s) => (
                  <div key={s.title} className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ANALYZING STEP ── */}
          {step === 'analyzing' && (
            <div className="fade-in flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 brand-gradient rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyzing your CV</h2>
              <p className="text-gray-500 mb-1">{analysisProgress}</p>
              <p className="text-xs text-gray-400">{fileName}</p>

              <div className="mt-8 flex gap-2">
                {['ATS check', 'Section scores', 'Keyword gaps', 'Rewrites'].map((label, i) => (
                  <span key={label} className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                    <span className="pulse-dot inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5" style={{ animationDelay: `${i * 0.3}s` }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── RESULTS STEP ── */}
          {step === 'results' && analysis && (
            <div className="fade-in">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {analysis.name ? `${analysis.name}'s CV Report` : 'Your CV Report'}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">{fileName}</p>
                </div>
                <button
                  onClick={() => setStep('payment')}
                  className="brand-gradient text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-opacity"
                >
                  Export Improved CV — KES 99 →
                </button>
              </div>

              {/* Score + summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                  <ScoreRing score={analysis.overall_score} />
                </div>
                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">Doctor&apos;s Assessment</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{analysis.summary_feedback}</p>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top 3 priorities</p>
                    {analysis.top_priorities.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-full brand-gradient text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-sm text-gray-700">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ATS Keywords */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">ATS Keyword Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Missing keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.ats_keywords_missing.map((kw) => (
                        <span key={kw} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs border border-red-100">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-2">Found keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.ats_keywords_found.map((kw) => (
                        <span key={kw} className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs border border-green-100">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section scores */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Section Scores</h3>
                <div className="flex gap-2 flex-wrap mb-4">
                  {analysis.sections.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSection(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        activeSection === i ? 'brand-gradient text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.title} · {s.score}
                    </button>
                  ))}
                </div>
                {analysis.sections[activeSection] && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${analysis.sections[activeSection].score}%`,
                            background: analysis.sections[activeSection].score >= 75 ? '#22c55e' : analysis.sections[activeSection].score >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{analysis.sections[activeSection].score}/100</span>
                    </div>
                    <div className="space-y-1.5">
                      {analysis.sections[activeSection].issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-red-400 mt-0.5">✕</span>
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Improved bullets preview */}
              {analysis.improved_bullets?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">AI Rewrites</h3>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Full version in export</span>
                  </div>
                  {analysis.improved_bullets.slice(0, 2).map((b, i) => (
                    <div key={i} className="mb-4 last:mb-0">
                      <div className="flex items-start gap-2 mb-1.5 p-3 bg-red-50 rounded-lg">
                        <span className="text-red-400 text-xs font-bold mt-0.5 flex-shrink-0">BEFORE</span>
                        <span className="text-sm text-red-700">{b.original}</span>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                        <span className="text-green-600 text-xs font-bold mt-0.5 flex-shrink-0">AFTER</span>
                        <span className="text-sm text-green-700">{b.improved}</span>
                      </div>
                    </div>
                  ))}
                  {analysis.improved_bullets.length > 2 && (
                    <p className="text-center text-sm text-gray-400 mt-3">
                      + {analysis.improved_bullets.length - 2} more rewrites in the exported CV
                    </p>
                  )}
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={() => setStep('payment')}
                  className="brand-gradient text-white px-10 py-4 rounded-xl font-bold text-base shadow-lg hover:opacity-90 transition-opacity"
                >
                  Export Improved CV — KES 99 via M-Pesa →
                </button>
                <p className="text-xs text-gray-400 mt-2">Instant download after payment</p>
              </div>
            </div>
          )}

          {/* ── PAYMENT STEP ── */}
          {step === 'payment' && (
            <div className="fade-in max-w-md mx-auto">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Pay via M-Pesa</h2>
                  <p className="text-gray-500 text-sm mt-1">KES 99 · Instant download after payment</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
                )}

                {!checkoutId ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Safaricom number</label>
                      <input
                        type="tel"
                        placeholder="0712 345 678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">You&apos;ll receive an M-Pesa prompt on this number</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm">
                      <div className="flex justify-between text-gray-600 mb-1">
                        <span>CV Export (DR. CV&apos;d)</span>
                        <span>KES 99</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>KES 99</span>
                      </div>
                    </div>

                    <button
                      onClick={initiatePayment}
                      disabled={!phone}
                      className="w-full brand-gradient text-white py-3.5 rounded-xl font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      Pay KES 99 via M-Pesa
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
                    <p className="text-gray-700 font-medium">{payStatus}</p>
                    <p className="text-xs text-gray-400 mt-2">Checking payment status automatically...</p>
                  </div>
                )}

                <button
                  onClick={() => { setStep('results'); setCheckoutId(''); setPayStatus(''); setError(''); }}
                  className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600"
                >
                  ← Back to results
                </button>
              </div>
            </div>
          )}

          {/* ── DONE STEP ── */}
          {step === 'done' && (
            <div className="fade-in max-w-md mx-auto text-center">
              <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed!</h2>
                <p className="text-gray-500 text-sm mb-6">Your improved CV is ready to download. Good luck with the applications!</p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
                )}

                <button
                  onClick={exportCV}
                  disabled={exporting}
                  className="w-full brand-gradient text-white py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 mb-3"
                >
                  {exporting ? 'Generating...' : '⬇ Download Improved CV (.docx)'}
                </button>

                <button
                  onClick={() => {
                    setStep('upload'); setAnalysis(null); setCvText('');
                    setFileName(''); setPhone(''); setCheckoutId('');
                    setPaid(false); setPayStatus(''); setError('');
                  }}
                  className="w-full text-gray-400 text-sm hover:text-gray-600 py-2"
                >
                  Analyze another CV
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-10">
          <p>DR. CV&apos;d — AI Resume Doctor · Powered by Puter.js · KES 99 via M-Pesa</p>
          <p className="mt-1">Your CV is analyzed privately and never stored.</p>
        </footer>
      </div>
    </>
  );
}
