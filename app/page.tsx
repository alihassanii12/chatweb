'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { getAccessToken, getStoredUser } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    const userData = getStoredUser();

    if (!token || !userData) {
      router.push('/login');
    } else {
      router.push('/room/00000000-0000-0000-0000-000000000000');
    }
  }, [router]);

  return (
    <LoadingScreen title="Cinema" subtitle="Opening room…" />
  );
}
