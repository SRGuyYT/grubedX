import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "streamed.pk",
      },
    ],
  },
  allowedDevOrigins: [
    'responsive-vidking.cluster-0.preview.emergentcf.cloud',
    'responsive-vidking.cluster-8.preview.emergentcf.cloud'
  ]
};

export default nextConfig;
