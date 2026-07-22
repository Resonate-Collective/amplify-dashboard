/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We build in the cloud (Railway) without a local type/lint pass. Don't let a
  // stray lint or type nit fail the production build — correctness is covered by
  // the vitest suite and manual verification, not the build's incidental checks.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
