/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily disable type checking during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily disable ESLint during build
    ignoreDuringBuilds: true,
  },
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'http://localhost:3001/graphql',
  },
  async rewrites() {
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    
    console.log('[Next.js] Environment Check:');
    console.log(`- NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL}`);
    console.log(`- BACKEND_URL: ${process.env.BACKEND_URL}`);

    if (!backendUrl) {
      console.warn('[Next.js] ⚠️ BACKEND_URL not set, using hardcoded production URL');
      backendUrl = 'https://taketen-dash-backend-production.up.railway.app';
    }

    // Ensure protocol
    if (!backendUrl.startsWith('http')) {
      console.log('[Next.js] ⚠️ URL missing protocol, adding https://');
      backendUrl = `https://${backendUrl}`;
    }
    
    // Remove trailing slash
    backendUrl = backendUrl.replace(/\/$/, '');

    console.log(`[Next.js] 🚀 Rewriting /api/* to ${backendUrl}/api/*`);
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;