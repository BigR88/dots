/** @type {import('next').NextConfig} */
const nextConfig = {
  // @dots/shared liegt als TypeScript-Quelle vor — Next transpiliert es mit.
  transpilePackages: ['@dots/shared'],
};

export default nextConfig;
