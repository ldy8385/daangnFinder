import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.kr.gcp-karroter.net",
      },
      {
        protocol: "https",
        hostname: "dnvefa72aowie.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
