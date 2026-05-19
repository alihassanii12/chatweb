import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: 'https://chatweb-backend-mbmu.onrender.com',
    NEXT_PUBLIC_WS_URL: 'wss://chatweb-backend-mbmu.onrender.com',
  },
};

export default nextConfig;
