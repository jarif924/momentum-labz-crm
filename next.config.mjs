/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@mantine/core',
      '@mantine/hooks',
      '@supabase/ssr',
      '@supabase/supabase-js',
    ],
    ...(process.env.CRM_LOCAL_QA === 'true' ? { cpus: 1 } : {}),
  },
  headers: async () => [
    {
      source: '/:all*(svg|jpg|png|webp|ico|woff|woff2)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};
export default nextConfig;
