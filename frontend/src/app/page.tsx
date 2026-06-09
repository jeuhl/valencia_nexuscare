'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@nexuscare.local');
  const [password, setPassword] = useState('123');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const apiUrl = getApiUrl();
    try {
      console.log('Attempting login at:', `${apiUrl}/api/auth/login`);
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message === 'Failed to fetch'
        ? `Cannot reach server at ${apiUrl}. Please ensure the backend is running and your firewall allows port 4000.`
        : err.message || 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen medical-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <button
        onClick={toggleNightMode}
        className="absolute top-4 right-4 p-2.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm transition-all z-50 hover:scale-105"
        title="Toggle Night Mode"
      >
        {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20"
        >
          <Activity className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          NexusCare Workflow
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Intelligent Patient Queue Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-4 shadow-2xl shadow-blue-900/5 sm:rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm border border-red-100 font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Link
        href="/patient"
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 bg-white/90 backdrop-blur-md border border-slate-200 text-blue-600 font-bold rounded-2xl shadow-xl shadow-blue-900/5 hover:bg-blue-50 transition-all hover:scale-105 z-50 no-invert"
      >
        <span>Patient Portal</span>
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
          <Activity className="w-3 h-3 text-blue-600" />
        </div>
      </Link>
    </div>
  );
}
