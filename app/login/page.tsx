'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tv, Mail, Lock, AlertCircle, Loader2, Sparkles, Users, Video } from 'lucide-react';
import { apiJson } from '@/lib/api';
import { getAccessToken, saveSession } from '@/lib/auth';

const FEATURES = [
  { icon: Video, label: 'Synced playback' },
  { icon: Users, label: 'Private chat' },
  { icon: Sparkles, label: 'Video calls' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiJson<{
        access: string;
        refresh: string;
        user: Record<string, unknown>;
      }>('/api/accounts/login/', {
        method: 'POST',
        public: true,
        body: JSON.stringify({ email, password }),
      });

      saveSession(data.access, data.refresh, data.user);
      router.push('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cinema-mesh flex-1 flex flex-col justify-center items-center px-4 py-8 safe-bottom safe-top relative overflow-hidden min-h-[100dvh]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-purple-500/25 blur-2xl" />
            <div className="relative p-4 cinema-glass rounded-2xl border border-purple-500/30 pulse-glow">
              <Tv className="w-11 h-11 text-purple-300" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-purple-300 via-violet-200 to-pink-300 bg-clip-text text-transparent">
              Private Cinema
            </span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Watch together in perfect sync — chat and call in your own theater.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/5 border border-white/8 text-gray-400"
              >
                <Icon className="w-3 h-3 text-purple-400" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="cinema-card cinema-glass p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cinema-input !pl-10"
                  placeholder="user1@chatweb.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cinema-input !pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cinema-btn cinema-btn-primary w-full min-h-[48px] py-3.5 text-base touch-manipulation"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Enter the theater'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-600 leading-relaxed px-4">
          Secure private room · Credentials are issued by your administrator
        </p>
      </div>
    </div>
  );
}
