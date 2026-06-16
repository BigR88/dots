/** @type {import('next').NextConfig} */
const nextConfig = {
  // @dots/shared liegt als TypeScript-Quelle vor — Next transpiliert es mit.
  transpilePackages: ['@dots/shared'],
  experimental: {
    // Plakat-Uploads (Server Action) brauchen mehr als das 1-MB-Default-Limit.
    serverActions: { bodySizeLimit: '8mb' },
  },
};

export default nextConfig;
