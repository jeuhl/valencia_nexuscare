'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Activity, Search, QrCode, Clock, Shield, Moon, Sun } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function PatientPortalLanding() {
  const [queueRef, setQueueRef] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('night-mode');
    if (stored === 'true') {
      setIsNightMode(true);
      document.documentElement.classList.add('night-mode');
    }
  }, []);

  const toggleNightMode = () => {
    const newVal = !isNightMode;
    setIsNightMode(newVal);
    localStorage.setItem('night-mode', String(newVal));
    if (newVal) {
      document.documentElement.classList.add('night-mode');
    } else {
      document.documentElement.classList.remove('night-mode');
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueRef.trim()) return;
    setError('');
    setLoading(true);
    try {
      const ref = queueRef.trim().toUpperCase();
      const res = await fetch(`${getApiUrl()}/api/patient/${ref}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Queue reference not found');
      }
      router.push(`/patient/${ref}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen medical-bg flex flex-col relative">
      <button
        onClick={toggleNightMode}
        className="absolute top-4 right-4 p-2.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm transition-all z-50 hover:scale-105"
        title="Toggle Night Mode"
      >
        {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-slate-900 font-bold text-lg">NexusCare</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-500 hover:text-blue-600 text-sm font-bold tracking-tight transition-colors">
            Staff Login
          </Link>
          <span className="text-blue-600 text-sm font-bold tracking-tight border-l border-slate-200 pl-4 hidden sm:block">Patient Portal</span>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/10 overflow-hidden border border-slate-100">
            <div className="px-8 pt-8 pb-6">
              <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 mx-auto">
                <QrCode className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 text-center">Track Your Queue</h1>
              <p className="text-slate-500 text-sm text-center mt-2 mb-6">
                Enter your Queue Reference number to see your position and estimated wait time.
              </p>

              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">
                    Queue Reference Number
                  </label>
                  <input
                    type="text"
                    value={queueRef}
                    onChange={e => setQueueRef(e.target.value)}
                    placeholder="e.g. Q-0001"
                    maxLength={10}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-center text-2xl font-black tracking-widest text-blue-600 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-center font-medium"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading || !queueRef.trim()}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 active:scale-95"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-6 h-6" />
                  )}
                  {loading ? 'Looking up...' : 'Check My Queue'}
                </button>
              </form>
            </div>

            {/* Footer strip */}
            <div className="bg-slate-50 border-t border-slate-100 px-8 py-4">
              <p className="text-xs text-slate-400 text-center font-medium">
                Your Queue Reference is printed on your registration slip.
              </p>
            </div>
          </div>

          {/* Feature Pills */}
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            {[
              { icon: Clock, text: 'Live Wait Time' },
              { icon: Shield, text: 'Privacy Protected' },
              { icon: Activity, text: 'Real-time Sync' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 bg-white shadow-sm border border-slate-100 text-slate-600 text-xs font-bold px-4 py-2 rounded-full">
                <Icon className="w-4 h-4 text-blue-500" />
                {text}
              </div>
            ))}
          </div>

          {/* Demo hint */}
          <p className="text-slate-400 text-xs text-center mt-8">
            Demo references: <span className="text-blue-500 font-bold">Q-0001</span> · <span className="text-blue-500 font-bold">Q-0002</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
