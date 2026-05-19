'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
    } else {
      // Instantly navigate to the shared global cinema hall
      router.push('/room/00000000-0000-0000-0000-000000000000');
    }
  }, [router]);

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#0a0a0c] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
      <div className="z-10 flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <span className="text-xs font-semibold tracking-widest text-purple-300/80 uppercase animate-pulse">
          Opening Shared Cinema Hall...
        </span>
      </div>
    </div>
  );
}
