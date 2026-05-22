'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { apiJson } from '@/lib/api';
import { getAccessToken, saveSession } from '@/lib/auth';

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
    <div className="flex-1 flex flex-col justify-center items-center px-4 bg-[#0a0a0c] min-h-[100dvh] safe-bottom safe-top">
      <div className="w-full max-w-xs">
        <h1 className="text-lg font-semibold text-white text-center mb-1">Private Cinema</h1>
        <p className="text-[11px] text-gray-600 text-center mb-6">Sign in to continue</p>

        <div className="border border-white/5 rounded-lg p-4 bg-[#111116]">
          {error && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-md flex gap-2 text-[11px] text-red-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-600 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cinema-input !py-2 !pl-8 text-sm"
                  placeholder="email"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-600 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cinema-input !py-2 !pl-8 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cinema-btn cinema-btn-primary w-full !py-2 text-xs mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  …
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
