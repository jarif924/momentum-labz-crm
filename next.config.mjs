/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  ...(process.env.CRM_LOCAL_QA === 'true' ? { experimental: { cpus: 1 } } : {}),
};
export default nextConfig;
